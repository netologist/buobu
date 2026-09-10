import { createRxDatabase, type RxDatabase, type RxCollection, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBCleanupPlugin } from 'rxdb/plugins/cleanup';

addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBCleanupPlugin);
import type { Task, BacklogItem, Habit, HabitLog, ChangeLog, VisionBoardItem, Note, Mindmap, Board, Swimlane, SyncMeta, Bookmark, Routine, RoutineLog, Timeblock } from './types';

export type Collections = {
  tasks: RxCollection<Task>;
  backlogs: RxCollection<BacklogItem>;
  habits: RxCollection<Habit>;
  habitLogs: RxCollection<HabitLog>;
  changeLog: RxCollection<ChangeLog>;
  visionItems: RxCollection<VisionBoardItem>;
  notes: RxCollection<Note>;
  bookmarks: RxCollection<Bookmark>;
  mindmaps: RxCollection<Mindmap>;
  boards: RxCollection<Board>;
  swimlanes: RxCollection<Swimlane>;
  syncMeta: RxCollection<SyncMeta>;
  routines: RxCollection<Routine>;
  routineLogs: RxCollection<RoutineLog>;
  timeblocks: RxCollection<Timeblock>;
};

export type Database = RxDatabase<Collections>;

const DB_NAME_PREFIX = 'buobu-db';

let dbInstance: Database | null = null;
let dbPromise: Promise<Database> | null = null;
let currentUserId: string | null = null;
let initializationLock: Promise<void> | null = null;

function getDatabaseName(userId: string): string {
  const shortId = userId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
  return `${DB_NAME_PREFIX}-${shortId}`;
}

export async function getDatabase(userId: string): Promise<Database> {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('Valid userId is required to access database. userId must be a non-empty string.');
  }
  
  if (initializationLock) {
    await initializationLock;
  }
  
  if (dbInstance && currentUserId === userId) {
    return dbInstance;
  }
  
  let releaseLock: (() => void) | undefined;
  initializationLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  
  try {
    if (dbInstance && currentUserId !== userId) {
      await closeDatabase();
    }
    
    if (dbPromise && currentUserId === userId) {
      return dbPromise;
    }

    currentUserId = userId;
  dbPromise = (async () => {
    try {
      const dbName = getDatabaseName(userId);
      const db = await createRxDatabase<Collections>({
        name: dbName,
        storage: getRxStorageDexie(),
        closeDuplicates: true,
        cleanupPolicy: {
          minimumDeletedTime: 1000 * 60 * 60 * 24 * 7,
          minimumCollectionAge: 1000 * 60 * 60,
          runEach: 1000 * 60 * 60,
          awaitReplicationsInSync: true,
          waitForLeadership: true,
        },
      });

      dbInstance = db;

      if (db.collections && Object.keys(db.collections).length > 0) {
        return db;
      }

      await db.addCollections({
        tasks: {
          schema: {
            version: 2,
            primaryKey: 'id',
            type: 'object',
            properties: {
              id: { type: 'string', maxLength: 100 },
              user_id: { type: 'string' },
              boardId: { type: 'string' },
              swimlaneId: { type: 'string' },
              columnId: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              labels: { type: 'array', items: { type: 'string' } },
              comments: { type: 'array', items: { type: 'object' } },
              checklists: { type: 'array', items: { type: 'object' } },
              transactions: { type: 'array', items: { type: 'object' } },
              worklogs: { type: 'array', items: { type: 'object' } },
              pomodoros: { type: 'number' },
              order: { type: 'number' },
              date: { type: ['string', 'null'] },
              deadline: { type: ['string', 'null'] },
              priority: { type: ['string', 'null'], enum: ['low', 'medium', 'high'] },
              archived: { type: 'boolean' },
              archivedAt: { type: ['string', 'null'] },
              completedAt: { type: ['string', 'null'] },
              routineId: { type: ['string', 'null'] },
              time: { type: ['string', 'null'] },
              timeboxMinutes: { type: ['number', 'null'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              _version: { type: 'number' },
              _createdAt: { type: 'string', format: 'date-time' },
              _updatedAt: { type: 'string', format: 'date-time' },
              _modified: { type: 'number', minimum: 0 },
              _deleted: { type: 'boolean' },
              _deviceId: { type: 'string' },
            },
            required: ['id', 'boardId', 'swimlaneId', 'columnId', 'title', '_version', '_createdAt', '_updatedAt', 'user_id', '_modified', '_deleted', '_deviceId'],
            indexes: ['boardId', 'swimlaneId', 'columnId', 'user_id', '_modified'],
          },
          migrationStrategies: {
            1: (oldDoc: Record<string, unknown>) => ({ ...oldDoc, routineId: null, time: null }),
            2: (oldDoc: Record<string, unknown>) => ({ ...oldDoc, timeboxMinutes: null }),
          },
        },
        backlogs: {
          schema: {
            version: 1,
            primaryKey: 'id',
            type: 'object',
            properties: {
              id: { type: 'string', maxLength: 100 },
              user_id: { type: 'string' },
              swimlaneId: { type: 'string' },
              text: { type: 'string' },
              archived: { type: 'boolean' },
              archivedAt: { type: ['string', 'null'] },
              createdAt: { type: 'string', format: 'date-time' },
              _version: { type: 'number' },
              _createdAt: { type: 'string', format: 'date-time' },
              _updatedAt: { type: 'string', format: 'date-time' },
              _modified: { type: 'number', minimum: 0 },
              _deleted: { type: 'boolean' },
              _deviceId: { type: 'string' },
            },
            required: ['id', 'swimlaneId', 'text', '_version', '_createdAt', '_updatedAt', 'user_id', '_modified', '_deleted', '_deviceId'],
            indexes: ['swimlaneId', 'user_id', '_modified'],
          },
          migrationStrategies: {
            1: (oldDoc: Record<string, unknown>) => ({ ...oldDoc, archived: false, archivedAt: null }),
          },
        },
        habits: {
          schema: {
            version: 3,
            primaryKey: 'id',
            type: 'object',
            properties: {
              id: { type: 'string', maxLength: 100 },
              user_id: { type: 'string' },
              boardId: { type: 'string' },
              swimlaneId: { type: 'string' },
              title: { type: 'string' },
              color: { type: 'string' },
              order: { type: 'number' },
              breakHabit: { type: 'boolean' },
              frequencyDays: { type: 'array', items: { type: 'number' } },
              timeblockId: { type: ['string', 'null'] },
              sourceType: { type: ['string', 'null'], enum: ['timeblock', null] },
              sourceTimeblockId: { type: ['string', 'null'] },
              archived: { type: 'boolean' },
              archivedAt: { type: ['string', 'null'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              _version: { type: 'number' },
              _createdAt: { type: 'string', format: 'date-time' },
              _updatedAt: { type: 'string', format: 'date-time' },
              _modified: { type: 'number', minimum: 0 },
              _deleted: { type: 'boolean' },
              _deviceId: { type: 'string' },
            },
            required: ['id', 'boardId', 'swimlaneId', 'title', '_version', '_createdAt', '_updatedAt', 'user_id', '_modified', '_deleted', '_deviceId'],
            indexes: ['boardId', 'swimlaneId', 'user_id', '_modified'],
          },
          migrationStrategies: {
            1: (oldDoc: Record<string, unknown>) => ({ ...oldDoc, archivedAt: null }),
            2: (oldDoc: Record<string, unknown>) => ({ ...oldDoc, timeblockId: null }),
            3: (oldDoc: Record<string, unknown>) => ({ ...oldDoc, sourceType: null, sourceTimeblockId: null }),
          },
        },
        habitLogs: {
          schema: {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
              id: { type: 'string', maxLength: 100 },
              user_id: { type: 'string' },
              habitId: { type: 'string' },
              date: { type: 'string', format: 'date-time' },
              value: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              _version: { type: 'number' },
              _createdAt: { type: 'string', format: 'date-time' },
              _updatedAt: { type: 'string', format: 'date-time' },
              _modified: { type: 'number', minimum: 0 },
              _deleted: { type: 'boolean' },
              _deviceId: { type: 'string' },
            },
            required: ['id', 'habitId', 'date', 'value', '_version', '_createdAt', '_updatedAt', 'user_id', '_modified', '_deleted', '_deviceId'],
            indexes: ['habitId', 'date', 'user_id', '_modified'],
          },
        },
        changeLog: {
          schema: {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
              id: { type: 'string', maxLength: 100 },
              user_id: { type: 'string' },
              entityType: { type: 'string', enum: ['task', 'habit', 'habitLog', 'backlog'] },
              entityId: { type: 'string' },
              operation: { type: 'string', enum: ['create', 'update', 'delete'] },
              payload: { type: 'object' },
              timestamp: { type: 'string', format: 'date-time' },
              vectorClock: { type: 'object' },
              synced: { type: 'boolean' },
              syncTarget: { type: ['string', 'null'], enum: ['google-drive', 'icloud', 'dropbox', null] },
              _modified: { type: 'number', minimum: 0 },
              _deleted: { type: 'boolean' },
            },
            required: ['id', 'user_id', 'entityType', 'entityId', 'operation', 'timestamp', 'vectorClock', 'synced', '_modified', '_deleted'],
            indexes: ['entityType', 'entityId', 'synced', 'timestamp', 'user_id', '_modified'],
          },
        },
        visionItems: {
          schema: {
            version: 1,
            primaryKey: 'id',
            type: 'object',
            properties: {
              id: { type: 'string', maxLength: 100 },
              user_id: { type: 'string' },
              boardId: { type: 'string' },
              swimlaneId: { type: 'string' },
              title: { type: 'string' },
              content: { type: 'string' },
              excalidrawData: { type: 'string' },
              archived: { type: 'boolean' },
              archivedAt: { type: ['string', 'null'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              _version: { type: 'number' },
              _createdAt: { type: 'string', format: 'date-time' },
              _updatedAt: { type: 'string', format: 'date-time' },
              _modified: { type: 'number', minimum: 0 },
              _deleted: { type: 'boolean' },
              _deviceId: { type: 'string' },
            },
            required: ['id', 'boardId', 'swimlaneId', 'title', '_version', '_createdAt', '_updatedAt', 'user_id', '_modified', '_deleted', '_deviceId'],
            indexes: ['boardId', 'swimlaneId', 'user_id', '_modified'],
          },
          migrationStrategies: {
            1: (oldDoc: Record<string, unknown>) => ({ ...oldDoc, archived: false, archivedAt: null }),
          },
        },
        notes: {
          schema: {
            version: 1,
            primaryKey: 'id',
            type: 'object',
            properties: {
              id: { type: 'string', maxLength: 100 },
              user_id: { type: 'string' },
              boardId: { type: 'string' },
              swimlaneId: { type: 'string' },
              title: { type: 'string' },
              content: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              references: { type: 'array', items: { type: 'string' } },
              pinned: { type: 'boolean' },
              archived: { type: 'boolean' },
              archivedAt: { type: ['string', 'null'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              _version: { type: 'number' },
              _createdAt: { type: 'string', format: 'date-time' },
              _updatedAt: { type: 'string', format: 'date-time' },
              _modified: { type: 'number', minimum: 0 },
              _deleted: { type: 'boolean' },
              _deviceId: { type: 'string' },
            },
            required: ['id', 'boardId', 'swimlaneId', 'title', 'content', '_version', '_createdAt', '_updatedAt', 'user_id', '_modified', '_deleted', '_deviceId'],
            indexes: ['boardId', 'swimlaneId', 'user_id', '_modified'],
          },
          migrationStrategies: {
            1: (oldDoc: Record<string, unknown>) => ({ ...oldDoc, archivedAt: null }),
          },
        },
        bookmarks: {
          schema: {
            version: 1,
            primaryKey: 'id',
            type: 'object',
            properties: {
              id: { type: 'string', maxLength: 100 },
              user_id: { type: 'string' },
              boardId: { type: 'string' },
              swimlaneId: { type: 'string' },
              url: { type: 'string' },
              urlNormalized: { type: 'string' },
              domain: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              previewImage: { type: 'string' },
              favicon: { type: 'string' },
              siteName: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              comments: { type: 'array', items: { type: 'object' } },
              links: { type: 'array', items: { type: 'object' } },
              status: { type: 'string', enum: ['unread', 'reading', 'important', 'archived', 'favorite'] },
              rating: { type: 'number' },
              pinned: { type: 'boolean' },
              archived: { type: 'boolean' },
              archivedAt: { type: ['string', 'null'] },
              metadataFetchStatus: { type: 'string', enum: ['pending', 'success', 'failed', 'timeout'] },
              metadataLastFetchedAt: { type: 'string', format: 'date-time' },
              isBroken: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              _version: { type: 'number' },
              _createdAt: { type: 'string', format: 'date-time' },
              _updatedAt: { type: 'string', format: 'date-time' },
              _modified: { type: 'number', minimum: 0 },
              _deleted: { type: 'boolean' },
              _deviceId: { type: 'string' },
            },
            required: [
              'id',
              'boardId',
              'swimlaneId',
              'url',
              'urlNormalized',
              'domain',
              'title',
              'description',
              'tags',
              'comments',
              'links',
              'status',
              '_version',
              '_createdAt',
              '_updatedAt',
              'user_id',
              '_modified',
              '_deleted',
              '_deviceId',
            ],
            indexes: ['boardId', 'swimlaneId', 'status', 'user_id', '_modified'],
          },
          migrationStrategies: {
            1: (oldDoc: Record<string, unknown>) => ({ ...oldDoc, archivedAt: null }),
          },
        },
        mindmaps: {
          schema: {
            version: 1,
            primaryKey: 'id',
            type: 'object',
            properties: {
              id: { type: 'string', maxLength: 100 },
              user_id: { type: 'string' },
              boardId: { type: 'string' },
              swimlaneId: { type: 'string' },
              title: { type: 'string' },
              nodes: { type: 'array', items: { type: 'object' } },
              archived: { type: 'boolean' },
              archivedAt: { type: ['string', 'null'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              _version: { type: 'number' },
              _createdAt: { type: 'string', format: 'date-time' },
              _updatedAt: { type: 'string', format: 'date-time' },
              _modified: { type: 'number', minimum: 0 },
              _deleted: { type: 'boolean' },
              _deviceId: { type: 'string' },
            },
            required: ['id', 'boardId', 'swimlaneId', 'title', '_version', '_createdAt', '_updatedAt', 'user_id', '_modified', '_deleted', '_deviceId'],
            indexes: ['boardId', 'swimlaneId', 'user_id', '_modified'],
          },
          migrationStrategies: {
            1: (oldDoc: Record<string, unknown>) => ({ ...oldDoc, archivedAt: null }),
          },
        },
        boards: {
          schema: {
            version: 4,
            primaryKey: 'id',
            type: 'object',
            properties: {
              id: { type: 'string', maxLength: 100 },
              user_id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              columns: { type: 'array', items: { type: 'object' } },
              order: { type: 'number' },
              weekStart: { type: 'number' },
              archiveColumnId: { type: 'string' },
              showArchiveColumn: { type: 'boolean' },
              archived: { type: 'boolean' },
              archivedAt: { type: ['string', 'null'] },
              naming: {
                type: 'object',
                properties: {
                  board: { type: 'string' },
                  boardPlural: { type: 'string' },
                  swimlane: { type: 'string' },
                  swimlanePlural: { type: 'string' },
                },
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              _version: { type: 'number' },
              _createdAt: { type: 'string', format: 'date-time' },
              _updatedAt: { type: 'string', format: 'date-time' },
              _modified: { type: 'number', minimum: 0 },
              _deleted: { type: 'boolean' },
              _deviceId: { type: 'string' },
            },
            required: ['id', 'name', 'columns', '_version', '_createdAt', '_updatedAt', 'user_id', '_modified', '_deleted', '_deviceId'],
            indexes: ['user_id', '_modified'],
          },
          migrationStrategies: {
            1: (oldDoc: Record<string, unknown>) => oldDoc,
            2: (oldDoc: Record<string, unknown>) => ({ ...oldDoc, archived: false, archivedAt: null }),
            3: (oldDoc: Record<string, unknown>) => ({ ...oldDoc, order: 9999 }),
            4: (oldDoc: Record<string, unknown>) => ({ ...oldDoc, description: '' }),
          },
        },
        swimlanes: {
          schema: {
            version: 3,
            primaryKey: 'id',
            type: 'object',
            properties: {
              id: { type: 'string', maxLength: 100 },
              user_id: { type: 'string' },
              boardId: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              label: { type: 'string' },
              currency: { type: 'string' },
              color: { type: 'string' },
              durationHours: { type: 'number' },
              pomodoroMinutes: { type: 'number' },
              breakMinutes: { type: 'number' },
              deadline: { type: 'string' },
              order: { type: 'number' },
              archived: { type: 'boolean' },
              archivedAt: { type: ['string', 'null'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              _version: { type: 'number' },
              _createdAt: { type: 'string', format: 'date-time' },
              _updatedAt: { type: 'string', format: 'date-time' },
              _modified: { type: 'number', minimum: 0 },
              _deleted: { type: 'boolean' },
              _deviceId: { type: 'string' },
            },
            required: ['id', 'boardId', 'name', 'currency', '_version', '_createdAt', '_updatedAt', 'user_id', '_modified', '_deleted', '_deviceId'],
            indexes: ['boardId', 'user_id', '_modified'],
          },
          migrationStrategies: {
            1: (oldDoc: Record<string, unknown>) => ({ ...oldDoc, archived: false, archivedAt: null }),
            2: (oldDoc: Record<string, unknown> & { _createdAt?: string }) => ({ ...oldDoc, order: typeof oldDoc._createdAt === 'string' ? new Date(oldDoc._createdAt).getTime() : 0 }),
            3: (oldDoc: Record<string, unknown>) => ({ ...oldDoc, description: '' }),
          },
        },
        syncMeta: {
          schema: {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
              id: { type: 'string', maxLength: 100 },
              user_id: { type: 'string' },
              lastSyncAt: { type: 'string' },
              lastLocalChangeAt: { type: 'string' },
              updatedAt: { type: 'string', format: 'date-time' },
              _modified: { type: 'number', minimum: 0 },
              _deleted: { type: 'boolean' },
            },
            required: ['id', 'user_id', '_modified', '_deleted'],
            indexes: ['user_id', '_modified'],
          },
        },
        routines: {
          schema: {
            version: 1,
            primaryKey: 'id',
            type: 'object',
            properties: {
              id: { type: 'string', maxLength: 100 },
              user_id: { type: 'string' },
              boardId: { type: 'string' },
              swimlaneId: { type: 'string' },
              columnId: { type: 'string' },
              title: { type: 'string' },
              description: { type: ['string', 'null'] },
              type: { type: 'string', enum: ['task', 'event', 'payment'] },
              recurrence: { type: 'object' },
              timeblockId: { type: ['string', 'null'] },
              lastGeneratedAt: { type: ['string', 'null'] },
              nextDueDate: { type: ['string', 'null'] },
              eventTime: { type: ['string', 'null'] },
              paymentAmount: { type: ['number', 'null'] },
              paymentCurrency: { type: ['string', 'null'] },
              paymentType: { type: ['string', 'null'], enum: ['income', 'expense', null] },
              paymentNote: { type: ['string', 'null'] },
              order: { type: 'number' },
              archived: { type: 'boolean' },
              archivedAt: { type: ['string', 'null'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              _version: { type: 'number' },
              _createdAt: { type: 'string', format: 'date-time' },
              _updatedAt: { type: 'string', format: 'date-time' },
              _modified: { type: 'number', minimum: 0 },
              _deleted: { type: 'boolean' },
              _deviceId: { type: 'string' },
            },
            required: ['id', 'boardId', 'swimlaneId', 'columnId', 'title', 'type', 'recurrence', '_version', '_createdAt', '_updatedAt', 'user_id', '_modified', '_deleted', '_deviceId'],
            indexes: ['boardId', 'swimlaneId', 'user_id', '_modified'],
          },
          migrationStrategies: {
            1: (oldDoc: Record<string, unknown>) => ({ ...oldDoc, timeblockId: null }),
          },
        },
        routineLogs: {
          schema: {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
              id: { type: 'string', maxLength: 100 },
              user_id: { type: 'string' },
              routineId: { type: 'string' },
              date: { type: 'string' },
              status: { type: 'string', enum: ['approved', 'skipped', 'auto-processed'] },
              taskId: { type: ['string', 'null'] },
              createdAt: { type: 'string', format: 'date-time' },
              _version: { type: 'number' },
              _createdAt: { type: 'string', format: 'date-time' },
              _updatedAt: { type: 'string', format: 'date-time' },
              _modified: { type: 'number', minimum: 0 },
              _deleted: { type: 'boolean' },
              _deviceId: { type: 'string' },
            },
            required: ['id', 'routineId', 'date', 'status', '_version', '_createdAt', '_updatedAt', 'user_id', '_modified', '_deleted', '_deviceId'],
            indexes: ['routineId', 'date', 'user_id', '_modified'],
          },
        },
        timeblocks: {
          schema: {
            version: 1,
            primaryKey: 'id',
            type: 'object',
            properties: {
              id: { type: 'string', maxLength: 100 },
              user_id: { type: 'string' },
              boardId: { type: 'string' },
              swimlaneId: { type: 'string' },
              title: { type: 'string' },
              description: { type: ['string', 'null'] },
              color: { type: 'string' },
              startTime: { type: 'string' },
              endTime: { type: 'string' },
              recurrence: { type: 'object' },
              showAsHabit: { type: 'boolean' },
              order: { type: 'number' },
              archived: { type: 'boolean' },
              archivedAt: { type: ['string', 'null'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              _version: { type: 'number' },
              _createdAt: { type: 'string', format: 'date-time' },
              _updatedAt: { type: 'string', format: 'date-time' },
              _modified: { type: 'number', minimum: 0 },
              _deleted: { type: 'boolean' },
              _deviceId: { type: 'string' },
            },
            required: ['id', 'boardId', 'swimlaneId', 'title', 'startTime', 'endTime', 'recurrence', '_version', '_createdAt', '_updatedAt', 'user_id', '_modified', '_deleted', '_deviceId'],
            indexes: ['boardId', 'swimlaneId', 'user_id', '_modified'],
          },
          migrationStrategies: {
            1: (oldDoc: Record<string, unknown>) => ({ ...oldDoc, showAsHabit: false }),
          },
        },
      });

      dbPromise = null;
      return db;
    } catch (error) {
      console.error(`Failed to create database for user ${userId}:`, error);
      dbPromise = null;
      dbInstance = null;
      currentUserId = null;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Database initialization failed for user ${userId}: ${errorMessage}`);
    }
  })();

  try {
    dbInstance = await dbPromise;
    return dbInstance;
  } catch (error) {
    dbPromise = null;
    dbInstance = null;
    currentUserId = null;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get database for user ${userId}: ${errorMessage}`);
  } finally {
    dbPromise = null;
  }
  } finally {
    if (releaseLock) {
      releaseLock();
    }
    initializationLock = null;
  }
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    const userId = currentUserId;
    try {
      await dbInstance.close();
    } catch (error) {
      console.error(`Error closing database for user ${userId}:`, error);
    } finally {
      dbInstance = null;
      dbPromise = null;
      currentUserId = null;
    }
  }
}

export async function removeDatabase(userId: string): Promise<void> {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('Valid userId is required to remove database. userId must be a non-empty string.');
  }
  
  if (currentUserId === userId) {
    await closeDatabase();
  }
  
  const dbName = getDatabaseName(userId);
  try {
    const db = await createRxDatabase<Collections>({
      name: dbName,
      storage: getRxStorageDexie(),
    });
    await db.remove();
  } catch (error) {
    console.error(`Failed to remove database for user ${userId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Database removal failed for user ${userId} (database: ${dbName}): ${errorMessage}`);
  }
}

export function getCurrentUserId(): string | null {
  return currentUserId;
}

export function isCorruptionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const message = error.message.toLowerCase();
  const corruptionIndicators = [
    'database is corrupted',
    'indexeddb error',
    'quota exceeded',
    'data error',
    'invalid state',
    'not found',
    'version error',
    'constraint error',
    'dataclone error',
  ];
  
  return corruptionIndicators.some(indicator => message.includes(indicator));
}
