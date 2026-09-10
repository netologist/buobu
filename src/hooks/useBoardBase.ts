import { useCallback, useMemo } from "react";

import { useFilterStore } from "@/stores/filter-store";
import { useBoards } from "@/stores/hooks/use-boards";
import { useBoardSwimlaneUrlSync } from "@/hooks/useBoardSwimlaneUrlSync";

type UseBoardBaseConfig<T> = {
  items?: T[];
  searchQuery?: string;
  filterFn?: (item: T, query: string) => boolean;
  sortFn?: (a: T, b: T) => number;
};

type BoardScopedItem = {
  boardId: string;
  swimlaneId: string;
};

function isBoardScopedItem(value: unknown): value is BoardScopedItem {
  if (!value || typeof value !== "object") return false;

  const candidate = value as { boardId?: unknown; swimlaneId?: unknown };
  return typeof candidate.boardId === "string" && typeof candidate.swimlaneId === "string";
}

export function useBoardBase<T>({
  items = [],
  searchQuery: searchQueryOverride,
  filterFn,
  sortFn,
}: UseBoardBaseConfig<T> = {}) {
  const boardState = useBoards();
  const filters = useFilterStore((state) => state.filters);
  const setFilters = useFilterStore((state) => state.setFilters);

  // Sync board/swimlane selection to/from URL (?board=&swimlanes=).
  useBoardSwimlaneUrlSync();

  const searchQuery = searchQueryOverride ?? filters.searchText ?? "";

  const setSearchQuery = useCallback(
    (query: string) => {
      if (searchQueryOverride !== undefined) return;
      setFilters({ ...filters, searchText: query });
    },
    [filters, searchQueryOverride, setFilters],
  );

  const selectionFilteredItems = useMemo(() => {
    if (items.length === 0 || !isBoardScopedItem(items[0])) {
      return [...items];
    }

    const boardScopedItems = items as BoardScopedItem[];

    if (boardState.isAllSelected || !boardState.hasSelections) {
      return [...items];
    }

    if (boardState.selectedSwimlaneIds.size > 0) {
      return boardScopedItems.filter((item) => boardState.selectedSwimlaneIds.has(item.swimlaneId)) as T[];
    }

    if (boardState.selectedBoardIds.size > 0) {
      return boardScopedItems.filter((item) => boardState.selectedBoardIds.has(item.boardId)) as T[];
    }

    if (boardState.primaryBoardId) {
      return boardScopedItems.filter((item) => item.boardId === boardState.primaryBoardId) as T[];
    }

    return [...items];
  }, [
    items,
    boardState.hasSelections,
    boardState.isAllSelected,
    boardState.primaryBoardId,
    boardState.selectedBoardIds,
    boardState.selectedSwimlaneIds,
  ]);

  const archivedSwimlaneIdSet = useMemo(
    () => new Set(boardState.swimlanes.filter((swimlane) => swimlane.archived).map((swimlane) => swimlane.id)),
    [boardState.swimlanes],
  );

  const filteredItems = useMemo(() => {
    let nextItems = [...selectionFilteredItems];
    if (searchQuery.trim() && filterFn) {
      const normalizedQuery = searchQuery.toLowerCase();
      nextItems = nextItems.filter((item) => filterFn(item, normalizedQuery));
    }
    if (sortFn) {
      nextItems.sort(sortFn);
    }
    return nextItems;
  }, [filterFn, searchQuery, selectionFilteredItems, sortFn]);

  return {
    ...boardState,
    filteredItems,
    searchQuery,
    setSearchQuery,
    archivedSwimlaneIdSet,
  };
}
