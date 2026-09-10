import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import React from 'react';

vi.mock('@/lib/db', () => ({
  putTask: vi.fn(),
  deleteTask: vi.fn(),
}));
vi.mock('@/stores/hooks/use-rx-subscription', () => ({
  useRxCollectionSubscription: vi.fn(),
  useRxBoardSubscription: vi.fn(),
}));

import {
  useTasks,
  useActiveTasks,
  useArchivedTasks,
  useTasksLoading,
  useTasksSubscription,
  useBoardTasksSubscription,
  taskActions,
} from '../use-tasks';
import { tasksAtom, tasksLoadingAtom } from '../../atoms/tasks';
import { useRxCollectionSubscription, useRxBoardSubscription } from '../use-rx-subscription';
import * as db from '@/lib/db';
import { makeTask } from '@/test/factories';

function makeWrapper(store: ReturnType<typeof createStore>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store }, children);
  };
}

describe('useTasks', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it('returns empty array by default', () => {
    const { result } = renderHook(() => useTasks(), { wrapper: makeWrapper(store) });
    expect(result.current).toEqual([]);
  });

  it('returns all tasks from the atom', () => {
    const tasks = [makeTask(), makeTask()];
    store.set(tasksAtom, tasks);
    const { result } = renderHook(() => useTasks(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(2);
  });
});

describe('useActiveTasks', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it('returns only non-archived tasks', () => {
    const active = makeTask({ archived: false });
    const archived = makeTask({ archived: true });
    store.set(tasksAtom, [active, archived]);

    const { result } = renderHook(() => useActiveTasks(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe(active.id);
  });

  it('returns empty array when all tasks are archived', () => {
    store.set(tasksAtom, [makeTask({ archived: true }), makeTask({ archived: true })]);

    const { result } = renderHook(() => useActiveTasks(), { wrapper: makeWrapper(store) });
    expect(result.current).toEqual([]);
  });

  it('returns all tasks when none are archived', () => {
    const tasks = [makeTask({ archived: false }), makeTask({ archived: false })];
    store.set(tasksAtom, tasks);

    const { result } = renderHook(() => useActiveTasks(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(2);
  });
});

describe('useArchivedTasks', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it('returns only archived tasks', () => {
    const active = makeTask({ archived: false });
    const archived = makeTask({ archived: true });
    store.set(tasksAtom, [active, archived]);

    const { result } = renderHook(() => useArchivedTasks(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe(archived.id);
  });

  it('returns empty array when no tasks are archived', () => {
    store.set(tasksAtom, [makeTask({ archived: false })]);

    const { result } = renderHook(() => useArchivedTasks(), { wrapper: makeWrapper(store) });
    expect(result.current).toEqual([]);
  });
});

describe('useTasksLoading', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it('returns false by default', () => {
    const { result } = renderHook(() => useTasksLoading(), { wrapper: makeWrapper(store) });
    expect(result.current).toBe(false);
  });

  it('returns true when loading atom is set', () => {
    store.set(tasksLoadingAtom, true);
    const { result } = renderHook(() => useTasksLoading(), { wrapper: makeWrapper(store) });
    expect(result.current).toBe(true);
  });
});

describe('useTasksSubscription', () => {
  it('calls useRxCollectionSubscription with "tasks" collection', () => {
    const store = createStore();
    renderHook(() => useTasksSubscription(), { wrapper: makeWrapper(store) });
    expect(useRxCollectionSubscription).toHaveBeenCalledWith(
      'tasks',
      tasksAtom,
      tasksLoadingAtom
    );
  });
});

describe('useBoardTasksSubscription', () => {
  it('calls useRxBoardSubscription with boardId and tasks atoms', () => {
    const store = createStore();
    renderHook(() => useBoardTasksSubscription('board-1'), { wrapper: makeWrapper(store) });
    expect(useRxBoardSubscription).toHaveBeenCalledWith(
      'tasks',
      'board-1',
      tasksAtom,
      tasksLoadingAtom
    );
  });

  it('passes null boardId through to the subscription', () => {
    const store = createStore();
    renderHook(() => useBoardTasksSubscription(null), { wrapper: makeWrapper(store) });
    expect(useRxBoardSubscription).toHaveBeenCalledWith('tasks', null, tasksAtom, tasksLoadingAtom);
  });
});

describe('taskActions', () => {
  it('put references db.putTask', () => {
    expect(taskActions.put).toBe(db.putTask);
  });

  it('delete references db.deleteTask', () => {
    expect(taskActions.delete).toBe(db.deleteTask);
  });
});
