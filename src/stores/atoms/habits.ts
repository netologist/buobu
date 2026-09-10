'use client';

import { atom } from 'jotai';
import type { Habit, HabitLog } from '@/lib/types';
import { useSwimlaneSelectionStore, filterItems } from '../swimlane-selection-store';

// --- Base atoms ---
export const habitsAtom = atom<Habit[]>([]);
export const habitsLoadingAtom = atom<boolean>(false);
export const habitLogsAtom = atom<HabitLog[]>([]);
export const habitLogsLoadingAtom = atom<boolean>(false);

// --- Derived atoms ---

/** Habits filtered by current swimlane selection */
export const filteredHabitsAtom = atom<Habit[]>((get) => {
  const habits = get(habitsAtom);
  const selections = useSwimlaneSelectionStore.getState().selections;
  return filterItems(habits, selections);
});

/** Active (non-archived) habits */
export const activeHabitsAtom = atom<Habit[]>((get) => {
  const habits = get(habitsAtom);
  return habits.filter((h) => !h.archived);
});
export const archivedHabitsAtom = atom<Habit[]>((get) => {
  const habits = get(habitsAtom);
  return habits.filter((h) => h.archived === true);
});

/** Habits for a specific board */
export const boardHabitsAtomFamily = (boardId: string) =>
  atom<Habit[]>((get) => {
    const habits = get(habitsAtom);
    return habits.filter((h) => h.boardId === boardId);
  });

/** Habit logs grouped by habit ID */
export const logsByHabitAtom = atom<Record<string, HabitLog[]>>((get) => {
  const logs = get(habitLogsAtom);
  const grouped: Record<string, HabitLog[]> = {};
  for (const log of logs) {
    if (!grouped[log.habitId]) {
      grouped[log.habitId] = [];
    }
    grouped[log.habitId].push(log);
  }
  return grouped;
});
