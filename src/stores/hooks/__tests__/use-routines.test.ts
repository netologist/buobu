import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import React from 'react';

vi.mock('@/lib/db', () => ({
  putRoutine: vi.fn(),
  archiveRoutine: vi.fn(),
  deleteRoutine: vi.fn(),
  putRoutineLog: vi.fn(),
}));
vi.mock('@/stores/hooks/use-rx-subscription', () => ({
  useRxCollectionSubscription: vi.fn(),
}));

import {
  useRoutines,
  useActiveRoutines,
  useArchivedRoutines,
  useDueRoutines,
  useApprovalRequiredRoutines,
  useAutoProcessRoutines,
  useLogsByRoutine,
  useRoutinesSubscription,
  useRoutineLogsSubscription,
  routineActions,
} from '../use-routines';
import { routinesAtom, routinesLoadingAtom, routineLogsAtom, routineLogsLoadingAtom } from '../../atoms/routines';
import { useRxCollectionSubscription } from '../use-rx-subscription';
import * as db from '@/lib/db';
import { makeRoutine, makeRoutineLog } from '@/test/factories';

function makeWrapper(store: ReturnType<typeof createStore>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store }, children);
  };
}

describe('useRoutines', () => {
  let store: ReturnType<typeof createStore>;
  beforeEach(() => { store = createStore(); });

  it('returns empty array by default', () => {
    const { result } = renderHook(() => useRoutines(), { wrapper: makeWrapper(store) });
    expect(result.current).toEqual([]);
  });

  it('returns all routines from atom', () => {
    const routines = [makeRoutine(), makeRoutine()];
    store.set(routinesAtom, routines);
    const { result } = renderHook(() => useRoutines(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(2);
  });
});

describe('useActiveRoutines', () => {
  let store: ReturnType<typeof createStore>;
  beforeEach(() => { store = createStore(); });

  it('returns only non-archived routines', () => {
    const active = makeRoutine({ archived: false });
    const archived = makeRoutine({ archived: true });
    store.set(routinesAtom, [active, archived]);

    const { result } = renderHook(() => useActiveRoutines(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe(active.id);
  });
});

describe('useArchivedRoutines', () => {
  let store: ReturnType<typeof createStore>;
  beforeEach(() => { store = createStore(); });

  it('returns only archived routines', () => {
    const active = makeRoutine({ archived: false });
    const archived = makeRoutine({ archived: true });
    store.set(routinesAtom, [active, archived]);

    const { result } = renderHook(() => useArchivedRoutines(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe(archived.id);
  });
});

describe('useDueRoutines', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 26)); // March 26, 2026 → today = '2026-03-26'
    store = createStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns active routines with nextDueDate <= today', () => {
    const overdue = makeRoutine({ archived: false, nextDueDate: '2026-03-25' });
    const dueToday = makeRoutine({ archived: false, nextDueDate: '2026-03-26' });
    const future = makeRoutine({ archived: false, nextDueDate: '2026-03-27' });
    const noDate = makeRoutine({ archived: false, nextDueDate: undefined });
    store.set(routinesAtom, [overdue, dueToday, future, noDate]);

    const { result } = renderHook(() => useDueRoutines(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(2);
    expect(result.current.map((r) => r.id)).toEqual(
      expect.arrayContaining([overdue.id, dueToday.id])
    );
  });

  it('excludes archived routines even if due', () => {
    const archived = makeRoutine({ archived: true, nextDueDate: '2026-03-25' });
    store.set(routinesAtom, [archived]);

    const { result } = renderHook(() => useDueRoutines(), { wrapper: makeWrapper(store) });
    expect(result.current).toEqual([]);
  });

  it('returns empty when no routines are due', () => {
    store.set(routinesAtom, [makeRoutine({ archived: false, nextDueDate: '2026-03-27' })]);
    const { result } = renderHook(() => useDueRoutines(), { wrapper: makeWrapper(store) });
    expect(result.current).toEqual([]);
  });
});

describe('useApprovalRequiredRoutines', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 26));
    store = createStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns due routines of type "task" or "event"', () => {
    const taskRoutine = makeRoutine({ archived: false, nextDueDate: '2026-03-26', type: 'task' });
    const eventRoutine = makeRoutine({ archived: false, nextDueDate: '2026-03-26', type: 'event' });
    const paymentRoutine = makeRoutine({ archived: false, nextDueDate: '2026-03-26', type: 'payment' });
    store.set(routinesAtom, [taskRoutine, eventRoutine, paymentRoutine]);

    const { result } = renderHook(() => useApprovalRequiredRoutines(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(2);
    expect(result.current.map((r) => r.type)).toEqual(
      expect.arrayContaining(['task', 'event'])
    );
  });
});

describe('useAutoProcessRoutines', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 26));
    store = createStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns only due payment routines', () => {
    const payment = makeRoutine({ archived: false, nextDueDate: '2026-03-26', type: 'payment' });
    const task = makeRoutine({ archived: false, nextDueDate: '2026-03-26', type: 'task' });
    store.set(routinesAtom, [payment, task]);

    const { result } = renderHook(() => useAutoProcessRoutines(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe(payment.id);
  });
});

describe('useLogsByRoutine', () => {
  let store: ReturnType<typeof createStore>;
  beforeEach(() => { store = createStore(); });

  it('returns empty object by default', () => {
    const { result } = renderHook(() => useLogsByRoutine(), { wrapper: makeWrapper(store) });
    expect(result.current).toEqual({});
  });

  it('groups logs by routineId', () => {
    const r1 = makeRoutine();
    const r2 = makeRoutine();
    const log1 = makeRoutineLog({ routineId: r1.id });
    const log2 = makeRoutineLog({ routineId: r1.id });
    const log3 = makeRoutineLog({ routineId: r2.id });
    store.set(routineLogsAtom, [log1, log2, log3]);

    const { result } = renderHook(() => useLogsByRoutine(), { wrapper: makeWrapper(store) });
    expect(result.current[r1.id]).toHaveLength(2);
    expect(result.current[r2.id]).toHaveLength(1);
  });
});

describe('useRoutinesSubscription', () => {
  it('calls useRxCollectionSubscription with "routines" collection', () => {
    const store = createStore();
    renderHook(() => useRoutinesSubscription(), { wrapper: makeWrapper(store) });
    expect(useRxCollectionSubscription).toHaveBeenCalledWith(
      'routines',
      routinesAtom,
      routinesLoadingAtom
    );
  });
});

describe('useRoutineLogsSubscription', () => {
  it('calls useRxCollectionSubscription with "routineLogs" collection', () => {
    const store = createStore();
    renderHook(() => useRoutineLogsSubscription(), { wrapper: makeWrapper(store) });
    expect(useRxCollectionSubscription).toHaveBeenCalledWith(
      'routineLogs',
      routineLogsAtom,
      routineLogsLoadingAtom
    );
  });
});

describe('routineActions', () => {
  it('put references db.putRoutine', () => {
    expect(routineActions.put).toBe(db.putRoutine);
  });

  it('archive references db.archiveRoutine', () => {
    expect(routineActions.archive).toBe(db.archiveRoutine);
  });

  it('delete references db.deleteRoutine', () => {
    expect(routineActions.delete).toBe(db.deleteRoutine);
  });

  it('putLog references db.putRoutineLog', () => {
    expect(routineActions.putLog).toBe(db.putRoutineLog);
  });
});
