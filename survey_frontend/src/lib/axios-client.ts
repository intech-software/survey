import axios, { AxiosError } from "axios";
import {
  clearTokenCache,
  getTokenCache,
  setTokenCache,
} from "@/store/token.store";
import { API_ROUTES } from "./api-routes";

const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
  timeout: 120000,
});

const refreshClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
  timeout: 120000,
});

const authEndpointPaths = [API_ROUTES.auth.login, API_ROUTES.auth.refreshToken];

let isRefreshing = false;
let refreshSubscribers: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const notifyRefreshSuccess = (token: string) => {
  refreshSubscribers.forEach((subscriber) => subscriber.resolve(token));
  refreshSubscribers = [];
};

const notifyRefreshFailure = (error: unknown) => {
  refreshSubscribers.forEach((subscriber) => subscriber.reject(error));
  refreshSubscribers = [];
};

const redirectToLogin = async () => {
  clearTokenCache();
  if (typeof window === "undefined") {
    return;
  }
  try {
    await fetch(API_ROUTES.internal.auth, { method: "DELETE" });
  } finally {
    if (window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
  }
};

const isInvalidSessionError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }
  return error.response?.status === 401 || error.response?.status === 403;
};

axiosClient.interceptors.request.use((config) => {
  const { accessToken } = getTokenCache();
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const url = originalRequest.url ?? "";
    const isAuthEndpoint = authEndpointPaths.some((path) => url.includes(path));

    // A timeout, network error, or CORS error says nothing about whether the
    // current session is valid. Preserve tokens and let the caller show a
    // retry/error state instead of forcing a logout.
    if (!error.response && !isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (status !== 401 || originalRequest._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshSubscribers.push({
          resolve: (token) => {
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(axiosClient(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    try {
      const { refreshToken } = getTokenCache();
      if (!refreshToken) {
        throw error;
      }

      const refreshResponse = await refreshClient.post(API_ROUTES.auth.refreshToken, {
        refreshToken,
      });
      const newAccessToken = (refreshResponse.data as { accessToken?: string })
        ?.accessToken;

      if (!newAccessToken) {
        throw error;
      }

      setTokenCache(newAccessToken, refreshToken);
      await fetch(API_ROUTES.internal.auth, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: newAccessToken, refreshToken }),
      });

      notifyRefreshSuccess(newAccessToken);
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return axiosClient(originalRequest);
    } catch (refreshError) {
      notifyRefreshFailure(refreshError);
      // Only a definite authentication failure invalidates the local session.
      // Temporary backend/network failures must not log the user out.
      if (isInvalidSessionError(refreshError)) {
        await redirectToLogin();
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosClient;
