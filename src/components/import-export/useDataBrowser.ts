"use client";

import { useCallback, useMemo, useState } from "react";
import type { ExportFileData } from "@/lib/import-export/types";
import type { Board, Swimlane, Task, Habit, Note, Bookmark, VisionBoardItem, Mindmap } from "@/lib/types";

export type DataBrowserFilter = {
  boardIds: string[];    // empty = all
  swimlaneIds: string[]; // empty = all
};

export type DataBrowserSection =
  | "tasks"
  | "habits"
  | "notes"
  | "bookmarks"
  | "whiteboards"
  | "mindmaps";

export type DetailItem =
  | { type: "task"; item: Task }
  | { type: "habit"; item: Habit }
  | { type: "note"; item: Note }
  | { type: "bookmark"; item: Bookmark }
  | { type: "whiteboard"; item: VisionBoardItem }
  | { type: "mindmap"; item: Mindmap };

export function useDataBrowser(data: ExportFileData) {
  const [filter, setFilter] = useState<DataBrowserFilter>({
    boardIds: [],
    swimlaneIds: [],
  });

  const [activeSection, setActiveSection] = useState<DataBrowserSection>("tasks");
  const [detailItem, setDetailItem] = useState<DetailItem | null>(null);

  // Board lookup map
  const boardMap = useMemo(() => {
    return new Map<string, Board>(data.boards.map((b) => [b.id, b]));
  }, [data.boards]);

  // Swimlane lookup map
  const swimlaneMap = useMemo(() => {
    return new Map<string, Swimlane>(data.swimlanes.map((s) => [s.id, s]));
  }, [data.swimlanes]);

  // Swimlanes per board
  const swimlanesByBoard = useMemo(() => {
    const map = new Map<string, Swimlane[]>();
    for (const s of data.swimlanes) {
      const boardId = s.boardId ?? "";
      if (!map.has(boardId)) map.set(boardId, []);
      map.get(boardId)!.push(s);
    }
    return map;
  }, [data.swimlanes]);

  // Helper: does an entity pass the current board/swimlane filter?
  const passes = useCallback(
    (entity: { boardId?: string; swimlaneId?: string }) => {
      const bMatch =
        filter.boardIds.length === 0 ||
        (entity.boardId != null && filter.boardIds.includes(entity.boardId));
      const sMatch =
        filter.swimlaneIds.length === 0 ||
        (entity.swimlaneId != null && filter.swimlaneIds.includes(entity.swimlaneId));
      return bMatch && sMatch;
    },
    [filter]
  );

  // Filtered resources
  const tasks = data.tasks.filter((t) => !t._deleted && passes(t));

  const habits = data.habits.filter((h) => !h._deleted && passes(h));

  // HabitLog map keyed by habitId
  const habitLogsByHabit = (() => {
    const map = new Map<string, typeof data.habitLogs>();
    for (const log of data.habitLogs) {
      if (log._deleted) continue;
      if (!map.has(log.habitId)) map.set(log.habitId, []);
      map.get(log.habitId)!.push(log);
    }
    return map;
  })();

  const notes = data.notes.filter((n) => !n._deleted && passes(n));

  const bookmarks = data.bookmarks.filter((b) => !b._deleted && passes(b));

  const whiteboards = data.visionItems.filter((v) => !v._deleted && passes(v));

  const mindmaps = data.mindmaps.filter((m) => !m._deleted && passes(m));

  // Section counts
  const counts = {
    tasks: tasks.length,
    habits: habits.length,
    notes: notes.length,
    bookmarks: bookmarks.length,
    whiteboards: whiteboards.length,
    mindmaps: mindmaps.length,
  };

  // Filter helpers
  const toggleBoard = (boardId: string) => {
    setFilter((prev) => {
      const included = prev.boardIds.includes(boardId);
      const newBoardIds = included
        ? prev.boardIds.filter((id) => id !== boardId)
        : [...prev.boardIds, boardId];

      // When a board is deselected, remove its swimlanes from filter
      const boardSwimlaneIds = (swimlanesByBoard.get(boardId) ?? []).map((s) => s.id);
      const newSwimlaneIds = included
        ? prev.swimlaneIds.filter((id) => !boardSwimlaneIds.includes(id))
        : prev.swimlaneIds;

      return { boardIds: newBoardIds, swimlaneIds: newSwimlaneIds };
    });
  };

  const toggleSwimlane = (swimlaneId: string) => {
    setFilter((prev) => ({
      ...prev,
      swimlaneIds: prev.swimlaneIds.includes(swimlaneId)
        ? prev.swimlaneIds.filter((id) => id !== swimlaneId)
        : [...prev.swimlaneIds, swimlaneId],
    }));
  };

  const clearFilter = () => setFilter({ boardIds: [], swimlaneIds: [] });

  const openDetail = (item: DetailItem) => setDetailItem(item);
  const closeDetail = () => setDetailItem(null);

  return {
    filter,
    activeSection,
    setActiveSection,
    boardMap,
    swimlaneMap,
    swimlanesByBoard,
    toggleBoard,
    toggleSwimlane,
    clearFilter,
    tasks,
    habits,
    habitLogsByHabit,
    notes,
    bookmarks,
    whiteboards,
    mindmaps,
    counts,
    boards: data.boards,
    swimlanes: data.swimlanes,
    detailItem,
    openDetail,
    closeDetail,
  };
}
