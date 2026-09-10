import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import React from 'react';

vi.mock('@/lib/db', () => ({
  putNote: vi.fn(),
  deleteNote: vi.fn(),
}));
vi.mock('@/stores/hooks/use-rx-subscription', () => ({
  useRxCollectionSubscription: vi.fn(),
  useRxBoardSubscription: vi.fn(),
}));

import {
  useNotes,
  useActiveNotes,
  useArchivedNotes,
  usePinnedNotes,
  useNotesSubscription,
  noteActions,
} from '../use-notes';
import { notesAtom, notesLoadingAtom } from '../../atoms/notes';
import { useRxCollectionSubscription } from '../use-rx-subscription';
import * as db from '@/lib/db';
import { makeNote } from '@/test/factories';

function makeWrapper(store: ReturnType<typeof createStore>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store }, children);
  };
}

describe('useNotes', () => {
  let store: ReturnType<typeof createStore>;
  beforeEach(() => { store = createStore(); });

  it('returns empty array by default', () => {
    const { result } = renderHook(() => useNotes(), { wrapper: makeWrapper(store) });
    expect(result.current).toEqual([]);
  });

  it('returns all notes from atom', () => {
    const notes = [makeNote(), makeNote()];
    store.set(notesAtom, notes);
    const { result } = renderHook(() => useNotes(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(2);
  });
});

describe('useActiveNotes', () => {
  let store: ReturnType<typeof createStore>;
  beforeEach(() => { store = createStore(); });

  it('filters out archived notes', () => {
    const active = makeNote({ archived: false });
    const archived = makeNote({ archived: true });
    store.set(notesAtom, [active, archived]);

    const { result } = renderHook(() => useActiveNotes(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe(active.id);
  });
});

describe('useArchivedNotes', () => {
  let store: ReturnType<typeof createStore>;
  beforeEach(() => { store = createStore(); });

  it('returns only archived notes', () => {
    const active = makeNote({ archived: false });
    const archived = makeNote({ archived: true });
    store.set(notesAtom, [active, archived]);

    const { result } = renderHook(() => useArchivedNotes(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe(archived.id);
  });
});

describe('usePinnedNotes', () => {
  let store: ReturnType<typeof createStore>;
  beforeEach(() => { store = createStore(); });

  it('returns only pinned notes', () => {
    const pinned = makeNote({ pinned: true, archived: false });
    const notPinned = makeNote({ pinned: false, archived: false });
    store.set(notesAtom, [pinned, notPinned]);

    const { result } = renderHook(() => usePinnedNotes(), { wrapper: makeWrapper(store) });
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe(pinned.id);
  });

  it('includes archived pinned notes (pinnedNotesAtom does not filter by archive state)', () => {
    const pinnedArchived = makeNote({ pinned: true, archived: true });
    store.set(notesAtom, [pinnedArchived]);

    const { result } = renderHook(() => usePinnedNotes(), { wrapper: makeWrapper(store) });
    // pinnedNotesAtom only filters by pinned=true; archived filtering is a separate concern
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe(pinnedArchived.id);
  });
});

describe('useNotesSubscription', () => {
  it('calls useRxCollectionSubscription with "notes" collection', () => {
    const store = createStore();
    renderHook(() => useNotesSubscription(), { wrapper: makeWrapper(store) });
    expect(useRxCollectionSubscription).toHaveBeenCalledWith('notes', notesAtom, notesLoadingAtom);
  });
});

describe('noteActions', () => {
  it('put references db.putNote', () => {
    expect(noteActions.put).toBe(db.putNote);
  });

  it('delete references db.deleteNote', () => {
    expect(noteActions.delete).toBe(db.deleteNote);
  });
});
