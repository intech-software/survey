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

let refreshPromise: Promise<string> | null = null;

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

/**
 * Single-flight refresh shared by REST retries and socket reconnects.
 * Only a definite auth failure (401/403) ends the session.
 */
export const refreshAccessToken = (): Promise<string> => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const { refreshToken } = getTokenCache();
      if (!refreshToken) throw new Error("Missing refresh token");
      const response = await refreshClient.post(API_ROUTES.auth.refreshToken, {
        refreshToken,
      });
      const accessToken = (response.data as { accessToken?: string })
        ?.accessToken;
      if (typeof accessToken !== "string" || !accessToken) {
        throw new Error("Invalid refresh response");
      }
      await fetch(API_ROUTES.internal.auth, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, refreshToken }),
      });
      setTokenCache(accessToken, refreshToken);
      return accessToken;
    } catch (error) {
      const { refreshToken } = getTokenCache();
      if (!refreshToken || isInvalidSessionError(error)) {
        await redirectToLogin();
      }
      throw error;
    }
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
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

    const token = await refreshAccessToken();
    originalRequest.headers = originalRequest.headers ?? {};
    originalRequest.headers.Authorization = `Bearer ${token}`;
    return axiosClient(originalRequest);
  },
);

export default axiosClient;
