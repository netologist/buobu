import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import React from 'react';

vi.mock('@/lib/db', () => ({
  putBookmark: vi.fn(),
  deleteBookmark: vi.fn(),
}));
vi.mock('@/stores/hooks/use-rx-subscription', () => ({
  useRxCollectionSubscription: vi.fn(),
  useRxBoardSubscription: vi.fn(),
}));

import {
  useBookmarks,
  useActiveBookmarks,
  useArchivedBookmarks,
  usePinnedBookmarks,
  useBookmarksSubscription,
  bookmarkActions,
} from '../use-bookmarks';
import { bookmarksAtom, bookmarksLoadingAtom } from '../../atoms/bookmarks';
import { useRxCollectionSubscription } from '../use-rx-subscription';
import * as db from '@/lib/db';
import { makeBookmark } from '@/test/factories';

function makeWrapper(store: ReturnType<typeof createStore>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store }, children);
  };
}

describe('useBookmarks', () => {
  let store: ReturnType<typeof createStore>;
  beforeEach(() => { store = createStore(); });

  it('returns empty array by default', () => {
    const { result } = renderHook(() => useBookmarks(), { wrapper: makeWrapper(store) });
    expect(result.current).toEqual([]);
  });

  it('returns all bookmarks from atom', () => {
    const bookmarks = [makeBookmark(), makeBookmark()];
    store.set(bookmarksAtom, bookmarks);
    const { result } = renderHook(() => useBookmarks(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(2);
  });
});

describe('useActiveBookmarks', () => {
  let store: ReturnType<typeof createStore>;
  beforeEach(() => { store = createStore(); });

  it('filters out archived bookmarks', () => {
    const active = makeBookmark({ archived: false });
    const archived = makeBookmark({ archived: true });
    store.set(bookmarksAtom, [active, archived]);

    const { result } = renderHook(() => useActiveBookmarks(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe(active.id);
  });
});

describe('useArchivedBookmarks', () => {
  let store: ReturnType<typeof createStore>;
  beforeEach(() => { store = createStore(); });

  it('returns only archived bookmarks', () => {
    const active = makeBookmark({ archived: false });
    const archived = makeBookmark({ archived: true });
    store.set(bookmarksAtom, [active, archived]);

    const { result } = renderHook(() => useArchivedBookmarks(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe(archived.id);
  });
});

describe('usePinnedBookmarks', () => {
  let store: ReturnType<typeof createStore>;
  beforeEach(() => { store = createStore(); });

  it('returns all pinned bookmarks regardless of archived state', () => {
    const pinned = makeBookmark({ pinned: true, archived: false });
    const notPinned = makeBookmark({ pinned: false, archived: false });
    const pinnedArchived = makeBookmark({ pinned: true, archived: true });
    store.set(bookmarksAtom, [pinned, notPinned, pinnedArchived]);

    const { result } = renderHook(() => usePinnedBookmarks(), { wrapper: makeWrapper(store) });
    // pinnedBookmarksAtom filters only by pinned=true; archived filtering is a separate concern
    expect(result.current).toHaveLength(2);
    expect(result.current.map((b) => b.id)).toEqual(
      expect.arrayContaining([pinned.id, pinnedArchived.id])
    );
  });
});

describe('useBookmarksSubscription', () => {
  it('calls useRxCollectionSubscription with "bookmarks" collection', () => {
    const store = createStore();
    renderHook(() => useBookmarksSubscription(), { wrapper: makeWrapper(store) });
    expect(useRxCollectionSubscription).toHaveBeenCalledWith(
      'bookmarks',
      bookmarksAtom,
      bookmarksLoadingAtom
    );
  });
});

describe('bookmarkActions', () => {
  it('put references db.putBookmark', () => {
    expect(bookmarkActions.put).toBe(db.putBookmark);
  });

  it('delete references db.deleteBookmark', () => {
    expect(bookmarkActions.delete).toBe(db.deleteBookmark);
  });
});
