import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';
import { activateSync } from '../activate-sync';

// ---------------------------------------------------------------------------
// The global supabase mock is set up in src/test/setup.ts.
// We override `supabase.from` per-test to control upsert responses.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Make a fake RxDB document with toJSON(). */
function makeDoc(data: Record<string, unknown>) {
  return { toJSON: () => data };
}

/** Make a minimal fake RxDB collection. */
function makeCollection(docs: ReturnType<typeof makeDoc>[]) {
  return {
    find: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(docs) }),
  };
}

/** Build a minimal fake Database with the given collections populated. */
function makeDb(
  colOverrides: Partial<Record<string, ReturnType<typeof makeCollection>>> = {},
) {
  const ALL_COLLECTIONS = [
    'boards', 'swimlanes', 'tasks', 'backlogs', 'habits',
    'habitLogs', 'visionItems', 'notes', 'mindmaps',
    'routines', 'routineLogs', 'bookmarks',
  ] as const;

  const collections: Record<string, ReturnType<typeof makeCollection>> = {};
  for (const name of ALL_COLLECTIONS) {
    collections[name] = colOverrides[name] ?? makeCollection([]);
  }

  return { collections } as unknown as Parameters<typeof activateSync>[0];
}

/** Configure supabase.from to resolve upserts without error by default. */
function mockUpsertOk() {
  const upsertMock = vi.fn().mockResolvedValue({ error: null });
  vi.mocked(supabase.from).mockReturnValue({ upsert: upsertMock } as any);
  return upsertMock;
}

/** Configure supabase.from to resolve upserts with an error. */
function mockUpsertError(message: string) {
  const upsertMock = vi.fn().mockResolvedValue({ error: { message } });
  vi.mocked(supabase.from).mockReturnValue({ upsert: upsertMock } as any);
  return upsertMock;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

describe('activateSync — empty DB', () => {
  it('resolves without calling upsert when all collections are empty', async () => {
    const upsertMock = mockUpsertOk();
    const db = makeDb();

    await activateSync(db, 'user-1');

    expect(upsertMock).not.toHaveBeenCalled();
  });
});

describe('activateSync — document push', () => {
  it('upserts documents from the boards collection', async () => {
    const upsertMock = mockUpsertOk();
    const doc = makeDoc({ id: 'board-1', name: 'My Board' });
    const db = makeDb({ boards: makeCollection([doc]) });

    await activateSync(db, 'user-123');

    expect(upsertMock).toHaveBeenCalledWith(
      [{ id: 'board-1', name: 'My Board', user_id: 'user-123' }],
      { onConflict: 'id' },
    );
  });

  it('attaches user_id to every pushed document', async () => {
    const upsertMock = mockUpsertOk();
    const db = makeDb({
      habits: makeCollection([
        makeDoc({ id: 'h1', title: 'Morning run' }),
        makeDoc({ id: 'h2', title: 'Read' }),
      ]),
    });

    await activateSync(db, 'user-abc');

    const calls = upsertMock.mock.calls;
    const allBatches = calls.flatMap(([batch]) => batch as { user_id: string }[]);
    expect(allBatches.every((d) => d.user_id === 'user-abc')).toBe(true);
  });

  it('queries collections with _deleted: false selector', async () => {
    mockUpsertOk();
    const boardsCollection = makeCollection([]);
    const db = makeDb({ boards: boardsCollection });

    await activateSync(db, 'user-1');

    expect(boardsCollection.find).toHaveBeenCalledWith({ selector: { _deleted: false } });
  });

  it('skips collections that are absent from db.collections', async () => {
    const upsertMock = mockUpsertOk();
    // Provide only boards; the rest are missing.
    const db = { collections: { boards: makeCollection([]) } } as unknown as Parameters<typeof activateSync>[0];

    await activateSync(db, 'user-1');

    expect(upsertMock).not.toHaveBeenCalled();
  });
});

describe('activateSync — batching', () => {
  it('splits >50 documents into multiple upsert batches', async () => {
    const upsertMock = mockUpsertOk();
    // 55 documents → should produce 2 batches: 50 + 5
    const docs = Array.from({ length: 55 }, (_, i) => makeDoc({ id: `t-${i}` }));
    const db = makeDb({ tasks: makeCollection(docs) });

    await activateSync(db, 'user-1');

    // Only the tasks collection has docs; expect exactly 2 upsert calls.
    const calls = upsertMock.mock.calls;
    expect(calls).toHaveLength(2);
    expect((calls[0][0] as unknown[]).length).toBe(50);
    expect((calls[1][0] as unknown[]).length).toBe(5);
  });

  it('sends exactly 1 batch when document count equals batch size (50)', async () => {
    const upsertMock = mockUpsertOk();
    const docs = Array.from({ length: 50 }, (_, i) => makeDoc({ id: `r-${i}` }));
    const db = makeDb({ routines: makeCollection(docs) });

    await activateSync(db, 'user-1');

    const calls = upsertMock.mock.calls;
    expect(calls).toHaveLength(1);
    expect((calls[0][0] as unknown[]).length).toBe(50);
  });
});

describe('activateSync — error handling', () => {
  it('throws when an upsert fails, including table and batch index', async () => {
    mockUpsertError('unique_violation');
    const db = makeDb({
      boards: makeCollection([makeDoc({ id: 'b1' })]),
    });

    await expect(activateSync(db, 'user-1')).rejects.toThrow(
      /activateSync.*boards.*batch 0.*unique_violation/i,
    );
  });

  it('does not continue to subsequent tables after a failure', async () => {
    // First upsert call fails; we track how many times from() is called.
    const upsertMock = vi.fn().mockResolvedValueOnce({ error: { message: 'fail' } });
    vi.mocked(supabase.from).mockReturnValue({ upsert: upsertMock } as any);

    // Both boards and habits have docs — only boards should be attempted.
    const db = makeDb({
      boards: makeCollection([makeDoc({ id: 'b1' })]),
      habits: makeCollection([makeDoc({ id: 'hab1' })]),
    });

    await activateSync(db, 'user-1').catch(() => {});

    // upsert was called once and then the loop exited via throw.
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });
});

describe('activateSync — all 12 sync tables', () => {
  const TABLE_NAMES = [
    'boards', 'swimlanes', 'tasks', 'backlogs', 'habits',
    'habit_logs', 'vision_items', 'notes', 'mindmaps',
    'routines', 'routine_logs', 'bookmarks',
  ] as const;

  it('iterates all 12 sync tables', async () => {
    const calledTables: string[] = [];
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      calledTables.push(table);
      return { upsert: vi.fn().mockResolvedValue({ error: null }) } as any;
    });

    const db = makeDb({
      boards:      makeCollection([makeDoc({ id: '1' })]),
      swimlanes:   makeCollection([makeDoc({ id: '2' })]),
      tasks:       makeCollection([makeDoc({ id: '3' })]),
      backlogs:    makeCollection([makeDoc({ id: '4' })]),
      habits:      makeCollection([makeDoc({ id: '5' })]),
      habitLogs:   makeCollection([makeDoc({ id: '6' })]),
      visionItems: makeCollection([makeDoc({ id: '7' })]),
      notes:       makeCollection([makeDoc({ id: '8' })]),
      mindmaps:    makeCollection([makeDoc({ id: '9' })]),
      routines:    makeCollection([makeDoc({ id: '10' })]),
      routineLogs: makeCollection([makeDoc({ id: '11' })]),
      bookmarks:   makeCollection([makeDoc({ id: '12' })]),
    });

    await activateSync(db, 'user-1');

    for (const table of TABLE_NAMES) {
      expect(calledTables).toContain(table);
    }
  });
});
