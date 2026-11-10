const AUTH = {
  login: "/auth/login",
  refreshToken: "/auth/refresh-token",
  logout: "/auth/logout",
};

const USERS = {
  me: "/users/me",
  uploadAvatar: "/users/me/avatar",
  changePassword: "/users/me/change-password",
};

const INTERNAL = {
  auth: "/api/auth",
};

export const API_ROUTES = {
  auth: AUTH,
  users: USERS,
  internal: INTERNAL,
};
