'use client';

import { atom } from 'jotai';
import type { VisionBoardItem } from '@/lib/types';
import { useSwimlaneSelectionStore, filterItems } from '../swimlane-selection-store';

// --- Base atoms ---
export const visionItemsAtom = atom<VisionBoardItem[]>([]);
export const visionItemsLoadingAtom = atom<boolean>(false);

// --- Derived atoms ---

/** Vision items filtered by current swimlane selection */
export const filteredVisionItemsAtom = atom<VisionBoardItem[]>((get) => {
  const items = get(visionItemsAtom);
  const selections = useSwimlaneSelectionStore.getState().selections;
  return filterItems(items, selections);
});

/** Vision items for a specific board */
export const boardVisionItemsAtomFamily = (boardId: string) =>
  atom<VisionBoardItem[]>((get) => {
    const items = get(visionItemsAtom);
    return items.filter((i) => i.boardId === boardId);
  });
export const activeVisionItemsAtom = atom<VisionBoardItem[]>((get) => {
  const items = get(visionItemsAtom);
  return items.filter((i) => !i.archived);
});
export const archivedVisionItemsAtom = atom<VisionBoardItem[]>((get) => {
  const items = get(visionItemsAtom);
  return items.filter((i) => i.archived === true);
});
