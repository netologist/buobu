/**
 * In-memory RxDB test helper.
 *
 * Uses `fake-indexeddb/auto` (imported in setup.ts) so no real IndexedDB is needed.
 * Each call to `createTestDb()` uses a unique userId, giving each test an isolated,
 * empty database — no cross-test state leakage.
 *
 * Usage:
 *   let db: Database
 *   beforeEach(async () => { db = await createTestDb() })
 *   afterEach(async () => { await destroyTestDb(db) })
 */

import { getDatabase, closeDatabase, type Database } from '@/lib/rxdb';

let _dbCounter = 0;

/**
 * Creates a fresh isolated in-memory RxDB instance for a test.
 * Each call produces a unique user-scoped database.
 */
export async function createTestDb(): Promise<Database> {
  const userId = `test-user-${Date.now()}-${++_dbCounter}`;
  return getDatabase(userId);
}

/**
 * Destroys the database instance after a test.
 * Calls closeDatabase() which is exported from rxdb.ts.
 */
export async function destroyTestDb(db: Database): Promise<void> {
  void db;
  await closeDatabase();
}
