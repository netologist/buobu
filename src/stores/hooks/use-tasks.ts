'use client';

import { useAtomValue } from 'jotai';
import { useRxCollectionSubscription, useRxBoardSubscription } from './use-rx-subscription';
import { tasksAtom, tasksLoadingAtom, filteredTasksAtom, activeTasksAtom, archivedTasksAtom } from '../atoms/tasks';
import * as db from '@/lib/db';

/**
 * Hook for subscribing to all tasks reactively.
 * Automatically updates when tasks change in RxDB (local or synced).
 */
export function useTasksSubscription() {
  useRxCollectionSubscription('tasks', tasksAtom, tasksLoadingAtom);
}

/**
 * Hook for subscribing to tasks for a specific board.
 */
export function useBoardTasksSubscription(boardId: string | null | undefined) {
  useRxBoardSubscription('tasks', boardId, tasksAtom, tasksLoadingAtom);
}

/**
 * Read all tasks from Jotai atom (requires useTasksSubscription to be active).
 */
export function useTasks() {
  return useAtomValue(tasksAtom);
}

/**
 * Read filtered tasks (by swimlane selection).
 */
export function useFilteredTasks() {
  return useAtomValue(filteredTasksAtom);
}

/**
 * Read active (non-archived) tasks.
 */
export function useActiveTasks() {
  return useAtomValue(activeTasksAtom);
}

/**
 * Read archived tasks.
 */
export function useArchivedTasks() {
  return useAtomValue(archivedTasksAtom);
}

/**
 * Read tasks loading state.
 */
export function useTasksLoading() {
  return useAtomValue(tasksLoadingAtom);
}

/**
 * Task mutation actions (write-through to RxDB).
 * After mutation, the RxDB subscription auto-updates the atom.
 */
export const taskActions = {
  put: db.putTask,
  delete: db.deleteTask,
};
