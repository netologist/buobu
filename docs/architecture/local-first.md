# Local-First Strategy

## Philosophy

buobu follows the [local-first software](https://www.inkandswitch.com/local-first/)
principles:

1. **The local copy is the working copy** — every read and write hits the in-browser
   database first. Network availability never blocks a mutation.
2. **Works offline** — the application is fully functional without a connection.
3. **The user owns the data** — data lives in this browser, and can be exported to a
   single file at any time.
4. **Cloud is optional** — remote sync is a separately entitled feature, not a
   requirement. In Local Mode no backend exists at all.

## Implementation

### Storage Layer

```
┌─────────────────────────────────────────────┐
│  RxDB (reactive database, not an ORM)       │
│  • Mango queries exposed as observables     │
│  • JSON-schema validation per collection    │
│  • Migration + cleanup plugins              │
│  • Replication plugin (Cloud Mode only)     │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  Dexie storage adapter (getRxStorageDexie)  │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  IndexedDB                                  │
│  • Persistent, server-free storage          │
│  • Subject to the browser's storage quota   │
└─────────────────────────────────────────────┘
```

One database is created per user (`src/lib/rxdb.ts`); the Local User gets
`buobu-db-local`, and a signed-in Cloud Mode user gets a database named after their
account id. Collections cover tasks, backlogs, habits, habit logs, boards, swimlanes,
vision items, notes, bookmarks, mindmaps, routines, routine logs and timeblocks, plus
the internal `changeLog` and `syncMeta` collections.

### Reactive Data

RxDB queries are observables. `src/stores/hooks/use-rx-subscription.ts` bridges them
into Jotai atoms: it subscribes to a Mango query, maps each emitted document set through
`toMutableJSON()`, and writes it into the target atom. Any change — a local mutation, a
replicated remote document, an import — re-emits and the subscribed components re-render.

```typescript
// Subscribe to every non-deleted document in a collection
useRxCollectionSubscription('tasks', tasksAtom, tasksLoadingAtom);

// Or narrow the query to one board
useRxBoardSubscription('tasks', boardId, tasksAtom, tasksLoadingAtom);
```

For an arbitrary selector, `useRxSubscription(collectionName, query, atom, loadingAtom)`
takes the raw Mango query. Stores use these hooks as their read path; the repository in
`src/lib/rxdb-repository.ts` is the write path.

### Entity Metadata

Every entity type intersects `Partial<BaseEntity>` (`src/lib/types.ts`), so documents
carry replication and lifecycle metadata:

```typescript
type BaseEntity = {
  user_id: string;     // owner; stamped on write and on replication
  _modified: number;   // ms timestamp; replication ordering + checkpoint key
  _version: number;    // incremented on every write
  _createdAt: string;  // ISO timestamp
  _updatedAt: string;  // ISO timestamp of the last write
  _deleted: boolean;   // soft-delete tombstone
  _deviceId: string;   // browser/device that produced the write
};
```

**Soft delete.** Deleting an entity does not remove the row: the repository patches it
with `_deleted: true`, bumps `_version` and refreshes `_updatedAt`/`_modified`. Readers
filter on `_deleted: false`, and the tombstone is what propagates the deletion to other
devices through replication.

### Sync Strategy

Sync runs as **RxDB replication** per collection, configured in
`src/lib/supabase-replication.ts`. There is no export/upload pipeline and no
single-file snapshot.

| Aspect | Behaviour |
|--------|-----------|
| Transport | RxDB's replication plugin over PostgREST (`/rest/v1/<table>`), authenticated with the Supabase session token |
| Push | Batch of 100 documents upserted with `on_conflict=id` and `Prefer: resolution=merge-duplicates` |
| Pull | Batched `GET` filtered by `user_id=eq.<user>`, ordered by `_modified` then `id`, resumed from a stored checkpoint |
| Deletes | The `_deleted` field is the replication `deletedField`; tombstones are replicated like any other document |
| Live updates | A Supabase Realtime websocket subscribes to `postgres_changes` for every replicated table filtered by `user_id`; any event triggers a resync |
| Scheduling | A resync every 30 s, shortened to 6 s for 30 s after a local write; local writes also debounce a resync (~1.5 s) through `queueSync()` |
| Conflicts | The push handler compares the server row's `_modified` against the assumed master state; on a mismatch the server row is returned as a conflict, and RxDB's default conflict handler adopts the master state |

Because push and pull use per-table checkpoints, a device only transfers documents it
has not seen. The same replication runs for every table listed in `COLLECTION_TABLES`.

**Entitlement gate.** Replication only starts when the signed-in user's entitlement
carries `has_sync_access`. `AuthProvider` checks entitlements before starting
replication on login, and `useSyncGate` reacts to mid-session changes: an upgrade pushes
existing local data once (`activateSync`) and then starts replication, while a downgrade
stops replication and leaves the cloud rows in place. The header exposes pause/resume
and the current status.

### Local Mode

When `NEXT_PUBLIC_LOCAL_MODE=true`, **nothing is synced at all**. There is no Supabase
client, no replication, no Realtime socket and no entitlements lookups — the database is
this browser and nothing else. The header replaces the sync indicator with a permanent
**Local only** badge; clicking it opens the export dialog, because exporting a file is
the only way to keep a copy. Mode is resolved at build time, so switching modes means
rebuilding. See the [Local Mode decision record](../adr/014-local-mode.md).

## Benefits

| Aspect | Server-first app | buobu |
|--------|------------------|-------|
| Offline | Limited or none | Full functionality |
| Read/write latency | Network round-trip | Local IndexedDB |
| Data ownership | Server holds the data | Browser holds the data; export is built in |
| Backend required | Yes | No in Local Mode |

## Trade-offs

1. **First sync on a new device** — the local database starts empty and the initial pull
   has to transfer everything.
2. **Storage quotas** — data lives in IndexedDB, so the browser's storage limits apply.
3. **No backup in Local Mode** — clearing browser storage, switching profiles or using a
   private window loses the data unless it was exported.
4. **No real-time collaboration** — replication is per-user; simultaneous multi-user
   editing of one document is not supported.
