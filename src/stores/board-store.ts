'use client';

import { create } from 'zustand';
import type { Board, BoardColumn, Swimlane } from '@/lib/types';
import * as db from '@/lib/db';

type SwimlaneResources = {
  tasks: import('@/lib/types').Task[];
  habits: import('@/lib/types').Habit[];
  routines: import('@/lib/types').Routine[];
  notes: import('@/lib/types').Note[];
  bookmarks: import('@/lib/types').Bookmark[];
  mindmaps: import('@/lib/types').Mindmap[];
  visionItems: import('@/lib/types').VisionBoardItem[];
};

export type { SwimlaneResources };

interface BoardState {
  boards: Board[];
  swimlanes: Swimlane[];
  isLoading: boolean;

  // Subscriptions cleanup
  _unsubscribers: (() => void)[];

  // Actions
  loadBoards: () => Promise<void>;
  putBoard: (board: Partial<Board>) => Promise<Board | void>;
  deleteBoard: (boardId: string) => Promise<void>;
  putSwimlane: (swimlane: Partial<Swimlane>) => Promise<Swimlane>;
  deleteSwimlane: (swimlaneId: string) => Promise<void>;
  archiveBoard: (boardId: string) => Promise<void>;
  archiveSwimlane: (swimlaneId: string) => Promise<void>;
  unarchiveBoard: (boardId: string) => Promise<void>;
  unarchiveSwimlane: (swimlaneId: string) => Promise<void>;
  permanentDeleteBoard: (boardId: string) => Promise<void>;
  permanentDeleteSwimlane: (swimlaneId: string) => Promise<void>;
  reorderBoards: (orderedIds: string[]) => Promise<void>;
  reorderSwimlanes: (orderedIds: string[]) => Promise<void>;
  reorderColumns: (boardId: string, orderedColumnIds: string[]) => Promise<void>;
  reloadSwimlanes: () => Promise<void>;
  setBoards: (boards: Board[]) => void;
  setSwimlanes: (swimlanes: Swimlane[]) => void;
  cleanup: () => void;
  moveSwimlane: (swimlaneId: string, targetBoardId: string) => Promise<void>;
  getSwimlaneResources: (swimlaneId: string) => Promise<SwimlaneResources>;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  swimlanes: [],
  isLoading: true,
  _unsubscribers: [],

  loadBoards: async () => {
    try {
      set({ isLoading: true });
      const boards = await db.getAllBoards();

      // Load swimlanes in parallel to avoid N sequential round-trips.
      const swimlaneGroups = await Promise.all(
        boards.map((board) => db.getSwimlanesByBoard(board.id))
      );
      const allSwimlanes = swimlaneGroups.flat();

      set({ boards, swimlanes: allSwimlanes, isLoading: false });
    } catch (error) {
      console.error('Failed to load boards:', error);
      set({ isLoading: false });
    }
  },

  putBoard: async (board: Partial<Board>) => {
    const result = await db.putBoard(board);
    // Reload boards to get fresh data
    await get().loadBoards();
    return result;
  },

  deleteBoard: async (boardId: string) => {
    await db.deleteBoard(boardId);
    await get().loadBoards();
  },

  putSwimlane: async (swimlane: Partial<Swimlane>) => {
    const result = await db.putSwimlane(swimlane);
    await get().reloadSwimlanes();
    return result;
  },

  deleteSwimlane: async (swimlaneId: string) => {
    await db.deleteSwimlane(swimlaneId);
    await get().reloadSwimlanes();
  },

  archiveBoard: async (boardId: string) => {
    await db.archiveBoard(boardId);
    await get().loadBoards();
  },

  archiveSwimlane: async (swimlaneId: string) => {
    await db.archiveSwimlane(swimlaneId);
    await get().reloadSwimlanes();
  },

  unarchiveBoard: async (boardId: string) => {
    await db.unarchiveBoard(boardId);
    await get().loadBoards();
  },

  unarchiveSwimlane: async (swimlaneId: string) => {
    await db.unarchiveSwimlane(swimlaneId);
    await get().reloadSwimlanes();
  },

  permanentDeleteBoard: async (boardId: string) => {
    await db.permanentDeleteBoard(boardId);
    await get().loadBoards();
  },

  permanentDeleteSwimlane: async (swimlaneId: string) => {
    await db.permanentDeleteSwimlane(swimlaneId);
    await get().reloadSwimlanes();
  },

  reorderBoards: async (orderedIds: string[]) => {
    const { boards } = get();
    // Optimistically update local state — preserve boards not in orderedIds (e.g. archived)
    const reordered = orderedIds
      .map((id) => boards.find((b) => b.id === id))
      .filter(Boolean) as Board[];
    const notReordered = boards.filter((b) => !orderedIds.includes(b.id));
    set({ boards: [...reordered, ...notReordered] });
    // Persist each board's new order index
    await Promise.all(
      orderedIds.map((id, index) => db.putBoard({ id, order: index }))
    );
  },

  reorderSwimlanes: async (orderedIds: string[]) => {
    const { swimlanes } = get();
    // Optimistically update local state
    const remaining = swimlanes.filter((s) => !orderedIds.includes(s.id));
    const reordered = orderedIds
      .map((id) => swimlanes.find((s) => s.id === id))
      .filter(Boolean) as Swimlane[];
    set({ swimlanes: [...reordered, ...remaining] });
    // Persist each swimlane's new order index
    await Promise.all(
      orderedIds.map((id, index) => db.putSwimlane({ id, order: index }))
    );
  },

  reorderColumns: async (boardId: string, orderedColumnIds: string[]) => {
    const { boards } = get();
    // Optimistically update columns array in local state
    const updatedBoards = boards.map((b) => {
      if (b.id !== boardId) return b;
      const reordered = orderedColumnIds
        .map((id) => b.columns.find((c) => c.id === id))
        .filter(Boolean) as BoardColumn[];
      return { ...b, columns: reordered };
    });
    set({ boards: updatedBoards });
    // Persist the new column order (columns live in the board record itself)
    const updated = updatedBoards.find((b) => b.id === boardId);
    if (updated) {
      await db.putBoard({ id: boardId, columns: updated.columns });
    }
  },

  reloadSwimlanes: async () => {
    const { boards } = get();
    const swimlaneGroups = await Promise.all(
      boards.map((board) => db.getSwimlanesByBoard(board.id))
    );
    const allSwimlanes = swimlaneGroups.flat();
    set({ swimlanes: allSwimlanes });
  },

  setBoards: (boards: Board[]) => set({ boards }),
  setSwimlanes: (swimlanes: Swimlane[]) => set({ swimlanes }),

  cleanup: () => {
    const { _unsubscribers } = get();
    _unsubscribers.forEach(unsub => unsub());
    set({ _unsubscribers: [], boards: [], swimlanes: [] });
  },

  getSwimlaneResources: async (swimlaneId: string): Promise<SwimlaneResources> => {
    const [tasks, habits, routines, notes, bookmarks, mindmaps, visionItems] = await Promise.all([
      db.getTasksBySwimlane(swimlaneId),
      db.getHabitsBySwimlane(swimlaneId),
      db.getRoutinesBySwimlane(swimlaneId),
      db.getNotesBySwimlane(swimlaneId),
      db.getBookmarksBySwimlane(swimlaneId),
      db.getMindmapsBySwimlane(swimlaneId),
      db.getVisionItemsBySwimlane(swimlaneId),
    ]);
    return { tasks, habits, routines, notes, bookmarks, mindmaps, visionItems };
  },

  moveSwimlane: async (swimlaneId: string, targetBoardId: string) => {
    const { boards, swimlanes } = get();

    const swimlane = swimlanes.find((s) => s.id === swimlaneId);
    if (!swimlane) return;

    const targetBoard = boards.find((b) => b.id === targetBoardId);
    if (!targetBoard) return;

    const sourceBoard = boards.find((b) => b.id === swimlane.boardId);
    const sourceArchiveColId = sourceBoard?.archiveColumnId;
    const targetFirstColId = targetBoard.columns[0]?.id;
    const targetArchiveColId = targetBoard.archiveColumnId ?? targetFirstColId;

    const mapColumnId = (columnId: string | undefined): string | undefined => {
      if (!columnId || !targetFirstColId) return columnId;
      if (columnId === sourceArchiveColId) return targetArchiveColId;
      return targetFirstColId;
    };

    const [tasks, habits, routines, notes, bookmarks, mindmaps, visionItems] = await Promise.all([
      db.getTasksBySwimlane(swimlaneId),
      db.getHabitsBySwimlane(swimlaneId),
      db.getRoutinesBySwimlane(swimlaneId),
      db.getNotesBySwimlane(swimlaneId),
      db.getBookmarksBySwimlane(swimlaneId),
      db.getMindmapsBySwimlane(swimlaneId),
      db.getVisionItemsBySwimlane(swimlaneId),
    ]);

    await db.putSwimlane({ ...swimlane, boardId: targetBoardId });

    await Promise.all([
      ...tasks.map((t) =>
        db.putTask({ ...t, boardId: targetBoardId, columnId: mapColumnId(t.columnId) ?? t.columnId })
      ),
      ...habits.map((h) => db.putHabit({ ...h, boardId: targetBoardId })),
      ...routines.map((r) => db.putRoutine({ ...r, boardId: targetBoardId, columnId: mapColumnId(r.columnId) ?? r.columnId })),
      ...notes.map((n) => db.putNote({ ...n, boardId: targetBoardId })),
      ...bookmarks.map((b) => db.putBookmark({ ...b, boardId: targetBoardId })),
      ...mindmaps.map((m) => db.putMindmap({ ...m, boardId: targetBoardId })),
      ...visionItems.map((v) => db.putVisionItem({ ...v, boardId: targetBoardId })),
    ]);

    await get().loadBoards();
  },
}));
