'use client';

import { useAtomValue } from 'jotai';
import { useRxCollectionSubscription, useRxBoardSubscription } from './use-rx-subscription';
import { habitsAtom, habitsLoadingAtom, habitLogsAtom, habitLogsLoadingAtom, filteredHabitsAtom, activeHabitsAtom, archivedHabitsAtom, logsByHabitAtom } from '../atoms/habits';
import * as db from '@/lib/db';

/**
 * Hook for subscribing to all habits reactively.
 */
export function useHabitsSubscription() {
  useRxCollectionSubscription('habits', habitsAtom, habitsLoadingAtom);
}

/**
 * Hook for subscribing to habits for a specific board.
 */
export function useBoardHabitsSubscription(boardId: string | null | undefined) {
  useRxBoardSubscription('habits', boardId, habitsAtom, habitsLoadingAtom);
}

/**
 * Hook for subscribing to all habit logs reactively.
 */
export function useHabitLogsSubscription() {
  useRxCollectionSubscription('habitLogs', habitLogsAtom, habitLogsLoadingAtom);
}

/**
 * Read all habits from Jotai atom.
 */
export function useHabits() {
  return useAtomValue(habitsAtom);
}

/**
 * Read filtered habits.
 */
export function useFilteredHabits() {
  return useAtomValue(filteredHabitsAtom);
}

/**
 * Read active habits.
 */
export function useActiveHabits() {
  return useAtomValue(activeHabitsAtom);
}

/**
 * Read archived habits.
 */
export function useArchivedHabits() {
  return useAtomValue(archivedHabitsAtom);
}

/**
 * Read habit logs.
 */
export function useHabitLogs() {
  return useAtomValue(habitLogsAtom);
}

/**
 * Read habit logs grouped by habit ID.
 */
export function useLogsByHabit() {
  return useAtomValue(logsByHabitAtom);
}

/**
 * Habit mutation actions.
 */
export const habitActions = {
  put: db.putHabit,
  delete: db.deleteHabit,
  putLog: db.putHabitLog,
  deleteLog: db.deleteHabitLog,
};
