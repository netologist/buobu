import { describe, it, expect, vi } from 'vitest';
import { getUsage, getSwimlanesForBoard } from '../usage';

// ---------------------------------------------------------------------------
// Minimal Database mock — only the collections used by usage.ts.
// Each collection exposes a `count()` method that returns an object with
// `.exec()` returning a Promise<number>.
// ---------------------------------------------------------------------------

function makeCountable(value: number) {
  return { count: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(value) }) };
}

function makeDb(overrides: Partial<Record<string, ReturnType<typeof makeCountable>>> = {}) {
  return {
    boards: makeCountable(0),
    routines: makeCountable(0),
    habits: makeCountable(0),
    bookmarks: makeCountable(0),
    visionItems: makeCountable(0),   // mapped to whiteboards in Usage
    mindmaps: makeCountable(0),
    swimlanes: makeCountable(0),
    ...overrides,
  } as unknown as Parameters<typeof getUsage>[0];
}

// ---------------------------------------------------------------------------
// getUsage
// ---------------------------------------------------------------------------

describe('getUsage', () => {
  it('returns all zero counts when collections are empty', async () => {
    const db = makeDb();
    const usage = await getUsage(db);
    expect(usage).toEqual({
      boards: 0,
      routines: 0,
      habits: 0,
      bookmarks: 0,
      whiteboards: 0,
      mindmaps: 0,
    });
  });

  it('maps boards collection to boards key', async () => {
    const db = makeDb({ boards: makeCountable(3) });
    const usage = await getUsage(db);
    expect(usage.boards).toBe(3);
  });

  it('maps routines collection to routines key', async () => {
    const db = makeDb({ routines: makeCountable(7) });
    const usage = await getUsage(db);
    expect(usage.routines).toBe(7);
  });

  it('maps habits collection to habits key', async () => {
    const db = makeDb({ habits: makeCountable(5) });
    const usage = await getUsage(db);
    expect(usage.habits).toBe(5);
  });

  it('maps bookmarks collection to bookmarks key', async () => {
    const db = makeDb({ bookmarks: makeCountable(42) });
    const usage = await getUsage(db);
    expect(usage.bookmarks).toBe(42);
  });

  it('maps visionItems collection to whiteboards key', async () => {
    const db = makeDb({ visionItems: makeCountable(4) });
    const usage = await getUsage(db);
    expect(usage.whiteboards).toBe(4);
  });

  it('maps mindmaps collection to mindmaps key', async () => {
    const db = makeDb({ mindmaps: makeCountable(9) });
    const usage = await getUsage(db);
    expect(usage.mindmaps).toBe(9);
  });

  it('does not include swimlanesPerBoard in returned object', async () => {
    const db = makeDb();
    const usage = await getUsage(db);
    expect(usage).not.toHaveProperty('swimlanesPerBoard');
  });

  it('queries boards with archived exclusion selector', async () => {
    const boardsCountable = makeCountable(1);
    const db = makeDb({ boards: boardsCountable });
    await getUsage(db);
    expect(boardsCountable.count).toHaveBeenCalledWith({
      selector: { _deleted: false, archived: { $ne: true } },
    });
  });

  it('queries bookmarks with only _deleted selector (no archived field)', async () => {
    const bookmarksCountable = makeCountable(1);
    const db = makeDb({ bookmarks: bookmarksCountable });
    await getUsage(db);
    expect(bookmarksCountable.count).toHaveBeenCalledWith({
      selector: { _deleted: false },
    });
  });

  it('fetches all 6 counts in parallel (all count.exec called once)', async () => {
    const db = makeDb();
    await getUsage(db);
    // Every collection's count().exec() should have been called exactly once.
    for (const col of ['boards', 'routines', 'habits', 'bookmarks', 'visionItems', 'mindmaps'] as const) {
      const mock = (db as unknown as Record<string, ReturnType<typeof makeCountable>>)[col];
      expect(mock.count).toHaveBeenCalledTimes(1);
    }
  });
});

// ---------------------------------------------------------------------------
// getSwimlanesForBoard
// ---------------------------------------------------------------------------

describe('getSwimlanesForBoard', () => {
  it('returns the count for the given boardId', async () => {
    const swimlanesCountable = makeCountable(2);
    const db = makeDb({ swimlanes: swimlanesCountable });
    const result = await getSwimlanesForBoard(db, 'board-123');
    expect(result).toBe(2);
  });

  it('calls count with boardId, _deleted:false, archived exclusion', async () => {
    const swimlanesCountable = makeCountable(0);
    const db = makeDb({ swimlanes: swimlanesCountable });
    await getSwimlanesForBoard(db, 'board-abc');
    expect(swimlanesCountable.count).toHaveBeenCalledWith({
      selector: { boardId: 'board-abc', _deleted: false, archived: { $ne: true } },
    });
  });

  it('returns 0 for an empty board', async () => {
    const db = makeDb({ swimlanes: makeCountable(0) });
    const result = await getSwimlanesForBoard(db, 'empty-board');
    expect(result).toBe(0);
  });
});
