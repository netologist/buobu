'use client';

import { atom } from 'jotai';
import type { Routine, RoutineLog } from '@/lib/types';
import { getTodayDateKey } from '@/lib/date';

// --- Base atoms ---
export const routinesAtom = atom<Routine[]>([]);
export const routinesLoadingAtom = atom<boolean>(true);
export const routineLogsAtom = atom<RoutineLog[]>([]);
export const routineLogsLoadingAtom = atom<boolean>(true);

// --- Derived atoms ---

/** Active (non-archived) routines */
export const activeRoutinesAtom = atom<Routine[]>((get) =>
  get(routinesAtom).filter((r) => !r.archived)
);

export const archivedRoutinesAtom = atom<Routine[]>((get) =>
  get(routinesAtom).filter((r) => r.archived === true)
);

/**
 * Routines due today or overdue (nextDueDate <= today), per D-14.
 * Filters only active routines.
 */
export const dueRoutinesAtom = atom<Routine[]>((get) => {
  const today = getTodayDateKey();
  return get(activeRoutinesAtom).filter(
    (r) => r.nextDueDate != null && r.nextDueDate <= today
  );
});

/** Due routines requiring user approval (type "task" or "event"), per D-10 */
export const approvalRequiredRoutinesAtom = atom<Routine[]>((get) =>
  get(dueRoutinesAtom).filter((r) => r.type === 'task' || r.type === 'event')
);

/** Due payment routines (auto-processed, no approval needed), per D-09 */
export const autoProcessRoutinesAtom = atom<Routine[]>((get) =>
  get(dueRoutinesAtom).filter((r) => r.type === 'payment')
);

/** RoutineLogs grouped by routineId */
export const logsByRoutineAtom = atom<Record<string, RoutineLog[]>>((get) => {
  const logs = get(routineLogsAtom);
  const grouped: Record<string, RoutineLog[]> = {};
  for (const log of logs) {
    if (!grouped[log.routineId]) grouped[log.routineId] = [];
    grouped[log.routineId].push(log);
  }
  return grouped;
});
