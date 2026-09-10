'use client';

import { useAtomValue } from 'jotai';
import { useRxCollectionSubscription, useRxBoardSubscription } from './use-rx-subscription';
import { visionItemsAtom, visionItemsLoadingAtom, filteredVisionItemsAtom, activeVisionItemsAtom, archivedVisionItemsAtom } from '../atoms/vision';
import * as db from '@/lib/db';

export function useVisionItemsSubscription() {
  useRxCollectionSubscription('visionItems', visionItemsAtom, visionItemsLoadingAtom);
}

export function useBoardVisionItemsSubscription(boardId: string | null | undefined) {
  useRxBoardSubscription('visionItems', boardId, visionItemsAtom, visionItemsLoadingAtom);
}

export function useVisionItems() {
  return useAtomValue(visionItemsAtom);
}

export function useFilteredVisionItems() {
  return useAtomValue(filteredVisionItemsAtom);
}

export function useActiveVisionItems() {
  return useAtomValue(activeVisionItemsAtom);
}

export function useArchivedVisionItems() {
  return useAtomValue(archivedVisionItemsAtom);
}

export const visionItemActions = {
  put: db.putVisionItem,
  delete: db.deleteVisionItem,
};
