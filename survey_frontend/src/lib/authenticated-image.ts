import axiosClient from "@/lib/axios-client";
import { getOriginalImageUrl } from "@/lib/image-url";

export { getOriginalImageUrl } from "@/lib/image-url";

export const resolveAuthenticatedAssetUrl = (src: string) => {
  if (/^(?:https?:|blob:|data:)/i.test(src)) {
    return src;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  return `${baseUrl.replace(/\/$/, "")}/${src.replace(/^\//, "")}`;
};

export const fetchAuthenticatedImage = async (
  src: string,
  options?: { original?: boolean; signal?: AbortSignal },
) => {
  const requestUrl = resolveAuthenticatedAssetUrl(
    options?.original ? getOriginalImageUrl(src) : src,
  );
  const response = await axiosClient.get<Blob>(requestUrl, {
    responseType: "blob",
    signal: options?.signal,
  });

  return response.data;
};
