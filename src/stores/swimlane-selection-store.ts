'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Selection = string; // "boardId:swimlaneId" | "boardId:*" | "*:*"

export interface ParsedSelection {
  boardId: string;
  swimlaneId: string;
}

export function parseSelection(sel: Selection): ParsedSelection {
  const [boardId, swimlaneId] = sel.split(':');
  return { boardId, swimlaneId };
}

export function createSelection(boardId: string, swimlaneId: string): Selection {
  return `${boardId}:${swimlaneId}`;
}

const ALL_SELECTION: Selection = '*:*';

interface SwimlaneSelectionState {
  selections: Selection[];

  // Actions
  selectAll: () => void;
  selectBoard: (boardId: string) => void;
  toggleSwimlane: (boardId: string, swimlaneId: string) => void;
  clearSelection: () => void;

  // Derived getters (computed in hooks below)
}

export const useSwimlaneSelectionStore = create<SwimlaneSelectionState>()(
  persist(
    (set) => ({
      selections: [],

      selectAll: () => set({ selections: [ALL_SELECTION] }),

      selectBoard: (boardId: string) =>
        set((state) => {
          const nextSelection = `${boardId}:*`;
          if (state.selections.length === 1 && state.selections[0] === nextSelection) {
            return state;
          }
          return { selections: [nextSelection] };
        }),

      toggleSwimlane: (boardId: string, swimlaneId: string) =>
        set((state) => {
          const sel = createSelection(boardId, swimlaneId);
          const next = state.selections.filter((s) => {
            const p = parseSelection(s);
            return p.swimlaneId !== '*';
          });

          const idx = next.indexOf(sel);
          if (idx >= 0) {
            next.splice(idx, 1);
          } else {
            next.push(sel);
          }

          // If no swimlanes remain selected, fall back to board-level selection
          // so the selected board doesn't reset to the first board.
          if (next.length === 0) {
            return { selections: [`${boardId}:*`] };
          }

          return { selections: next };
        }),

      clearSelection: () => set({ selections: [] }),
    }),
    {
      name: 'buobu-swimlane-selections',
    }
  )
);

// --- Derived hooks (replacing useMemo computations from old Context) ---

export function useSwimlaneSelectionDerived() {
  const selections = useSwimlaneSelectionStore((s) => s.selections);

  const isAllSelected = selections.includes(ALL_SELECTION);

  const selectedSwimlaneIds = new Set<string>();
  const selectedBoardIds = new Set<string>();
  for (const sel of selections) {
    const parsed = parseSelection(sel);
    if (parsed.swimlaneId !== '*') {
      selectedSwimlaneIds.add(parsed.swimlaneId);
    }
    if (parsed.boardId !== '*') {
      selectedBoardIds.add(parsed.boardId);
    }
  }

  const primaryBoardId =
    selections.length > 0
      ? (() => {
          const first = parseSelection(selections[0]);
          return first.boardId === '*' ? null : first.boardId;
        })()
      : null;

  const hasSelections = selections.length > 0;

  const isSwimlaneSelected = (swimlaneId: string) =>
    selections.some((sel) => {
      const parsed = parseSelection(sel);
      return parsed.swimlaneId === swimlaneId && parsed.swimlaneId !== '*';
    });

  const isBoardSelected = (boardId: string) =>
    selections.includes(`${boardId}:*`);

  return {
    selections,
    isAllSelected,
    selectedSwimlaneIds,
    selectedBoardIds,
    primaryBoardId,
    hasSelections,
    isSwimlaneSelected,
    isBoardSelected,
  };
}

// --- Filter utilities (pure functions, same logic as old Context) ---

export function filterSwimlanes<T extends { id: string; boardId: string }>(
  swimlanes: T[],
  selections: Selection[]
): T[] {
  if (selections.length === 0) return [];
  if (selections.includes('*:*')) return swimlanes;

  const swimlaneSelections = selections.filter(
    (s) => parseSelection(s).swimlaneId !== '*'
  );
  if (swimlaneSelections.length > 0) {
    const swimlaneIds = new Set(
      swimlaneSelections.map((s) => parseSelection(s).swimlaneId)
    );
    return swimlanes.filter((lane) => swimlaneIds.has(lane.id));
  }

  const boardSelections = selections.filter(
    (s) => parseSelection(s).swimlaneId === '*'
  );
  if (boardSelections.length > 0) {
    const boardIds = new Set(
      boardSelections.map((s) => parseSelection(s).boardId)
    );
    return swimlanes.filter((lane) => boardIds.has(lane.boardId));
  }

  return [];
}

export function filterItems<T extends { swimlaneId: string; boardId: string }>(
  items: T[],
  selections: Selection[]
): T[] {
  if (selections.length === 0) return [];
  if (selections.includes('*:*')) return items;

  const swimlaneSelections = selections.filter(
    (s) => parseSelection(s).swimlaneId !== '*'
  );
  if (swimlaneSelections.length > 0) {
    const swimlaneIds = new Set(
      swimlaneSelections.map((s) => parseSelection(s).swimlaneId)
    );
    return items.filter((item) => swimlaneIds.has(item.swimlaneId));
  }

  const boardSelections = selections.filter(
    (s) => parseSelection(s).swimlaneId === '*'
  );
  if (boardSelections.length > 0) {
    const boardIds = new Set(
      boardSelections.map((s) => parseSelection(s).boardId)
    );
    return items.filter((item) => boardIds.has(item.boardId));
  }

  return [];
}
