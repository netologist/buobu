# TD-003: Unused RxDB Collections Bloat and RxDB v17 Unlock Opportunity

## Status

**Resolved** — 2026-09-12 (Closed in Issue #17)

## Context

In [`src/lib/rxdb.ts`](file:///Users/hozgan/devbox/personal/buobu-oss/src/lib/rxdb.ts), two collections are registered during database initialization:
1. `changeLog` (schema: `changeLogSchema`)
2. `syncMeta` (schema: `syncMetaSchema`)

Both collections are created in every user's browser IndexedDB database instance.

### Problem Analysis

1. **Zero Queries or Mutations:**
   Across the entire codebase, neither `changeLog` nor `syncMeta` is ever queried, inserted into, updated, or read.
   - Initial synchronization architecture envisioned a manual changelog-based replication engine.
   - However, the architecture migrated to the native `@rxdb/plugins/replication-supabase` plugin, which tracks state via internal checkpointing rather than custom `changeLog` and `syncMeta` tables.
2. **Resource Overhead:**
   Every user's IndexedDB environment unnecessarily creates and indexes two extra object stores, increasing database bootstrap time and storage overhead.
3. **Direct Link to [TD-001](./TD-001-rxdb-v17-upgrade-blocker.md):**
   RxDB v17 introduced an open-source hard limit of **13 collections** (`COL23`). Because `buobu` defines **15 collections**, the upgrade to v17 is currently blocked.
   Removing `changeLog` and `syncMeta` reduces the collection count from **15 to exactly 13**:
   - `tasks`
   - `backlogs`
   - `habits`
   - `habitLogs`
   - `visionItems`
   - `notes`
   - `bookmarks`
   - `mindmaps`
   - `boards`
   - `swimlanes`
   - `routines`
   - `routineLogs`
   - `timeblocks`

   **Eliminating this technical debt directly unblocks the RxDB v17 upgrade without any commercial license or entity restructuring!**

## Remediation Plan

1. **Remove Schemas & Collections:**
   - Remove `changeLogSchema` and `syncMetaSchema` from `src/lib/rxdb.ts`.
   - Remove `changeLog` and `syncMeta` from `db.addCollections({...})`.
2. **IndexedDB Cleanup (Optional Migration):**
   - Provide a lightweight one-time IndexedDB cleanup step if needed to drop the obsolete stores from existing user databases.
3. **Re-evaluate RxDB v17:**
   - Upgrade `rxdb` to `17.x` and verify that `COL23` is no longer triggered.

## Related

- Issue [#17](https://github.com/netologist/buobu/issues/17)
- Issue [#14](https://github.com/netologist/buobu/issues/14)
- [TD-001: RxDB v17 Upgrade Blocked by Collection Limit](./TD-001-rxdb-v17-upgrade-blocker.md)
- [`src/lib/rxdb.ts`](file:///Users/hozgan/devbox/personal/buobu-oss/src/lib/rxdb.ts)
- [ADR-001: RxDB as Database](../adr/001-rxdb-as-database.md)
