import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import React from 'react';

vi.mock('@/lib/db', () => ({
  putMindmap: vi.fn(),
  deleteMindmap: vi.fn(),
}));
vi.mock('@/stores/hooks/use-rx-subscription', () => ({
  useRxCollectionSubscription: vi.fn(),
  useRxBoardSubscription: vi.fn(),
}));

import {
  useMindmaps,
  useActiveMindmaps,
  useArchivedMindmaps,
  useMindmapsSubscription,
  useBoardMindmapsSubscription,
  mindmapActions,
} from '../use-mindmaps';
import { mindmapsAtom, mindmapsLoadingAtom } from '../../atoms/mindmaps';
import { useRxCollectionSubscription, useRxBoardSubscription } from '../use-rx-subscription';
import * as db from '@/lib/db';
import { makeMindmap } from '@/test/factories';

function makeWrapper(store: ReturnType<typeof createStore>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store }, children);
  };
}

describe('useMindmaps', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => { store = createStore(); });

  it('returns empty array by default', () => {
    const { result } = renderHook(() => useMindmaps(), { wrapper: makeWrapper(store) });
    expect(result.current).toEqual([]);
  });

  it('returns mindmaps from atom', () => {
    const mindmaps = [makeMindmap(), makeMindmap()];
    store.set(mindmapsAtom, mindmaps);
    const { result } = renderHook(() => useMindmaps(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(2);
  });

  it('returns all mindmaps including archived', () => {
    const active = makeMindmap({ archived: false });
    const archived = makeMindmap({ archived: true });
    store.set(mindmapsAtom, [active, archived]);
    const { result } = renderHook(() => useMindmaps(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(2);
  });
});

describe('useActiveMindmaps', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => { store = createStore(); });

  it('returns only non-archived mindmaps', () => {
    const active = makeMindmap({ archived: false });
    const archived = makeMindmap({ archived: true });
    store.set(mindmapsAtom, [active, archived]);

    const { result } = renderHook(() => useActiveMindmaps(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe(active.id);
  });

  it('returns empty array when all mindmaps are archived', () => {
    store.set(mindmapsAtom, [makeMindmap({ archived: true })]);
    const { result } = renderHook(() => useActiveMindmaps(), { wrapper: makeWrapper(store) });
    expect(result.current).toEqual([]);
  });

  it('returns all mindmaps when none are archived', () => {
    const mindmaps = [makeMindmap({ archived: false }), makeMindmap({ archived: false })];
    store.set(mindmapsAtom, mindmaps);
    const { result } = renderHook(() => useActiveMindmaps(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(2);
  });
});

describe('useArchivedMindmaps', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => { store = createStore(); });

  it('returns only archived mindmaps', () => {
    const active = makeMindmap({ archived: false });
    const archived = makeMindmap({ archived: true });
    store.set(mindmapsAtom, [active, archived]);

    const { result } = renderHook(() => useArchivedMindmaps(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe(archived.id);
  });

  it('returns empty array when no mindmaps are archived', () => {
    store.set(mindmapsAtom, [makeMindmap({ archived: false })]);
    const { result } = renderHook(() => useArchivedMindmaps(), { wrapper: makeWrapper(store) });
    expect(result.current).toEqual([]);
  });
});

describe('useMindmapsSubscription', () => {
  it('calls useRxCollectionSubscription with "mindmaps" collection', () => {
    const store = createStore();
    renderHook(() => useMindmapsSubscription(), { wrapper: makeWrapper(store) });
    expect(useRxCollectionSubscription).toHaveBeenCalledWith(
      'mindmaps',
      mindmapsAtom,
      mindmapsLoadingAtom
    );
  });
});

describe('useBoardMindmapsSubscription', () => {
  it('calls useRxBoardSubscription with boardId and mindmaps atoms', () => {
    const store = createStore();
    renderHook(() => useBoardMindmapsSubscription('board-1'), { wrapper: makeWrapper(store) });
    expect(useRxBoardSubscription).toHaveBeenCalledWith(
      'mindmaps',
      'board-1',
      mindmapsAtom,
      mindmapsLoadingAtom
    );
  });

  it('passes null boardId through to the subscription', () => {
    const store = createStore();
    renderHook(() => useBoardMindmapsSubscription(null), { wrapper: makeWrapper(store) });
    expect(useRxBoardSubscription).toHaveBeenCalledWith('mindmaps', null, mindmapsAtom, mindmapsLoadingAtom);
  });
});

describe('mindmapActions', () => {
  it('put references db.putMindmap', () => {
    expect(mindmapActions.put).toBe(db.putMindmap);
  });

  it('delete references db.deleteMindmap', () => {
    expect(mindmapActions.delete).toBe(db.deleteMindmap);
  });
});
