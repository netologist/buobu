# ADR-001: RxDB as Database

## Status

**Accepted** - 2025-02

## Context

We needed a database solution for a local-first web application that:
- Works offline with full functionality
- Provides reactive queries for real-time UI updates
- Supports sync to cloud storage
- Handles conflict resolution for multi-device use

## Alternatives Considered

### 1. Plain IndexedDB
- **Pros:** Native, no dependencies
- **Cons:** No reactive queries, manual sync logic, no schema validation

### 2. PouchDB
- **Pros:** Built-in CouchDB sync, mature
- **Cons:** Larger bundle size, CouchDB dependency for full sync

### 3. Dexie.js
- **Pros:** Better IndexedDB API, live queries
- **Cons:** No built-in sync, need custom implementation

### 4. RxDB
- **Pros:** Reactive queries, multiple storage adapters, sync plugins, schema validation
- **Cons:** Learning curve, bundle size

## Decision

**Selected: RxDB**

RxDB provides the best combination of:
- Reactive queries (observables)
- Built-in sync capabilities
- Schema validation
- Multiple storage adapters (IndexedDB, SQLite)
- Migration support

## Implementation

The database is created in `src/lib/rxdb.ts`. The name is `buobu-db-local` in
Local Mode (the Local User's identifier is the literal `local`) and
`buobu-db-<account-id>` in Cloud Mode, so a browser that has run both modes
keeps two separate databases.

```typescript
const DB_NAME_PREFIX = 'buobu-db';

function getDatabaseName(userId: string): string {
  const shortId = userId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
  return `${DB_NAME_PREFIX}-${shortId}`;
}

const db = await createRxDatabase({
  name: getDatabaseName(userId),
  storage: getRxStorageDexie(),
  closeDuplicates: true,
});

// Collections with schema
await db.addCollections({
  tasks: { schema: taskSchema },
  habits: { schema: habitSchema },
  // ...
});
```

The storage adapter is `getRxStorageDexie` from `rxdb/plugins/storage-dexie`,
which persists through Dexie to IndexedDB.

## Consequences

### Positive
- Reactive UI without manual state management
- Type-safe queries
- Built-in conflict detection
- Sync could be layered on later without changing the local data model, which
  is what happened: multi-device sync is RxDB replication to Supabase

### Negative
- ~50KB added to bundle
- Requires understanding RxJS observables
- Schema migrations needed for changes

## Related

- [Tech Stack: Database](../tech-stack/database.md)
