import { create } from "zustand";

interface UserStoreState {
  user: CurrentUser | null;
  setUser: (user: CurrentUser) => void;
  clearUser: () => void;
}

const USER_CACHE_KEY = "survey-user-store";

const getInitialUser = (): CurrentUser | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = sessionStorage.getItem(USER_CACHE_KEY);
    return stored ? (JSON.parse(stored) as CurrentUser) : null;
  } catch {
    return null;
  }
};

const useUserStore = create<UserStoreState>((set) => ({
  user: getInitialUser(),
  setUser: (user) => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
      } catch {
        // ignore storage errors
      }
    }

    set({ user });
  },
  clearUser: () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(USER_CACHE_KEY);
      } catch {
        // ignore storage errors
      }
    }

    set({ user: null });
  },
}));

export default useUserStore;
