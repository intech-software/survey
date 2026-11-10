import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

// Current user fetcher (used with SWR).
const fetcherMe = async (): Promise<CurrentUser> => {
  const response = await axiosClient.get<CurrentUser>(API_ROUTES.users.me);
  return response.data;
};

const uploadAvatar = async (file: File): Promise<CurrentUser> => {
  const formData = new FormData();
  formData.append("avatar", file);
  const response = await axiosClient.post<CurrentUser>(
    API_ROUTES.users.uploadAvatar,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

const changePassword = async ({
  currentPassword,
  newPassword,
}: {
  currentPassword: string;
  newPassword: string;
}) => {
  const response = await axiosClient.post<{ message: string }>(
    API_ROUTES.users.changePassword,
    { currentPassword, newPassword },
  );
  return response.data;
};

const userService = { fetcherMe, uploadAvatar, changePassword };

export default userService;
