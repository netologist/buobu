import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Mock Zustand stores
const boardStoreState = vi.hoisted(() => ({
  boards: [] as import('@/lib/types').Board[],
  swimlanes: [] as import('@/lib/types').Swimlane[],
  isLoading: false,
  setBoards: vi.fn(),
  setSwimlanes: vi.fn(),
  putBoard: vi.fn(),
  deleteBoard: vi.fn(),
  putSwimlane: vi.fn(),
  deleteSwimlane: vi.fn(),
  loadBoards: vi.fn(),
  reloadSwimlanes: vi.fn(),
}));

vi.mock('@/stores/board-store', () => ({
  useBoardStore: (selector: (s: typeof boardStoreState) => unknown) => selector(boardStoreState),
}));

const selectionState = vi.hoisted(() => ({
  selections: [] as string[],
  isAllSelected: false,
  selectedSwimlaneIds: new Set<string>(),
  selectedBoardIds: new Set<string>(),
  primaryBoardId: null as string | null,
  hasSelections: false,
  isSwimlaneSelected: vi.fn().mockReturnValue(false),
  isBoardSelected: vi.fn().mockReturnValue(false),
  selectAll: vi.fn(),
  selectBoard: vi.fn(),
  toggleSwimlane: vi.fn(),
  clearSelection: vi.fn(),
  getState: () => ({ selections: selectionState.selections }),
}));

vi.mock('@/stores/swimlane-selection-store', () => ({
  useSwimlaneSelectionDerived: () => ({
    selections: selectionState.selections,
    isAllSelected: selectionState.isAllSelected,
    selectedSwimlaneIds: selectionState.selectedSwimlaneIds,
    selectedBoardIds: selectionState.selectedBoardIds,
    primaryBoardId: selectionState.primaryBoardId,
    hasSelections: selectionState.hasSelections,
    isSwimlaneSelected: selectionState.isSwimlaneSelected,
    isBoardSelected: selectionState.isBoardSelected,
  }),
  useSwimlaneSelectionStore: () => ({
    selectAll: selectionState.selectAll,
    selectBoard: selectionState.selectBoard,
    toggleSwimlane: selectionState.toggleSwimlane,
    clearSelection: selectionState.clearSelection,
    selections: selectionState.selections,
  }),
  filterSwimlanes: (swimlanes: import('@/lib/types').Swimlane[]) => swimlanes,
  filterItems: (items: unknown[]) => items,
}));

const archiveFilterState = vi.hoisted(() => ({
  showArchivedItems: false,
  setShowArchivedItems: vi.fn(),
  setLockedBySelection: vi.fn(),
}));

vi.mock('@/stores/archive-filter-store', () => ({
  useArchiveFilterStore: (selector: (s: typeof archiveFilterState) => unknown) =>
    selector(archiveFilterState),
}));

vi.mock('@/stores/db-store', () => ({
  useDbStore: (selector: (s: { db: null }) => unknown) => selector({ db: null }),
}));

vi.mock('@/lib/naming', () => ({
  DEFAULT_NAMING: { task: 'Task', habit: 'Habit', note: 'Note' },
}));

import { useBoards, useBoardsSubscription } from '../use-boards';
import { makeBoard, makeSwimlane } from '@/test/factories';

function makeWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(React.Fragment, null, children);
  };
}

describe('useBoards — data', () => {
  beforeEach(() => {
    boardStoreState.boards = [];
    boardStoreState.swimlanes = [];
    boardStoreState.isLoading = false;
    selectionState.selections = [];
    selectionState.primaryBoardId = null;
  });

  it('returns empty boards and swimlanes by default', () => {
    const { result } = renderHook(() => useBoards(), { wrapper: makeWrapper() });
    expect(result.current.boards).toEqual([]);
    expect(result.current.swimlanes).toEqual([]);
  });

  it('returns boards from store', () => {
    const boards = [makeBoard(), makeBoard()];
    boardStoreState.boards = boards;
    const { result } = renderHook(() => useBoards(), { wrapper: makeWrapper() });
    expect(result.current.boards).toHaveLength(2);
  });

  it('filters active boards (non-archived)', () => {
    const active = makeBoard({ archived: false });
    const archived = makeBoard({ archived: true });
    boardStoreState.boards = [active, archived];
    const { result } = renderHook(() => useBoards(), { wrapper: makeWrapper() });
    expect(result.current.activeBoards).toHaveLength(1);
    expect(result.current.activeBoards[0].id).toBe(active.id);
  });

  it('filters active swimlanes (non-archived)', () => {
    const active = makeSwimlane({ archived: false });
    const archived = makeSwimlane({ archived: true });
    boardStoreState.swimlanes = [active, archived];
    const { result } = renderHook(() => useBoards(), { wrapper: makeWrapper() });
    expect(result.current.activeSwimlanes).toHaveLength(1);
    expect(result.current.activeSwimlanes[0].id).toBe(active.id);
  });

  it('returns isLoading from store', () => {
    boardStoreState.isLoading = true;
    const { result } = renderHook(() => useBoards(), { wrapper: makeWrapper() });
    expect(result.current.isLoading).toBe(true);
  });
});

describe('useBoards — board selection', () => {
  beforeEach(() => {
    boardStoreState.boards = [];
    selectionState.primaryBoardId = null;
  });

  it('returns null board when no boards', () => {
    const { result } = renderHook(() => useBoards(), { wrapper: makeWrapper() });
    expect(result.current.board).toBeNull();
  });

  it('returns first active board when no primary selection', () => {
    const b1 = makeBoard({ archived: false });
    const b2 = makeBoard({ archived: false });
    boardStoreState.boards = [b1, b2];
    selectionState.primaryBoardId = null;
    const { result } = renderHook(() => useBoards(), { wrapper: makeWrapper() });
    expect(result.current.board?.id).toBe(b1.id);
  });

  it('returns board matching primaryBoardId', () => {
    const b1 = makeBoard({ archived: false });
    const b2 = makeBoard({ archived: false });
    boardStoreState.boards = [b1, b2];
    selectionState.primaryBoardId = b2.id;
    const { result } = renderHook(() => useBoards(), { wrapper: makeWrapper() });
    expect(result.current.board?.id).toBe(b2.id);
  });
});

describe('useBoards — actions exposed', () => {
  it('exposes putBoard from store', () => {
    const { result } = renderHook(() => useBoards(), { wrapper: makeWrapper() });
    expect(result.current.putBoard).toBe(boardStoreState.putBoard);
  });

  it('exposes deleteBoard from store', () => {
    const { result } = renderHook(() => useBoards(), { wrapper: makeWrapper() });
    expect(result.current.deleteBoard).toBe(boardStoreState.deleteBoard);
  });

  it('exposes putSwimlane from store', () => {
    const { result } = renderHook(() => useBoards(), { wrapper: makeWrapper() });
    expect(result.current.putSwimlane).toBe(boardStoreState.putSwimlane);
  });

  it('exposes selectAll action', () => {
    const { result } = renderHook(() => useBoards(), { wrapper: makeWrapper() });
    act(() => result.current.selectAll());
    expect(selectionState.selectAll).toHaveBeenCalledOnce();
  });

  it('exposes selectBoard action', () => {
    const { result } = renderHook(() => useBoards(), { wrapper: makeWrapper() });
    act(() => result.current.selectBoard('board-1'));
    expect(selectionState.selectBoard).toHaveBeenCalledWith('board-1');
  });

  it('exposes clearSelection action', () => {
    const { result } = renderHook(() => useBoards(), { wrapper: makeWrapper() });
    act(() => result.current.clearSelection());
    expect(selectionState.clearSelection).toHaveBeenCalledOnce();
  });
});

describe('useBoards — selection state passthrough', () => {
  it('returns selections from selection store', () => {
    selectionState.selections = ['board-1:*'];
    const { result } = renderHook(() => useBoards(), { wrapper: makeWrapper() });
    expect(result.current.selections).toEqual(['board-1:*']);
  });

  it('returns hasSelections from selection store', () => {
    selectionState.hasSelections = true;
    const { result } = renderHook(() => useBoards(), { wrapper: makeWrapper() });
    expect(result.current.hasSelections).toBe(true);
  });
});

describe('useBoardsSubscription', () => {
  it('renders without error when db is null', () => {
    expect(() => {
      renderHook(() => useBoardsSubscription(), { wrapper: makeWrapper() });
    }).not.toThrow();
  });
});
