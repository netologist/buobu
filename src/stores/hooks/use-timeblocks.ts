'use client';

import { useAtomValue } from 'jotai';
import { useRxCollectionSubscription } from './use-rx-subscription';
import {
  timeblocksAtom,
  timeblocksLoadingAtom,
  activeTimeblocksAtom,
  archivedTimeblocksAtom,
} from '../atoms/timeblocks';
import * as db from '@/lib/db';

/** Subscribe to all timeblocks reactively. Mount at page or provider level. */
export function useTimeblocksSubscription() {
  useRxCollectionSubscription('timeblocks', timeblocksAtom, timeblocksLoadingAtom);
}

export function useAllTimeblocks() { return useAtomValue(timeblocksAtom); }
export function useActiveTimeblocks() { return useAtomValue(activeTimeblocksAtom); }
export function useArchivedTimeblocks() { return useAtomValue(archivedTimeblocksAtom); }
export function useTimeblocksLoading() { return useAtomValue(timeblocksLoadingAtom); }

/** Timeblock mutation actions */
export const timeblockActions = {
  put: db.putTimeblock,
  archive: db.archiveTimeblock,
  unarchive: db.unarchiveTimeblock,
  permanentDelete: db.permanentDeleteTimeblock,
  detach: db.detachFromTimeblock,
};
