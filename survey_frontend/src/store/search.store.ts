import { create } from "zustand";

interface SearchState {
  searchByPath: Record<string, string>;
  setSearch: (path: string, value: string) => void;
}

const useSearchStore = create<SearchState>((set) => ({
  searchByPath: {},
  setSearch: (path, value) =>
    set((state) => ({
      searchByPath: {
        ...state.searchByPath,
        [path]: value,
      },
    })),
}));

export default useSearchStore;
