'use client';

import { atom } from 'jotai';
import type { Note } from '@/lib/types';
import { useSwimlaneSelectionStore, filterItems } from '../swimlane-selection-store';

// --- Base atoms ---
export const notesAtom = atom<Note[]>([]);
export const notesLoadingAtom = atom<boolean>(false);

// --- Derived atoms ---

/** Notes filtered by current swimlane selection */
export const filteredNotesAtom = atom<Note[]>((get) => {
  const notes = get(notesAtom);
  const selections = useSwimlaneSelectionStore.getState().selections;
  return filterItems(notes, selections);
});

/** Non-archived notes */
export const activeNotesAtom = atom<Note[]>((get) => {
  const notes = get(notesAtom);
  return notes.filter((n) => !n.archived);
});
export const archivedNotesAtom = atom<Note[]>((get) => {
  const notes = get(notesAtom);
  return notes.filter((n) => n.archived === true);
});

/** Pinned notes */
export const pinnedNotesAtom = atom<Note[]>((get) => {
  const notes = get(notesAtom);
  return notes.filter((n) => n.pinned);
});

/** Notes for a specific board */
export const boardNotesAtomFamily = (boardId: string) =>
  atom<Note[]>((get) => {
    const notes = get(notesAtom);
    return notes.filter((n) => n.boardId === boardId);
  });
