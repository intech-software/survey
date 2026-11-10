"use client";
import { useRouter } from "next/navigation";
import { logout } from "@/services/auth.service";
import { useTokens } from "@/store/token.store";
import useUserStore from "@/store/user.store";
import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

type UseLogoutOptions = {
  redirectTo?: string;
};

export const useLogout = (options: UseLogoutOptions = {}) => {
  const { clearTokens, refreshToken } = useTokens();
  const clearUser = useUserStore((state) => state.clearUser);
  const { redirectTo = "/login" } = options;
  const router = useRouter();

  const handleLogout = async () => {
    if (refreshToken) {
      try {
        await axiosClient.post(API_ROUTES.auth.logout, { refreshToken });
      } catch (error) {
        console.error("Error revoking refresh token:", error);
      }
    }
    await logout();
    clearTokens();
    clearUser();
    router.replace(redirectTo);
  };

  return { logout: handleLogout };
};
