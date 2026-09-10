# Database (RxDB + IndexedDB)

## Overview

The app stores everything in **RxDB**, a reactive local database, running on the **Dexie** IndexedDB storage engine. RxDB is the database itself, not an ORM over one: entities are RxDB documents, and queries subscribe to RxDB's observables.

It runs in both modes. In Local Mode the local database is the only copy; in Cloud Mode the same database is replicated to Postgres (see [Backend](./backend.md)).

## Database Schema

### Collections

Declared in `src/lib/rxdb.ts`:

| Collection | Purpose |
|------------|---------|
| `boards` | Project/workspace containers |
| `swimlanes` | Sub-divisions within boards |
| `tasks` | Kanban tasks |
| `backlogs` | Backlog items |
| `habits` | Habit definitions |
| `habitLogs` | Daily habit entries |
| `routines` | Recurring routine definitions |
| `routineLogs` | Per-day routine outcomes |
| `timeblocks` | Day timeblocks |
| `notes` | Rich text notes |
| `mindmaps` | Mind map documents |
| `visionItems` | Vision board items |
| `bookmarks` | Saved links |
| `changeLog` | Declared record of local changes. Not mapped to a Postgres table, so it is not replicated |
| `syncMeta` | Declared per-user sync metadata. Not mapped to a Postgres table, so it is not replicated |

Thirteen of these are replicated in Cloud Mode: `tasks`, `backlogs`, `habits`, `habitLogs`, `visionItems`, `notes`, `bookmarks`, `mindmaps`, `boards`, `swimlanes`, `routines`, `routineLogs` and `timeblocks`.

### Entity Schema

Every entity is intersected with `Partial<BaseEntity>`:

```typescript
type BaseEntity = {
  user_id: string;      // Owning user
  _modified: number;    // Millisecond timestamp: pull ordering + conflict detection
  _version: number;     // Incremented on each update
  _createdAt: string;   // ISO timestamp
  _updatedAt: string;   // ISO timestamp of the last change
  _deleted: boolean;    // Soft delete flag
  _deviceId: string;    // Browser that made the change
};
```

### Schema Example

The task collection, reduced to its shape (real schema in `src/lib/rxdb.ts`):

```typescript
const taskSchema = {
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
    // ... arrays, dates, priority, archive fields, routineId, time, timeboxMinutes
    _version: { type: 'number' },
    _createdAt: { type: 'string', format: 'date-time' },
    _updatedAt: { type: 'string', format: 'date-time' },
    _modified: { type: 'number', minimum: 0 },
    _deleted: { type: 'boolean' },
    _deviceId: { type: 'string' },
  },
  required: ['id', 'boardId', 'swimlaneId', 'columnId', 'title', '_version', '_createdAt', '_updatedAt', 'user_id', '_modified', '_deleted', '_deviceId'],
  indexes: ['boardId', 'swimlaneId', 'columnId', 'user_id', '_modified'],
  migrationStrategies: {
    1: (oldDoc) => ({ ...oldDoc, routineId: null, time: null }),
    2: (oldDoc) => ({ ...oldDoc, timeboxMinutes: null }),
  },
};
```

## Database Initialization

`src/lib/rxdb.ts` keeps one database instance per user id. The name is derived from the user id, so Local Mode and Cloud Mode can never collide:

```typescript
const DB_NAME_PREFIX = 'buobu-db';

function getDatabaseName(userId: string): string {
  const shortId = userId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
  return `${DB_NAME_PREFIX}-${shortId}`;
}
```

That yields `buobu-db-local` for the Local User and `buobu-db-<account-id>` in Cloud Mode (the account id contributes its first eight alphanumeric characters).

The database is created with the Dexie storage and a cleanup policy that reclaims soft-deleted documents after seven days:

```typescript
const db = await createRxDatabase<Collections>({
  name: getDatabaseName(userId),
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

await db.addCollections({ /* one entry per collection listed above */ });
```

Two RxDB plugins are registered: `RxDBMigrationSchemaPlugin` (schema migrations) and `RxDBCleanupPlugin` (the policy above).

The module also exports `getDatabase(userId)`, `closeDatabase()`, `removeDatabase(userId)`, `getCurrentUserId()` and `isCorruptionError(error)`.

## Query Patterns

### Reactive Reads

RxDB observables are bridged into Jotai atoms by `src/stores/hooks/use-rx-subscription.ts`:

| Hook | Use |
|------|-----|
| `useRxSubscription(collectionName, query, targetAtom, loadingAtom?)` | Subscribe to an arbitrary Mango query |
| `useRxCollectionSubscription(collectionName, targetAtom, loadingAtom?)` | Subscribe to all non-deleted documents in a collection |
| `useRxBoardSubscription(collectionName, boardId, targetAtom, loadingAtom?)` | Subscribe to the documents of one board |

Components read the populated atoms; the underlying store (Zustand) is kept in step by the same bridge.

### Writes

Writes go through the `RxDBRepository` class in `src/lib/rxdb-repository.ts`. Each `putX()` upserts and stamps the base metadata (`_version`, `_createdAt`, `_updatedAt`, `_modified`, `user_id`, `_deleted`, `_deviceId`); each `deleteX()` is a soft delete:

```typescript
async deleteTask(taskId: string): Promise<void> {
  const doc = await this.db.tasks.findOne(taskId).exec();
  if (doc) {
    await doc.patch({
      _deleted: true,
      _updatedAt: new Date().toISOString(),
      _version: (doc.toMutableJSON()._version || 0) + 1,
      _modified: Date.now(),
    });
  }
}
```

Reads that back one-shot flows (`getAllTasks()`, `getTasksByBoard()`, `getHabitsBySwimlane()`, …) live in the same class; reactive UIs use the subscription hooks above.

## Migration

Two layers of migration:

- **RxDB schema migrations** — a collection's schema carries a `version` and a `migrationStrategies` map, one function per version step. The task collection is at version 2: strategy 1 backfills `routineId` and `time`, strategy 2 backfills `timeboxMinutes`.
- **Postgres migrations** — SQL files in `supabase/migrations/`, applied to the Supabase project. They add tables, indexes, RLS policies, RPCs and triggers. See [Backend](./backend.md).

## Storage Location

- **All modes:** IndexedDB, through RxDB's Dexie storage, in a database named after the user id.
- In Local Mode that name is `buobu-db-local`; in Cloud Mode it is `buobu-db-<account-id>`.
- Clearing browser storage removes the data. In Local Mode there is no copy anywhere else — the header offers Export for that reason.

## Related

- [ADR-001: RxDB as Database](../adr/001-rxdb-as-database.md)
- [Architecture: Local-First](../architecture/local-first.md)
