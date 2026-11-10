// Avatars are stored by the backend as "/uploads/avatars/<file>.webp".
// Turn that into an absolute URL on the API host.
export const resolveAvatarUrl = (avatar?: string | null) => {
  if (!avatar) {
    return undefined;
  }
  if (/^(?:https?:|blob:|data:)/i.test(avatar)) {
    return avatar;
  }
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  return `${baseUrl.replace(/\/$/, "")}/${avatar.replace(/^\//, "")}`;
};

export const getInitials = (name?: string | null) =>
  (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
