'use client';

import { useAtomValue } from 'jotai';
import { useRxCollectionSubscription, useRxBoardSubscription } from './use-rx-subscription';
import { mindmapsAtom, mindmapsLoadingAtom, filteredMindmapsAtom, activeMindmapsAtom, archivedMindmapsAtom } from '../atoms/mindmaps';
import * as db from '@/lib/db';

export function useMindmapsSubscription() {
  useRxCollectionSubscription('mindmaps', mindmapsAtom, mindmapsLoadingAtom);
}

export function useBoardMindmapsSubscription(boardId: string | null | undefined) {
  useRxBoardSubscription('mindmaps', boardId, mindmapsAtom, mindmapsLoadingAtom);
}

export function useMindmaps() {
  return useAtomValue(mindmapsAtom);
}

export function useFilteredMindmaps() {
  return useAtomValue(filteredMindmapsAtom);
}

export function useActiveMindmaps() {
  return useAtomValue(activeMindmapsAtom);
}

export function useArchivedMindmaps() {
  return useAtomValue(archivedMindmapsAtom);
}

export const mindmapActions = {
  put: db.putMindmap,
  delete: db.deleteMindmap,
};
