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

export type ManagedUserPayload = {
  username?: string;
  name?: string;
  email?: string | null;
  status?: "active" | "inactive";
  password?: string;
};

const fetchUsers = async (): Promise<CurrentUser[]> =>
  (await axiosClient.get<CurrentUser[]>(API_ROUTES.users.base)).data;

const createUser = async (payload: ManagedUserPayload): Promise<CurrentUser> =>
  (await axiosClient.post<CurrentUser>(API_ROUTES.users.base, payload)).data;

const updateUser = async (
  userId: number,
  payload: ManagedUserPayload,
): Promise<CurrentUser> =>
  (await axiosClient.patch<CurrentUser>(API_ROUTES.users.detail(userId), payload))
    .data;

const deleteUser = async (userId: number): Promise<CurrentUser> =>
  (await axiosClient.delete<CurrentUser>(API_ROUTES.users.detail(userId))).data;

const userService = {
  fetcherMe,
  uploadAvatar,
  changePassword,
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
};

export default userService;
