import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import React from 'react';

vi.mock('@/lib/db', () => ({
  putHabit: vi.fn(),
  deleteHabit: vi.fn(),
  putHabitLog: vi.fn(),
  deleteHabitLog: vi.fn(),
}));
vi.mock('@/stores/hooks/use-rx-subscription', () => ({
  useRxCollectionSubscription: vi.fn(),
  useRxBoardSubscription: vi.fn(),
}));

import {
  useHabits,
  useActiveHabits,
  useArchivedHabits,
  useHabitLogs,
  useLogsByHabit,
  useHabitsSubscription,
  useHabitLogsSubscription,
  habitActions,
} from '../use-habits';
import { habitsAtom, habitsLoadingAtom, habitLogsAtom, habitLogsLoadingAtom } from '../../atoms/habits';
import { useRxCollectionSubscription } from '../use-rx-subscription';
import * as db from '@/lib/db';
import { makeHabit, makeHabitLog } from '@/test/factories';

function makeWrapper(store: ReturnType<typeof createStore>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store }, children);
  };
}

describe('useHabits', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => { store = createStore(); });

  it('returns empty array by default', () => {
    const { result } = renderHook(() => useHabits(), { wrapper: makeWrapper(store) });
    expect(result.current).toEqual([]);
  });

  it('returns habits from atom', () => {
    const habits = [makeHabit(), makeHabit()];
    store.set(habitsAtom, habits);
    const { result } = renderHook(() => useHabits(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(2);
  });
});

describe('useActiveHabits', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => { store = createStore(); });

  it('returns only non-archived habits', () => {
    const active = makeHabit({ archived: false });
    const archived = makeHabit({ archived: true });
    store.set(habitsAtom, [active, archived]);

    const { result } = renderHook(() => useActiveHabits(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe(active.id);
  });

  it('returns empty array when all habits are archived', () => {
    store.set(habitsAtom, [makeHabit({ archived: true })]);
    const { result } = renderHook(() => useActiveHabits(), { wrapper: makeWrapper(store) });
    expect(result.current).toEqual([]);
  });
});

describe('useArchivedHabits', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => { store = createStore(); });

  it('returns only archived habits', () => {
    const active = makeHabit({ archived: false });
    const archived = makeHabit({ archived: true });
    store.set(habitsAtom, [active, archived]);

    const { result } = renderHook(() => useArchivedHabits(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe(archived.id);
  });
});

describe('useHabitLogs', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => { store = createStore(); });

  it('returns empty array by default', () => {
    const { result } = renderHook(() => useHabitLogs(), { wrapper: makeWrapper(store) });
    expect(result.current).toEqual([]);
  });

  it('returns logs from atom', () => {
    const logs = [makeHabitLog(), makeHabitLog()];
    store.set(habitLogsAtom, logs);
    const { result } = renderHook(() => useHabitLogs(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(2);
  });
});

describe('useLogsByHabit', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => { store = createStore(); });

  it('returns empty object by default', () => {
    const { result } = renderHook(() => useLogsByHabit(), { wrapper: makeWrapper(store) });
    expect(result.current).toEqual({});
  });

  it('groups logs by habitId', () => {
    const habitA = makeHabit();
    const habitB = makeHabit();
    const logA1 = makeHabitLog({ habitId: habitA.id });
    const logA2 = makeHabitLog({ habitId: habitA.id });
    const logB1 = makeHabitLog({ habitId: habitB.id });

    store.set(habitLogsAtom, [logA1, logA2, logB1]);

    const { result } = renderHook(() => useLogsByHabit(), { wrapper: makeWrapper(store) });
    expect(result.current[habitA.id]).toHaveLength(2);
    expect(result.current[habitB.id]).toHaveLength(1);
  });

  it('each habit ID maps to its own logs', () => {
    const h = makeHabit();
    const log = makeHabitLog({ habitId: h.id });
    store.set(habitLogsAtom, [log]);

    const { result } = renderHook(() => useLogsByHabit(), { wrapper: makeWrapper(store) });
    expect(result.current[h.id][0].id).toBe(log.id);
  });
});

describe('useHabitsSubscription', () => {
  it('calls useRxCollectionSubscription with "habits" collection', () => {
    const store = createStore();
    renderHook(() => useHabitsSubscription(), { wrapper: makeWrapper(store) });
    expect(useRxCollectionSubscription).toHaveBeenCalledWith(
      'habits',
      habitsAtom,
      habitsLoadingAtom
    );
  });
});

describe('useHabitLogsSubscription', () => {
  it('calls useRxCollectionSubscription with "habitLogs" collection', () => {
    const store = createStore();
    renderHook(() => useHabitLogsSubscription(), { wrapper: makeWrapper(store) });
    expect(useRxCollectionSubscription).toHaveBeenCalledWith(
      'habitLogs',
      habitLogsAtom,
      habitLogsLoadingAtom
    );
  });
});

describe('habitActions', () => {
  it('put references db.putHabit', () => {
    expect(habitActions.put).toBe(db.putHabit);
  });

  it('delete references db.deleteHabit', () => {
    expect(habitActions.delete).toBe(db.deleteHabit);
  });

  it('putLog references db.putHabitLog', () => {
    expect(habitActions.putLog).toBe(db.putHabitLog);
  });

  it('deleteLog references db.deleteHabitLog', () => {
    expect(habitActions.deleteLog).toBe(db.deleteHabitLog);
  });
});
