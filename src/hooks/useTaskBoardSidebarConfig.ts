import { useCallback, useMemo } from "react";

import type { SidebarConfig } from "@/components/layout/AppLayout";
import type { Database } from "@/lib/rxdb";
import type { Board, Swimlane } from "@/lib/types";
import { useBoardStore } from "@/stores/board-store";

type UseTaskBoardSidebarConfigArgs = {
  activeBoards: Board[];
  activeSwimlanes: Swimlane[];
  boards: Board[];
  swimlanes: Swimlane[];
  countsBySwimlane: Record<string, number>;
  boardVisibleCount: number;
  isAllSelected: boolean;
  hasSelections: boolean;
  isArchivedSelectionMode: boolean;
  putSwimlane: (swimlane: Partial<Swimlane>) => Promise<unknown> | unknown;
  deleteSwimlane: (swimlaneId: string) => Promise<unknown> | unknown;
  db: Database | null;
};

export function useTaskBoardSidebarConfig({
  activeBoards,
  activeSwimlanes,
  boards,
  swimlanes,
  countsBySwimlane,
  boardVisibleCount,
  isAllSelected,
  hasSelections,
  isArchivedSelectionMode,
  putSwimlane,
  deleteSwimlane,
  db,
}: UseTaskBoardSidebarConfigArgs): SidebarConfig {
  const handleAddSwimlane = useCallback(
    async (boardId: string, data: Partial<Swimlane>) => {
      await putSwimlane({ ...data, boardId });
    },
    [putSwimlane],
  );

  const handleEditSwimlane = useCallback(
    async (swimlane: Swimlane) => {
      await putSwimlane(swimlane);
    },
    [putSwimlane],
  );

  const handleDeleteSwimlane = useCallback(
    async (swimlaneId: string) => {
      await deleteSwimlane(swimlaneId);
    },
    [deleteSwimlane],
  );

  const handleBoardDeleted = useCallback(async () => {
    useBoardStore.getState().loadBoards();
  }, []);

  return useMemo(
    () => ({
      boards: activeBoards,
      swimlanes: activeSwimlanes,
      allBoards: boards,
      allSwimlanes: swimlanes,
      swimlaneCounts: countsBySwimlane,
      allItemVisible: true,
      allItemActive: isAllSelected || !hasSelections,
      allItemLabel: "Tasks",
      allItemCount: boardVisibleCount,
      isArchivedSelectionMode,
      onAddSwimlane: handleAddSwimlane,
      onEditSwimlane: handleEditSwimlane,
      onDeleteSwimlane: handleDeleteSwimlane,
      onBoardDeleted: handleBoardDeleted,
      db,
    }),
    [
      activeBoards,
      activeSwimlanes,
      boards,
      swimlanes,
      countsBySwimlane,
      isAllSelected,
      hasSelections,
      boardVisibleCount,
      isArchivedSelectionMode,
      handleAddSwimlane,
      handleEditSwimlane,
      handleDeleteSwimlane,
      handleBoardDeleted,
      db,
    ],
  );
}
