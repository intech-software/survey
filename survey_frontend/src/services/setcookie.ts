import axios from "axios";
import { API_ROUTES } from "@/lib/api-routes";

export const setCookie = async (payload: {
  accessToken: string;
  refreshToken: string;
}) => {
  const response = await axios.post(API_ROUTES.internal.auth, payload);
  return response.data;
};
