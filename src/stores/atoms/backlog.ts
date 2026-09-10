'use client';

import { atom } from 'jotai';
import type { BacklogItem } from '@/lib/types';

// --- Base atoms ---
export const backlogItemsAtom = atom<BacklogItem[]>([]);
export const backlogLoadingAtom = atom<boolean>(false);

// --- Derived atoms ---

/** Backlog items for a specific swimlane */
export const swimlaneBacklogAtomFamily = (swimlaneId: string) =>
  atom<BacklogItem[]>((get) => {
    const items = get(backlogItemsAtom);
    return items.filter((i) => i.swimlaneId === swimlaneId);
  });

/** Backlog count per swimlane */
export const backlogCountsAtom = atom<Record<string, number>>((get) => {
  const items = get(backlogItemsAtom);
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item.swimlaneId] = (counts[item.swimlaneId] || 0) + 1;
  }
  return counts;
});
export const activeBacklogItemsAtom = atom<BacklogItem[]>((get) => {
  const items = get(backlogItemsAtom);
  return items.filter((i) => !i.archived);
});
export const archivedBacklogItemsAtom = atom<BacklogItem[]>((get) => {
  const items = get(backlogItemsAtom);
  return items.filter((i) => i.archived === true);
});
