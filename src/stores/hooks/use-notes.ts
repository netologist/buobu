'use client';

import { useAtomValue } from 'jotai';
import { useRxCollectionSubscription, useRxBoardSubscription } from './use-rx-subscription';
import { notesAtom, notesLoadingAtom, filteredNotesAtom, activeNotesAtom, archivedNotesAtom, pinnedNotesAtom } from '../atoms/notes';
import * as db from '@/lib/db';

export function useNotesSubscription() {
  useRxCollectionSubscription('notes', notesAtom, notesLoadingAtom);
}

export function useBoardNotesSubscription(boardId: string | null | undefined) {
  useRxBoardSubscription('notes', boardId, notesAtom, notesLoadingAtom);
}

export function useNotes() {
  return useAtomValue(notesAtom);
}

export function useFilteredNotes() {
  return useAtomValue(filteredNotesAtom);
}

export function useActiveNotes() {
  return useAtomValue(activeNotesAtom);
}

export function useArchivedNotes() {
  return useAtomValue(archivedNotesAtom);
}

export function usePinnedNotes() {
  return useAtomValue(pinnedNotesAtom);
}

export const noteActions = {
  put: db.putNote,
  delete: db.deleteNote,
};
