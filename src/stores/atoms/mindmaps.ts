'use client';

import { atom } from 'jotai';
import type { Mindmap } from '@/lib/types';
import { useSwimlaneSelectionStore, filterItems } from '../swimlane-selection-store';

// --- Base atoms ---
export const mindmapsAtom = atom<Mindmap[]>([]);
export const mindmapsLoadingAtom = atom<boolean>(false);

// --- Derived atoms ---

/** Mindmaps filtered by current swimlane selection */
export const filteredMindmapsAtom = atom<Mindmap[]>((get) => {
  const items = get(mindmapsAtom);
  const selections = useSwimlaneSelectionStore.getState().selections;
  return filterItems(items, selections);
});

/** Non-archived mindmaps */
export const activeMindmapsAtom = atom<Mindmap[]>((get) => {
  const mindmaps = get(mindmapsAtom);
  return mindmaps.filter((m) => !m.archived);
});
export const archivedMindmapsAtom = atom<Mindmap[]>((get) => {
  const mindmaps = get(mindmapsAtom);
  return mindmaps.filter((m) => m.archived === true);
});

/** Mindmaps for a specific board */
export const boardMindmapsAtomFamily = (boardId: string) =>
  atom<Mindmap[]>((get) => {
    const items = get(mindmapsAtom);
    return items.filter((m) => m.boardId === boardId);
  });
