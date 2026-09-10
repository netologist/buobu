'use client';

import { useEffect, useMemo } from 'react';
import { useBoardStore } from '../board-store';
import { useDbStore } from '../db-store';
import { useSwimlaneSelectionStore, useSwimlaneSelectionDerived, filterSwimlanes } from '../swimlane-selection-store';
import { useArchiveFilterStore } from '../archive-filter-store';
import type { Board, Swimlane, NamingLabels } from '@/lib/types';
import { DEFAULT_NAMING } from '@/lib/naming';
import type { RxCollection } from 'rxdb';

/**
 * Subscribes to RxDB boards and swimlanes collections reactively.
 *
 * This is the equivalent of useNotesSubscription/useTasksSubscription for the
 * board-store (which uses Zustand instead of Jotai). Without this, boards and
 * swimlanes loaded from Supabase sync are written into RxDB but the Zustand
 * store is never notified, so the UI stays stale until a hard refresh.
 *
 * Mount this once in a top-level layout component (e.g. AppLayout) that is
 * always rendered while the user is authenticated.
 */
export function useBoardsSubscription() {
  const db = useDbStore((s) => s.db);
  const setBoards = useBoardStore((s) => s.setBoards);
  const setSwimlanes = useBoardStore((s) => s.setSwimlanes);

  useEffect(() => {
    if (!db) return;

    const boardsCol = (db as unknown as Record<string, RxCollection>)['boards'];
    const swimlanesCol = (db as unknown as Record<string, RxCollection>)['swimlanes'];

    if (!boardsCol || !swimlanesCol) return;

    const boardsSub = boardsCol
      .find({ selector: { _deleted: false } })
      .$.subscribe((docs: { toMutableJSON(): Board }[]) => {
        const sorted = docs.map((d) => d.toMutableJSON() as Board).sort((a, b) => {
          const ao = a.order ?? 9999;
          const bo = b.order ?? 9999;
          if (ao !== bo) return ao - bo;
          return (a.name ?? '').localeCompare(b.name ?? '');
        });
        setBoards(sorted);
      });

    const swimlanesSub = swimlanesCol
      .find({ selector: { _deleted: false } })
      .$.subscribe((docs: { toMutableJSON(): Swimlane }[]) => {
        const sorted = docs.map((d) => d.toMutableJSON() as Swimlane).sort((a, b) => {
          const boardCmp = (a.boardId ?? '').localeCompare(b.boardId ?? '');
          if (boardCmp !== 0) return boardCmp;
          const ao = a.order ?? 9999;
          const bo = b.order ?? 9999;
          if (ao !== bo) return ao - bo;
          return (a.name ?? '').localeCompare(b.name ?? '');
        });
        setSwimlanes(sorted);
      });

    return () => {
      boardsSub.unsubscribe();
      swimlanesSub.unsubscribe();
    };
  }, [db, setBoards, setSwimlanes]);
}

/**
 * Convenience hook for accessing boards, swimlanes, and selection state.
 * Replaces the duplicate board/swimlane loading pattern in every component.
 */
export function useBoards() {
  const boards = useBoardStore((s) => s.boards);
  const swimlanes = useBoardStore((s) => s.swimlanes);
  const isLoading = useBoardStore((s) => s.isLoading);
  const putBoard = useBoardStore((s) => s.putBoard);
  const deleteBoard = useBoardStore((s) => s.deleteBoard);
  const putSwimlane = useBoardStore((s) => s.putSwimlane);
  const deleteSwimlane = useBoardStore((s) => s.deleteSwimlane);
  const loadBoards = useBoardStore((s) => s.loadBoards);
  const reloadSwimlanes = useBoardStore((s) => s.reloadSwimlanes);

  const {
    selections,
    isAllSelected,
    selectedSwimlaneIds,
    selectedBoardIds,
    primaryBoardId,
    hasSelections,
    isSwimlaneSelected,
    isBoardSelected,
  } = useSwimlaneSelectionDerived();

  const { selectAll, selectBoard, toggleSwimlane, clearSelection } =
    useSwimlaneSelectionStore();

  // Active (non-archived) boards and swimlanes for normal views
  const activeBoards = useMemo(
    () => boards.filter((b) => !b.archived),
    [boards]
  );

  const activeSwimlanes = useMemo(
    () => swimlanes.filter((s) => !s.archived),
    [swimlanes]
  );

  // Resolve primary board (from all boards, so archived selections still work)
  const board: Board | null = useMemo(() => {
    if (!primaryBoardId) return activeBoards[0] ?? null;
    return boards.find((b) => b.id === primaryBoardId) ?? activeBoards[0] ?? null;
  }, [boards, activeBoards, primaryBoardId]);

  // Get naming labels from current board
  const labels: NamingLabels = useMemo(
    () => board?.naming ?? DEFAULT_NAMING,
    [board?.naming]
  );

  const showArchivedItems = useArchiveFilterStore((s) => s.showArchivedItems);
  const setShowArchivedItems = useArchiveFilterStore((s) => s.setShowArchivedItems);
  const setLockedBySelection = useArchiveFilterStore((s) => s.setLockedBySelection);

  // Filter swimlanes by selection.
  // When an active board is selected with the "All" wildcard (boardId:*), archived swimlanes
  // are excluded by default to avoid triggering isArchivedSelectionMode unintentionally.
  // Exception: if showArchivedItems is ON, include them so board components can filter them.
  const filteredSwimlanes = useMemo(() => {
    const swList = swimlanes.filter((s): s is typeof s & { boardId: string } => !!s.boardId);
    const result = filterSwimlanes(swList, selections);

    if (!board?.archived) {
      const hasExplicitSwimlaneIds = selections.some((s) => {
        const colonIdx = s.indexOf(':');
        return colonIdx !== -1 && s.slice(colonIdx + 1) !== '*';
      });
      if (!hasExplicitSwimlaneIds && !showArchivedItems) {
        return result.filter((s) => !s.archived);
      }
    }

    return result;
  }, [swimlanes, board, selections, showArchivedItems]);

  /** True when the currently selected board is archived, or an archived swimlane is explicitly selected by ID. */
  const isArchivedFromSelection = useMemo(() => {
    if (board?.archived === true) return true;
    // Only lock when an archived swimlane is explicitly selected by ID (not via the "All" wildcard).
    const hasExplicitSwimlaneIds = selections.some((s) => {
      const colonIdx = s.indexOf(':');
      return colonIdx !== -1 && s.slice(colonIdx + 1) !== '*';
    });
    if (!hasExplicitSwimlaneIds) return false;
    return filteredSwimlanes.some((sw) => sw.archived === true && selectedSwimlaneIds.has(sw.id));
  }, [board, filteredSwimlanes, selections, selectedSwimlaneIds]);

  // Sync global store with current selection state.
  // When an archived entity is selected: force ON + lock.
  // When back to active: turn OFF + unlock.
  useEffect(() => {
    if (isArchivedFromSelection) {
      setShowArchivedItems(true);
      setLockedBySelection(true);
    } else {
      setShowArchivedItems(false);
      setLockedBySelection(false);
    }
  }, [isArchivedFromSelection, setShowArchivedItems, setLockedBySelection]);

  const isArchivedSelectionMode = showArchivedItems || isArchivedFromSelection;

  return {
    // Data
    boards,
    swimlanes,
    activeBoards,
    activeSwimlanes,
    filteredSwimlanes,
    board,
    labels,
    isLoading,
    isArchivedSelectionMode,

    // Selection state
    selections,
    isAllSelected,
    selectedSwimlaneIds,
    selectedBoardIds,
    primaryBoardId,
    hasSelections,
    isSwimlaneSelected,
    isBoardSelected,

    // Selection actions
    selectAll,
    selectBoard,
    toggleSwimlane,
    clearSelection,

    // Board/swimlane CRUD actions
    putBoard,
    deleteBoard,
    putSwimlane,
    deleteSwimlane,
    loadBoards,
    reloadSwimlanes,
  };
}
