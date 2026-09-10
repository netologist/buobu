'use client';

import { useAtomValue } from 'jotai';
import { useRxCollectionSubscription } from './use-rx-subscription';
import {
  routinesAtom,
  routinesLoadingAtom,
  routineLogsAtom,
  routineLogsLoadingAtom,
  activeRoutinesAtom,
  archivedRoutinesAtom,
  dueRoutinesAtom,
  approvalRequiredRoutinesAtom,
  autoProcessRoutinesAtom,
  logsByRoutineAtom,
} from '../atoms/routines';
import * as db from '@/lib/db';

/** Subscribe to all routines reactively. Mount at page or provider level. */
export function useRoutinesSubscription() {
  useRxCollectionSubscription('routines', routinesAtom, routinesLoadingAtom);
}

/** Subscribe to all routine logs reactively. Mount at page or provider level. */
export function useRoutineLogsSubscription() {
  useRxCollectionSubscription('routineLogs', routineLogsAtom, routineLogsLoadingAtom);
}

export function useRoutines() { return useAtomValue(routinesAtom); }
export function useActiveRoutines() { return useAtomValue(activeRoutinesAtom); }
export function useArchivedRoutines() { return useAtomValue(archivedRoutinesAtom); }
export function useDueRoutines() { return useAtomValue(dueRoutinesAtom); }
export function useApprovalRequiredRoutines() { return useAtomValue(approvalRequiredRoutinesAtom); }
export function useAutoProcessRoutines() { return useAtomValue(autoProcessRoutinesAtom); }
export function useRoutineLogs() { return useAtomValue(routineLogsAtom); }
export function useLogsByRoutine() { return useAtomValue(logsByRoutineAtom); }

/** Routine mutation actions -- mirrors habitActions pattern. */
export const routineActions = {
  put: db.putRoutine,
  archive: db.archiveRoutine,
  delete: db.deleteRoutine,
  putLog: db.putRoutineLog,
};
