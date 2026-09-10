/**
 * Unit tests for src/lib/migration.ts
 *
 * Strategy:
 * - Mock `idb` (openDB), `@/lib/rxdb` (getDatabase), `@/lib/device-id` (getDeviceId)
 * - Mock `indexedDB.databases` on globalThis to control which databases are present
 * - Use jsdom's localStorage directly
 * - SSR branches (typeof window === 'undefined') are not testable in jsdom — skipped
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { STORAGE_KEYS } from '@/lib/constants';

// ── hoisted mocks ─────────────────────────────────────────────────────────────

const mockOpenDB = vi.hoisted(() => vi.fn());
const mockGetDatabase = vi.hoisted(() => vi.fn());
const mockGetDeviceId = vi.hoisted(() => vi.fn().mockReturnValue('test-device-id'));
const mockDatabases = vi.hoisted(() => vi.fn().mockResolvedValue([]));

vi.mock('idb', () => ({ openDB: mockOpenDB }));
vi.mock('@/lib/rxdb', () => ({ getDatabase: mockGetDatabase }));
vi.mock('@/lib/device-id', () => ({ getDeviceId: mockGetDeviceId }));
vi.mock('@/data/boards.json', () => ({
  default: [
    {
      id: 'board-seed-1',
      name: 'Work',
      columns: [{ id: 'c1', title: 'Todo', order: 0 }],
      weekStart: 1,
      swimlanes: [{ id: 'sl-seed-1', name: 'Default', label: null }],
    },
  ],
}));

import {
  checkMigrationNeeded,
  migrateFromOldDB,
  checkSeedBoardsNeeded,
  seedBoardsFromJSON,
} from '../migration';

type MigrationDatabase = Parameters<typeof checkSeedBoardsNeeded>[0];
type SeedDatabase = Parameters<typeof seedBoardsFromJSON>[0];

// ── helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal RxDB collection stub */
function makeCollectionStub(existingItems: unknown[] = []) {
  return {
    find: () => ({ exec: async () => existingItems }),
    insert: vi.fn().mockResolvedValue({}),
  };
}

/** Build a minimal RxDB database stub */
function makeDbStub(boardItems: unknown[] = []) {
  return {
    boards: makeCollectionStub(boardItems),
    swimlanes: makeCollectionStub(),
  };
}

/** Build a minimal fake IDB database with optional store data */
function makeOldDb(storeData: Record<string, unknown[]> = {}) {
  const stores = Object.keys(storeData);
  return {
    objectStoreNames: {
      contains: (name: string) => stores.includes(name),
    },
    getAll: vi.fn().mockImplementation(async (store: string) => storeData[store] ?? []),
    close: vi.fn(),
  };
}

// ── setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();

  // Mock indexedDB.databases so we can control which DBs appear to exist
  Object.defineProperty(globalThis, 'indexedDB', {
    value: { databases: mockDatabases },
    writable: true,
    configurable: true,
  });

  mockDatabases.mockResolvedValue([]);
});

afterEach(() => {
  // Restore fake-indexeddb after each test (setup.ts re-imports it globally)
  // Nothing needed — we only replaced `databases`, the rest of fake-indexeddb
  // is only needed for other test files.
});

// ── checkMigrationNeeded ──────────────────────────────────────────────────────

describe('checkMigrationNeeded', () => {
  it('returns false when migration key is already set in localStorage', async () => {
    localStorage.setItem(STORAGE_KEYS.migration('user1234'), 'true');
    const result = await checkMigrationNeeded('user1234');
    expect(result).toBe(false);
  });

  it('returns false when old database does not exist', async () => {
    mockDatabases.mockResolvedValue([{ name: 'some-other-db' }]);
    const result = await checkMigrationNeeded('user1234');
    expect(result).toBe(false);
  });

  it('returns true when old database exists and migration not yet done', async () => {
    mockDatabases.mockResolvedValue([{ name: 'buobu-poc' }]);
    const result = await checkMigrationNeeded('user1234');
    expect(result).toBe(true);
  });

  it('returns false when another user has migrated but current user has not', async () => {
    localStorage.setItem(STORAGE_KEYS.migration('otherusr0'), 'true');
    mockDatabases.mockResolvedValue([{ name: 'buobu-poc' }]);
    // 'user1234' has NOT migrated
    const result = await checkMigrationNeeded('user1234');
    expect(result).toBe(true);
  });
});

// ── migrateFromOldDB ──────────────────────────────────────────────────────────

describe('migrateFromOldDB', () => {
  it('marks migration complete and returns early when old db does not exist', async () => {
    mockDatabases.mockResolvedValue([]);

    await migrateFromOldDB('user1234');

    expect(localStorage.getItem(STORAGE_KEYS.migration('user1234'))).toBe('true');
    expect(mockOpenDB).not.toHaveBeenCalled();
  });

  it('opens old DB, migrates data, and marks complete on success', async () => {
    mockDatabases.mockResolvedValue([{ name: 'buobu-poc' }]);

    const fakeTask = {
      id: 't1', boardId: 'b1', swimlaneId: 's1', columnId: 'c1',
      title: 'Old task', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const oldDb = makeOldDb({ tasks: [fakeTask] });
    mockOpenDB.mockResolvedValue(oldDb);

    const taskCollection = { insert: vi.fn().mockResolvedValue({}) };
    const newDb = { tasks: taskCollection, backlogs: { insert: vi.fn() }, habits: { insert: vi.fn() }, habitLogs: { insert: vi.fn() } };
    mockGetDatabase.mockResolvedValue(newDb);

    await migrateFromOldDB('user1234');

    expect(mockOpenDB).toHaveBeenCalled();
    expect(taskCollection.insert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1', _deleted: false, _deviceId: 'test-device-id' }),
    );
    expect(oldDb.close).toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEYS.migration('user1234'))).toBe('true');
  });

  it('marks migration complete even when an error occurs (prevents retry loops)', async () => {
    mockDatabases.mockResolvedValue([{ name: 'buobu-poc' }]);
    mockOpenDB.mockRejectedValue(new Error('IDB open failed'));

    await migrateFromOldDB('user1234');

    // Should NOT throw and should still mark complete
    expect(localStorage.getItem(STORAGE_KEYS.migration('user1234'))).toBe('true');
  });
});

// ── checkSeedBoardsNeeded ─────────────────────────────────────────────────────

describe('checkSeedBoardsNeeded', () => {
  it('returns false when boards already exist in the database', async () => {
    const db = makeDbStub([{ id: 'existing-board' }]) as unknown as MigrationDatabase;
    expect(await checkSeedBoardsNeeded(db)).toBe(false);
  });

  it('returns false when seed key is already set in localStorage', async () => {
    localStorage.setItem(STORAGE_KEYS.SEED_BOARDS_COMPLETE, 'true');
    const db = makeDbStub([]) as unknown as MigrationDatabase;
    expect(await checkSeedBoardsNeeded(db)).toBe(false);
  });

  it('returns true when no boards exist and seed has not run', async () => {
    const db = makeDbStub([]) as unknown as MigrationDatabase;
    expect(await checkSeedBoardsNeeded(db)).toBe(true);
  });
});

// ── seedBoardsFromJSON ────────────────────────────────────────────────────────

describe('seedBoardsFromJSON', () => {
  it('skips seeding and sets flag when boards already exist', async () => {
    const insertBoard = vi.fn();
    const db = {
      boards: {
        find: () => ({ exec: async () => [{ id: 'existing' }] }),
        insert: insertBoard,
      },
      swimlanes: { insert: vi.fn() },
    } as unknown as SeedDatabase;

    await seedBoardsFromJSON(db);

    expect(insertBoard).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEYS.SEED_BOARDS_COMPLETE)).toBe('true');
  });

  it('inserts boards and swimlanes from JSON when no boards exist', async () => {
    const insertBoard = vi.fn().mockResolvedValue({});
    const insertSwimlane = vi.fn().mockResolvedValue({});
    const db = {
      boards: {
        find: () => ({ exec: async () => [] }),
        insert: insertBoard,
      },
      swimlanes: { insert: insertSwimlane },
    } as unknown as SeedDatabase;

    await seedBoardsFromJSON(db);

    // The mock JSON has 1 board with 1 swimlane
    expect(insertBoard).toHaveBeenCalledOnce();
    expect(insertBoard).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'board-seed-1', name: 'Work', _deleted: false }),
    );
    expect(insertSwimlane).toHaveBeenCalledOnce();
    expect(insertSwimlane).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sl-seed-1', boardId: 'board-seed-1' }),
    );
    expect(localStorage.getItem(STORAGE_KEYS.SEED_BOARDS_COMPLETE)).toBe('true');
  });

  it('throws when insert fails (does not swallow errors)', async () => {
    const db = {
      boards: {
        find: () => ({ exec: async () => [] }),
        insert: vi.fn().mockRejectedValue(new Error('insert failed')),
      },
      swimlanes: { insert: vi.fn() },
    } as unknown as SeedDatabase;

    await expect(seedBoardsFromJSON(db)).rejects.toThrow('insert failed');
  });
});
