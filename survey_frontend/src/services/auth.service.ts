import axios from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

export const login = async (username: string, password: string) => {
  const response = await axios.post<LoginResponse>(API_ROUTES.auth.login, {
    username,
    password,
  });
  return response.data;
};

// Clears the auth cookies held by the Next.js server (see app/api/auth).
export const logout = async () => {
  await fetch(API_ROUTES.internal.auth, { method: "DELETE" });
};
