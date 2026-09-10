# Data Flow

buobu writes to the local database first and treats the cloud as a replica. This page
follows one mutation from the UI down to IndexedDB, back up through the reactive
subscriptions, and out to Supabase when Cloud Mode sync is active.

## Write Path (Create / Update / Delete)

```
UI event (Zustand store action)
        │
        ▼
src/lib/db.ts helper (putTask, putNote, deleteHabit, …)
        │
        ├─▶ getRepo(userId) ──────▶ src/lib/rxdb-repository.ts
        │        │
        │        ├─ exists? patch()  → bumps _version, _modified, _updatedAt
        │        └─ new?    insert() → stamps BaseEntity metadata
        │
        └─▶ markChanged(userId)
                 ├─ markLocalChange(userId)  → reSync() every replication state
                 └─ queueSync()              → debounced resync (~1.5 s)
```

`src/lib/db.ts` is the thin façade the stores call. Each mutating helper resolves the
repository for the current user, delegates the write, and then calls `markChanged`,
which notifies `src/lib/supabase-replication.ts`.

`src/lib/rxdb-repository.ts` owns the actual document lifecycle:

- **Create** — `insert()` with `_version: 1`, `_createdAt`/`_updatedAt` ISO strings,
  `_modified: Date.now()`, `_deviceId` from `src/lib/device-id.ts`, `user_id` set to the
  current user and `_deleted: false`.
- **Update** — `findOne(id).patch()` with `_version` incremented, `_updatedAt` refreshed
  and `_modified` reset to the current time. `_createdAt` and `user_id` are preserved.
- **Delete** — a soft delete: the document is patched with `_deleted: true`, not removed.
  The tombstone is what carries the deletion to other devices.

Writes never wait for the network. In Local Mode `queueSync()` returns immediately and
no sync state is shown, because there is nowhere to sync to.

## Read Path (Reactive Queries)

```
Component mount
      │
      ▼
useRxBoardSubscription / useRxCollectionSubscription   (src/stores/hooks/use-rx-subscription.ts)
      │
      ▼
collection.find(query).$  ── RxDB observable ──▶ emitted document set
      │
      ▼
toMutableJSON() mapping ──▶ Jotai atom ──▶ React re-render
      │
      ▲
      └── re-emits on every local write and every replicated remote change
```

The subscription hooks take a Mango query and a target Jotai atom:

- `useRxCollectionSubscription(collectionName, atom, loadingAtom)` subscribes with the
  selector `{ _deleted: false }`.
- `useRxBoardSubscription(collectionName, boardId, atom, loadingAtom)` narrows the same
  selector with `boardId` when one is supplied.
- `useRxSubscription(collectionName, query, atom, loadingAtom)` accepts an arbitrary
  Mango query.

Each hook unsubscribes on unmount, and writes the loading flag into the optional atom
when the query errors or is still resolving. One-shot reads still exist in
`src/lib/rxdb-repository.ts` (`find(...).exec()`) for non-UI callers such as migrations
and the upgrade path, but the UI renders from the subscriptions.

## Sync Flow (Cloud Mode)

Sync is RxDB replication, one replication state per collection, created by
`startSupabaseReplication()` in `src/lib/supabase-replication.ts`. Nothing is uploaded as
a JSON snapshot: each document travels as a row in its own Postgres table.

```
                    ┌──────────────────────────────┐
                    │  Local RxDB collection        │
                    └───────────┬──────────────────┘
                                │
        push (dirty docs)       │        pull (checkpointed batch)
                ┌───────────────┴───────────────┐
                ▼                               ▼
     POST /rest/v1/<table>            GET /rest/v1/<table>
     ?on_conflict=id                  ?user_id=eq.<user>
     Prefer: merge-duplicates         &order=_modified.asc,id.asc
     (batch of 100)                   &limit=100 (batch)
                │                               │
                └───────────────┬───────────────┘
                                ▼
                     Supabase Postgres (RLS)
                                │
                                ▼
                Realtime websocket: postgres_changes
                (per table, filtered by user_id)
                                │
                                ▼
                     reSync() on every replication state
```

### Push (client → cloud)

The push handler receives RxDB's dirty document rows in batches of 100. For each row it
stamps `user_id`, `_modified` (if missing) and `_deleted`, then:

1. Fetches the current server rows for the affected ids to compare against.
2. Drops any row whose server `_modified` differs from the assumed master state, and
   returns that server row as a conflict — RxDB's default conflict handler then adopts
   the master state.
3. Upserts the remainder with `POST /rest/v1/<table>?on_conflict=id` and
   `Prefer: resolution=merge-duplicates,return=representation`.

Rows are grouped by their key shape before upsert so that PostgREST receives
consistently shaped batches.

### Pull (cloud → client)

The pull handler issues a `GET` per table:

- `select=*`, `user_id=eq.<user>`, ordered by `_modified.asc,id.asc`, limited to the
  batch size.
- The checkpoint is the `( _modified, id )` pair of the last document received, so the
  next request asks only for rows after it and resumes exactly where the previous batch
  stopped.
- Documents are normalised (`user_id`, `_modified`, `_deleted`) before being handed back
  to RxDB.

### Deletion

`_deleted` is declared as the replication `deletedField`, so a tombstone is pushed and
pulled like any other field. A document deleted on one device arrives on another as a
document with `_deleted: true`, which the reactive subscriptions already exclude.

### Triggers and Scheduling

- A local write calls `markLocalChange()`, which calls `reSync()` on every state
  immediately and reschedules the interval.
- The interval polls at 30 s, shortening to 6 s for 30 s after the last local write.
- A Supabase Realtime websocket joins `realtime:public:<table>` with a
  `postgres_changes` filter of `user_id=eq.<user>` for every replicated table. Any
  change event calls the same resync handler, so remote updates arrive without waiting
  for the next poll.
- `online` events and the manual sync action call `triggerSupabaseResync()`, which
  resyncs every state.

The status reported to the header (`idle`, `syncing`, `ok`, `error`, `paused`) comes from
the replication states' `active$`, `sent$`, `received$` and `error$` streams.

### Entitlement Gate

Replication starts only when the user's entitlement reports `has_sync_access`:

- `src/components/auth/AuthProvider.tsx` refreshes entitlements on login and starts
  replication only when sync is entitled.
- `src/hooks/useSyncGate.ts` handles mid-session changes — a Free → Plus upgrade pushes
  existing local documents once via `activateSync()` and then starts replication; a
  Plus → Free downgrade stops replication and leaves the cloud rows untouched.
- The header indicator can pause and resume replication; while paused, no handlers run.

### Local Mode

In Local Mode (`NEXT_PUBLIC_LOCAL_MODE=true`) this entire section is inert: no Supabase
client, no replication states, no Realtime socket. The header shows a **Local only**
badge instead of a sync status, and clicking it opens the export dialog. See the
[Local Mode decision record](../adr/014-local-mode.md).

## Entity Relationships

```
Board 1──* Swimlane            (Board also owns kanban columns; Swimlane.boardId is optional)
Swimlane 1──* Task             (Task also carries boardId and columnId)
Swimlane 1──* Habit            (Habit also carries boardId)
Habit    1──* HabitLog
Swimlane 1──* Routine          (Routine also carries boardId and columnId)
Routine  1──* RoutineLog       (RoutineLog may reference the Task it generated)
Swimlane 1──* Timeblock
Swimlane 1──* BacklogItem
Swimlane 1──* Note
Swimlane 1──* Bookmark
Swimlane 1──* Mindmap
Swimlane 1──* VisionBoardItem
```

Field-level definitions live in `src/lib/types.ts`; naming and vocabulary are in the
[glossary](../domain/glossary.md).
