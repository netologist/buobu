import { create } from "zustand";
import { persist } from "zustand/middleware";

export type KanbanFilterState = {
  searchText: string;
  date: string;
  deadline: string;
  priorities: string[];
  labels: string[];
};

const DEFAULT_FILTERS: KanbanFilterState = {
  searchText: "",
  date: "all",
  deadline: "all",
  priorities: ["all"],
  labels: [],
};

type FilterStore = {
  filters: KanbanFilterState;
  setFilters: (filters: KanbanFilterState) => void;
  resetFilters: () => void;
};

export const useFilterStore = create<FilterStore>()(
  persist(
    (set) => ({
      filters: DEFAULT_FILTERS,
      setFilters: (filters) => set({ filters }),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),
    }),
    {
      name: "goals-kanban-filters-v2",
    }
  )
);

export { DEFAULT_FILTERS };
