import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Task, BacklogItem, Habit, HabitLog, Board, Swimlane } from './types';
import type { Database } from './rxdb';
import { getDatabase } from './rxdb';
import { getDeviceId } from './device-id';
import { DEFAULT_CURRENCY, STORAGE_KEYS } from '@/lib/constants';
import boardsSeedData from '@/data/boards.json';
import { seedBoardsSchema } from '@/lib/validation/seedData';

const boardsData = seedBoardsSchema.parse(boardsSeedData);

interface KanbanDB extends DBSchema {
  tasks: {
    key: string;
    value: Task;
    indexes: { 'by-board': string };
  };
  backlogs: {
    key: string;
    value: BacklogItem;
    indexes: { 'by-swimlane': string };
  };
  habits: {
    key: string;
    value: Habit;
    indexes: { 'by-board': string; 'by-swimlane': string };
  };
  habitLogs: {
    key: string;
    value: HabitLog;
    indexes: { 'by-habit': string };
  };
}

const OLD_DB_NAME = 'buobu-poc';
const OLD_DB_VERSION = 3;
const isMigrationDebugEnabled = process.env.NODE_ENV !== 'production';

function debugMigration(...args: unknown[]) {
  if (!isMigrationDebugEnabled) return;
  console.info('[migration]', ...args);
}

function debugMigrationWarn(...args: unknown[]) {
  if (!isMigrationDebugEnabled) return;
  console.warn('[migration]', ...args);
}

/**
 * Check if the old shared database exists in IndexedDB
 */
async function oldDatabaseExists(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  // Check if IndexedDB has the old database
  const databases = await indexedDB.databases();
  return databases.some(db => db.name === OLD_DB_NAME);
}

export async function checkMigrationNeeded(userId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  // If migration already completed for this user, no migration needed
  if (localStorage.getItem(STORAGE_KEYS.migration(userId)) === 'true') {
    return false;
  }
  
  // Check if old database actually exists
  return oldDatabaseExists();
}

export async function migrateFromOldDB(userId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  
  // Check if old database exists before attempting migration
  const dbExists = await oldDatabaseExists();
  if (!dbExists) {
    // Mark migration as complete since there's nothing to migrate
    localStorage.setItem(STORAGE_KEYS.migration(userId), 'true');
    debugMigration('No old database found, skipping migration');
    return;
  }
  
  let oldDb: IDBPDatabase<KanbanDB> | null = null;
  
  try {
    oldDb = await openDB<KanbanDB>(OLD_DB_NAME, OLD_DB_VERSION);
    const newDb = await getDatabase(userId);
    
    const deviceId = getDeviceId();
    
    await migrateTasks(oldDb, newDb, deviceId);
    await migrateBacklogs(oldDb, newDb, deviceId);
    await migrateHabits(oldDb, newDb, deviceId);
    await migrateHabitLogs(oldDb, newDb, deviceId);
    
    await oldDb.close();
    oldDb = null;
    
    localStorage.setItem(STORAGE_KEYS.migration(userId), 'true');
    debugMigration('Migration completed successfully');
  } catch (error) {
    // Close database if still open
    if (oldDb) {
      try {
        oldDb.close();
      } catch {
        // Ignore close errors
      }
    }
    
    // Mark migration as complete to prevent retry loops
    // User can manually trigger re-migration if needed
    localStorage.setItem(STORAGE_KEYS.migration(userId), 'true');
    
    console.error('Migration failed, marking as complete to prevent retries:', error);
    // Don't throw - allow the app to continue with empty database
  }
}

/**
 * Safely get all records from an object store, returning empty array if store doesn't exist
 */
async function safeGetAll<T>(db: IDBPDatabase<KanbanDB>, storeName: 'tasks' | 'backlogs' | 'habits' | 'habitLogs'): Promise<T[]> {
  try {
    // Check if the object store exists
    if (!db.objectStoreNames.contains(storeName)) {
      debugMigration(`Object store '${storeName}' not found, skipping`);
      return [];
    }
    return await db.getAll(storeName) as T[];
  } catch (error) {
    debugMigrationWarn(`Failed to get data from '${storeName}':`, error);
    return [];
  }
}

async function migrateTasks(oldDb: IDBPDatabase<KanbanDB>, newDb: Database, deviceId: string): Promise<void> {
  const oldTasks = await safeGetAll<Task>(oldDb, 'tasks');
  
  if (oldTasks.length === 0) {
    debugMigration('No tasks to migrate');
    return;
  }
  
  const taskCollection = newDb.tasks;
  
  for (const task of oldTasks) {
    await taskCollection.insert({
      ...task,
      _version: 1,
      _createdAt: task.createdAt,
      _updatedAt: task.updatedAt,
      _deleted: false,
      _deviceId: deviceId,
    });
  }
  
  debugMigration(`Migrated ${oldTasks.length} tasks`);
}

async function migrateBacklogs(oldDb: IDBPDatabase<KanbanDB>, newDb: Database, deviceId: string): Promise<void> {
  const oldBacklogs = await safeGetAll<BacklogItem>(oldDb, 'backlogs');
  
  if (oldBacklogs.length === 0) {
    debugMigration('No backlogs to migrate');
    return;
  }
  
  const backlogCollection = newDb.backlogs;
  
  for (const backlog of oldBacklogs) {
    const now = new Date().toISOString();
    await backlogCollection.insert({
      ...backlog,
      _version: 1,
      _createdAt: backlog.createdAt,
      _updatedAt: now,
      _deleted: false,
      _deviceId: deviceId,
    });
  }
  
  debugMigration(`Migrated ${oldBacklogs.length} backlogs`);
}

async function migrateHabits(oldDb: IDBPDatabase<KanbanDB>, newDb: Database, deviceId: string): Promise<void> {
  const oldHabits = await safeGetAll<Habit>(oldDb, 'habits');
  
  if (oldHabits.length === 0) {
    debugMigration('No habits to migrate');
    return;
  }
  
  const habitCollection = newDb.habits;
  
  for (const habit of oldHabits) {
    await habitCollection.insert({
      ...habit,
      _version: 1,
      _createdAt: habit.createdAt,
      _updatedAt: habit.updatedAt,
      _deleted: false,
      _deviceId: deviceId,
    });
  }
  
  debugMigration(`Migrated ${oldHabits.length} habits`);
}

async function migrateHabitLogs(oldDb: IDBPDatabase<KanbanDB>, newDb: Database, deviceId: string): Promise<void> {
  const oldLogs = await safeGetAll<HabitLog>(oldDb, 'habitLogs');
  
  if (oldLogs.length === 0) {
    debugMigration('No habit logs to migrate');
    return;
  }
  
  const logCollection = newDb.habitLogs;
  
  for (const log of oldLogs) {
    await logCollection.insert({
      ...log,
      _version: 1,
      _createdAt: log.createdAt,
      _updatedAt: log.updatedAt,
      _deleted: false,
      _deviceId: deviceId,
    });
  }
  
  debugMigration(`Migrated ${oldLogs.length} habit logs`);
}

export async function checkSeedBoardsNeeded(db: Database): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  // Check if boards already exist in the database
  const existingBoards = await db.boards.find({
    selector: { _deleted: false }
  }).exec();
  
  if (existingBoards.length > 0) {
    return false;
  }
  
  return localStorage.getItem(STORAGE_KEYS.SEED_BOARDS_COMPLETE) !== 'true';
}

export async function seedBoardsFromJSON(db: Database): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const deviceId = getDeviceId();

    // Check if boards already exist
    const existingBoards = await db.boards.find({
      selector: { _deleted: false }
    }).exec();

    if (existingBoards.length > 0) {
      debugMigration('Boards already exist, skipping seed');
      localStorage.setItem(STORAGE_KEYS.SEED_BOARDS_COMPLETE, 'true');
      return;
    }

    // Seed boards and swimlanes from JSON
    const now = new Date().toISOString();

    for (const boardData of boardsData) {
      const board: Board = {
        id: boardData.id,
        name: boardData.name,
        columns: boardData.columns,
        weekStart: boardData.weekStart ?? 1,
        createdAt: now,
        updatedAt: now,
        _version: 1,
        _createdAt: now,
        _updatedAt: now,
        _deleted: false,
        _deviceId: deviceId,
      };

      await db.boards.insert(board);
      debugMigration(`Seeded board: ${board.name}`);

        // Seed swimlanes for this board
      for (const swimlaneData of boardData.swimlanes ?? []) {
        const swimlane: Swimlane = {
          id: swimlaneData.id,
          boardId: boardData.id,
          name: swimlaneData.name,
          label: swimlaneData.label ?? undefined,
          currency: swimlaneData.currency ?? DEFAULT_CURRENCY,
          color: swimlaneData.color ?? '#6366F1',
          pomodoroMinutes: swimlaneData.pomodoroMinutes ?? 25,
          breakMinutes: swimlaneData.breakMinutes ?? 5,
          deadline: swimlaneData.deadline ?? undefined,
          createdAt: now,
          updatedAt: now,
          _version: 1,
          _createdAt: now,
          _updatedAt: now,
          _deleted: false,
          _deviceId: deviceId,
        };

        await db.swimlanes.insert(swimlane);
        debugMigration(`Seeded swimlane: ${swimlane.name}`);
      }
    }

    localStorage.setItem(STORAGE_KEYS.SEED_BOARDS_COMPLETE, 'true');
    debugMigration('Boards seed completed successfully');
  } catch (error) {
    console.error('Boards seed failed:', error);
    throw error;
  }
}
