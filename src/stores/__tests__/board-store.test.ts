import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBoardStore } from '../board-store';
import { makeBoard, makeSwimlane } from '@/test/factories';

vi.mock('@/lib/db', () => ({
  getAllBoards: vi.fn().mockResolvedValue([]),
  getSwimlanesByBoard: vi.fn().mockResolvedValue([]),
  putBoard: vi.fn().mockResolvedValue(undefined),
  deleteBoard: vi.fn().mockResolvedValue(undefined),
  putSwimlane: vi.fn().mockResolvedValue(undefined),
  deleteSwimlane: vi.fn().mockResolvedValue(undefined),
  archiveBoard: vi.fn().mockResolvedValue(undefined),
  unarchiveBoard: vi.fn().mockResolvedValue(undefined),
  archiveSwimlane: vi.fn().mockResolvedValue(undefined),
  unarchiveSwimlane: vi.fn().mockResolvedValue(undefined),
  permanentDeleteBoard: vi.fn().mockResolvedValue(undefined),
  permanentDeleteSwimlane: vi.fn().mockResolvedValue(undefined),
}));

import * as db from '@/lib/db';
const mockDb = vi.mocked(db);

function resetStore() {
  useBoardStore.setState({
    boards: [],
    swimlanes: [],
    isLoading: true,
    _unsubscribers: [],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetStore();
  mockDb.getAllBoards.mockResolvedValue([]);
  mockDb.getSwimlanesByBoard.mockResolvedValue([]);
});

// ── loadBoards ────────────────────────────────────────────────────────────────

describe('loadBoards', () => {
  it('fetches boards and swimlanes, updates state', async () => {
    const b1 = makeBoard({ id: 'b1' });
    const s1 = makeSwimlane({ id: 's1', boardId: 'b1' });
    mockDb.getAllBoards.mockResolvedValue([b1]);
    mockDb.getSwimlanesByBoard.mockResolvedValue([s1]);

    await useBoardStore.getState().loadBoards();

    expect(useBoardStore.getState().boards).toEqual([b1]);
    expect(useBoardStore.getState().swimlanes).toEqual([s1]);
    expect(useBoardStore.getState().isLoading).toBe(false);
  });

  it('loads swimlanes for each board', async () => {
    const b1 = makeBoard({ id: 'b1' });
    const b2 = makeBoard({ id: 'b2' });
    mockDb.getAllBoards.mockResolvedValue([b1, b2]);
    mockDb.getSwimlanesByBoard
      .mockResolvedValueOnce([makeSwimlane({ boardId: 'b1' })])
      .mockResolvedValueOnce([makeSwimlane({ boardId: 'b2' })]);

    await useBoardStore.getState().loadBoards();

    expect(mockDb.getSwimlanesByBoard).toHaveBeenCalledTimes(2);
    expect(useBoardStore.getState().swimlanes).toHaveLength(2);
  });

  it('sets isLoading false even when fetch fails', async () => {
    mockDb.getAllBoards.mockRejectedValue(new Error('DB error'));

    await useBoardStore.getState().loadBoards();

    expect(useBoardStore.getState().isLoading).toBe(false);
    expect(useBoardStore.getState().boards).toEqual([]);
  });
});

// ── putBoard ──────────────────────────────────────────────────────────────────

describe('putBoard', () => {
  it('calls db.putBoard and reloads boards', async () => {
    const b1 = makeBoard({ id: 'b1', name: 'Updated' });
    mockDb.getAllBoards.mockResolvedValue([b1]);

    await useBoardStore.getState().putBoard({ id: 'b1', name: 'Updated' });

    expect(mockDb.putBoard).toHaveBeenCalledWith({ id: 'b1', name: 'Updated' });
    expect(useBoardStore.getState().boards).toEqual([b1]);
  });
});

// ── deleteBoard ───────────────────────────────────────────────────────────────

describe('deleteBoard', () => {
  it('calls db.deleteBoard and reloads boards', async () => {
    await useBoardStore.getState().deleteBoard('b1');

    expect(mockDb.deleteBoard).toHaveBeenCalledWith('b1');
    expect(mockDb.getAllBoards).toHaveBeenCalled();
  });
});

// ── putSwimlane ───────────────────────────────────────────────────────────────

describe('putSwimlane', () => {
  it('calls db.putSwimlane and reloads swimlanes', async () => {
    const b1 = makeBoard({ id: 'b1' });
    useBoardStore.setState({ boards: [b1] });
    const s1 = makeSwimlane({ id: 's1', boardId: 'b1' });
    mockDb.putSwimlane.mockResolvedValue(s1);
    mockDb.getSwimlanesByBoard.mockResolvedValue([s1]);

    await useBoardStore.getState().putSwimlane({ id: 's1', boardId: 'b1' });

    expect(mockDb.putSwimlane).toHaveBeenCalledWith({ id: 's1', boardId: 'b1' });
    expect(useBoardStore.getState().swimlanes).toEqual([s1]);
  });
});

// ── deleteSwimlane ────────────────────────────────────────────────────────────

describe('deleteSwimlane', () => {
  it('calls db.deleteSwimlane then reloads swimlanes for each board in state', async () => {
    const b1 = makeBoard({ id: 'b1' });
    useBoardStore.setState({ boards: [b1] });
    mockDb.getSwimlanesByBoard.mockResolvedValue([]);

    await useBoardStore.getState().deleteSwimlane('s1');

    expect(mockDb.deleteSwimlane).toHaveBeenCalledWith('s1');
    expect(mockDb.getSwimlanesByBoard).toHaveBeenCalledWith('b1');
  });
});

// ── archiveBoard / unarchiveBoard ─────────────────────────────────────────────

describe('archiveBoard', () => {
  it('calls db.archiveBoard and reloads boards', async () => {
    await useBoardStore.getState().archiveBoard('b1');

    expect(mockDb.archiveBoard).toHaveBeenCalledWith('b1');
    expect(mockDb.getAllBoards).toHaveBeenCalled();
  });
});

describe('unarchiveBoard', () => {
  it('calls db.unarchiveBoard and reloads boards', async () => {
    await useBoardStore.getState().unarchiveBoard('b1');

    expect(mockDb.unarchiveBoard).toHaveBeenCalledWith('b1');
    expect(mockDb.getAllBoards).toHaveBeenCalled();
  });
});

// ── archiveSwimlane / unarchiveSwimlane ───────────────────────────────────────

describe('archiveSwimlane', () => {
  it('calls db.archiveSwimlane then reloads swimlanes for each board in state', async () => {
    const b1 = makeBoard({ id: 'b1' });
    useBoardStore.setState({ boards: [b1] });
    mockDb.getSwimlanesByBoard.mockResolvedValue([]);

    await useBoardStore.getState().archiveSwimlane('s1');

    expect(mockDb.archiveSwimlane).toHaveBeenCalledWith('s1');
    expect(mockDb.getSwimlanesByBoard).toHaveBeenCalledWith('b1');
  });
});

describe('unarchiveSwimlane', () => {
  it('calls db.unarchiveSwimlane then reloads swimlanes for each board in state', async () => {
    const b1 = makeBoard({ id: 'b1' });
    useBoardStore.setState({ boards: [b1] });
    mockDb.getSwimlanesByBoard.mockResolvedValue([]);

    await useBoardStore.getState().unarchiveSwimlane('s1');

    expect(mockDb.unarchiveSwimlane).toHaveBeenCalledWith('s1');
    expect(mockDb.getSwimlanesByBoard).toHaveBeenCalledWith('b1');
  });
});

// ── permanentDelete ───────────────────────────────────────────────────────────

describe('permanentDeleteBoard', () => {
  it('calls db.permanentDeleteBoard and reloads boards', async () => {
    await useBoardStore.getState().permanentDeleteBoard('b1');

    expect(mockDb.permanentDeleteBoard).toHaveBeenCalledWith('b1');
    expect(mockDb.getAllBoards).toHaveBeenCalled();
  });
});

describe('permanentDeleteSwimlane', () => {
  it('calls db.permanentDeleteSwimlane then reloads swimlanes for each board in state', async () => {
    const b1 = makeBoard({ id: 'b1' });
    useBoardStore.setState({ boards: [b1] });
    mockDb.getSwimlanesByBoard.mockResolvedValue([]);

    await useBoardStore.getState().permanentDeleteSwimlane('s1');

    expect(mockDb.permanentDeleteSwimlane).toHaveBeenCalledWith('s1');
    expect(mockDb.getSwimlanesByBoard).toHaveBeenCalledWith('b1');
  });
});

// ── reorderBoards ─────────────────────────────────────────────────────────────

describe('reorderBoards', () => {
  it('optimistically reorders boards and persists each new order index', async () => {
    const b1 = makeBoard({ id: 'b1', order: 0 });
    const b2 = makeBoard({ id: 'b2', order: 1 });
    useBoardStore.setState({ boards: [b1, b2] });

    await useBoardStore.getState().reorderBoards(['b2', 'b1']);

    const state = useBoardStore.getState();
    expect(state.boards[0].id).toBe('b2');
    expect(state.boards[1].id).toBe('b1');
    expect(mockDb.putBoard).toHaveBeenCalledWith({ id: 'b2', order: 0 });
    expect(mockDb.putBoard).toHaveBeenCalledWith({ id: 'b1', order: 1 });
  });

  it('preserves boards not in orderedIds at the end', async () => {
    const b1 = makeBoard({ id: 'b1' });
    const b2 = makeBoard({ id: 'b2' });
    const archived = makeBoard({ id: 'b-archived' });
    useBoardStore.setState({ boards: [b1, b2, archived] });

    await useBoardStore.getState().reorderBoards(['b2', 'b1']);

    const ids = useBoardStore.getState().boards.map(b => b.id);
    expect(ids).toEqual(['b2', 'b1', 'b-archived']);
  });
});

// ── reorderSwimlanes ──────────────────────────────────────────────────────────

describe('reorderSwimlanes', () => {
  it('optimistically reorders swimlanes and persists order', async () => {
    const s1 = makeSwimlane({ id: 's1', order: 0 });
    const s2 = makeSwimlane({ id: 's2', order: 1 });
    useBoardStore.setState({ swimlanes: [s1, s2] });

    await useBoardStore.getState().reorderSwimlanes(['s2', 's1']);

    const state = useBoardStore.getState();
    expect(state.swimlanes[0].id).toBe('s2');
    expect(state.swimlanes[1].id).toBe('s1');
    expect(mockDb.putSwimlane).toHaveBeenCalledWith({ id: 's2', order: 0 });
    expect(mockDb.putSwimlane).toHaveBeenCalledWith({ id: 's1', order: 1 });
  });
});

// ── reorderColumns ────────────────────────────────────────────────────────────

describe('reorderColumns', () => {
  it('optimistically reorders columns in local state and persists via putBoard', async () => {
    const col1 = { id: 'c1', title: 'Todo', order: 0 };
    const col2 = { id: 'c2', title: 'Done', order: 1 };
    const b1 = makeBoard({ id: 'b1', columns: [col1, col2] });
    useBoardStore.setState({ boards: [b1] });

    await useBoardStore.getState().reorderColumns('b1', ['c2', 'c1']);

    const updated = useBoardStore.getState().boards.find(b => b.id === 'b1')!;
    expect(updated.columns[0].id).toBe('c2');
    expect(updated.columns[1].id).toBe('c1');
    expect(mockDb.putBoard).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'b1', columns: [col2, col1] }),
    );
  });
});

// ── setBoards / setSwimlanes / cleanup ────────────────────────────────────────

describe('setBoards', () => {
  it('replaces boards in state', () => {
    const boards = [makeBoard(), makeBoard()];
    useBoardStore.getState().setBoards(boards);
    expect(useBoardStore.getState().boards).toEqual(boards);
  });
});

describe('setSwimlanes', () => {
  it('replaces swimlanes in state', () => {
    const swimlanes = [makeSwimlane(), makeSwimlane()];
    useBoardStore.getState().setSwimlanes(swimlanes);
    expect(useBoardStore.getState().swimlanes).toEqual(swimlanes);
  });
});

describe('cleanup', () => {
  it('calls each unsubscriber and clears state', () => {
    const unsub1 = vi.fn();
    const unsub2 = vi.fn();
    useBoardStore.setState({
      _unsubscribers: [unsub1, unsub2],
      boards: [makeBoard()],
      swimlanes: [makeSwimlane()],
    });

    useBoardStore.getState().cleanup();

    expect(unsub1).toHaveBeenCalledOnce();
    expect(unsub2).toHaveBeenCalledOnce();
    expect(useBoardStore.getState()._unsubscribers).toEqual([]);
    expect(useBoardStore.getState().boards).toEqual([]);
    expect(useBoardStore.getState().swimlanes).toEqual([]);
  });
});
