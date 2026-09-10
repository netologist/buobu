'use client';

import { atom } from 'jotai';
import type { Task } from '@/lib/types';
import { useSwimlaneSelectionStore, filterItems } from '../swimlane-selection-store';

// --- Base atoms ---
export const tasksAtom = atom<Task[]>([]);
export const tasksLoadingAtom = atom<boolean>(false);

// --- Derived atoms ---

/** Tasks filtered by current swimlane selection */
export const filteredTasksAtom = atom<Task[]>((get) => {
  const tasks = get(tasksAtom);
  const selections = useSwimlaneSelectionStore.getState().selections;
  return filterItems(tasks, selections);
});

/** Tasks for a specific board */
export const boardTasksAtomFamily = (boardId: string) =>
  atom<Task[]>((get) => {
    const tasks = get(tasksAtom);
    return tasks.filter((t) => t.boardId === boardId);
  });

/** Tasks grouped by column (for Kanban) */
export const tasksByColumnAtom = atom<Record<string, Task[]>>((get) => {
  const tasks = get(filteredTasksAtom);
  const grouped: Record<string, Task[]> = {};
  for (const task of tasks) {
    if (!grouped[task.columnId]) {
      grouped[task.columnId] = [];
    }
    grouped[task.columnId].push(task);
  }
  return grouped;
});

/** Non-archived tasks */
export const activeTasksAtom = atom<Task[]>((get) => {
  const tasks = get(tasksAtom);
  return tasks.filter((t) => !t.archived);
});

/** Archived tasks */
export const archivedTasksAtom = atom<Task[]>((get) => {
  const tasks = get(tasksAtom);
  return tasks.filter((t) => t.archived === true);
});

/** Tasks with deadlines */
export const deadlineTasksAtom = atom<Task[]>((get) => {
  const tasks = get(tasksAtom);
  return tasks.filter((t) => t.deadline);
});
