# TD-001: RxDB v17 Upgrade Blocked by Free Edition Collection Limit (COL23)

## Status

**Resolved** — 2026-09-12 (Resolved via Path A in TD-003: unused `changeLog` and `syncMeta` collections were removed, reducing total collections from 15 to 13. Upgraded to `rxdb@17.5.0`; Issue #14 closed.)

## Context

During the evaluation of automated dependency update PR #10 (`rxdb` from `16.21.1` to `17.5.0`), database initialization failed with a fatal error in both unit tests (`rxdb-repository.test.ts`) and manual runtime:

```text
RxDB Error-Code: COL23
In the open-source version of RxDB, the amount of collections that can exist in parallel is limited to 13.
If you already purchased the premium access, you can remove this limit: https://rxdb.info/rx-collection.html?console=limit#faq
```

### Upstream Limitation

In RxDB v17.0.0+, the upstream maintainer introduced an artificial limit in the open-source / non-premium distribution:
`NON_PREMIUM_COLLECTION_LIMIT = 13` (defined in `rxdb/src/plugins/utils/utils-premium.ts` and tracked in upstream issue [pubkey/rxdb#8614](https://github.com/pubkey/rxdb/issues/8614)).

When an application without a valid commercial license opens more than 13 collections concurrently, RxDB polls for 1.8 seconds waiting for collections to close, then throws `COL23`.

### Impact on buobu

`buobu` defines **15 collections** in `src/lib/rxdb.ts`:

1. `tasks`
2. `backlogs`
3. `habits`
4. `habitLogs`
5. `changeLog`
6. `visionItems`
7. `notes`
8. `bookmarks`
9. `mindmaps`
10. `boards`
11. `swimlanes`
12. `syncMeta`
13. `routines`
14. `routineLogs`
15. `timeblocks`

Because all 15 collections are instantiated together in `getDatabase()` via `db.addCollections({...})`, registering the 14th collection (`routineLogs`) and 15th collection (`timeblocks`) consistently triggers `COL23`, breaking all repository reads/writes in both Local Mode and Cloud Mode.

## Current Mitigation

1. **Pinned Dependency:** `rxdb` is pinned to the stable `16.21.x` release line in `package.json`.
2. **Dependabot Configuration:** Dependabot is configured in `.github/dependabot.yml` to ignore major updates for `rxdb`:
   ```yaml
   ignore:
     - dependency-name: rxdb
       update-types: ["version-update:semver-major"]
   ```
   Minor and patch releases on the v16 line will continue to be received.
3. **PR #10:** Closed with reference to this technical debt record.

## Remediation Paths

To eventually migrate beyond RxDB 16.x, one of the following architectural paths must be chosen:

### Path A: Collection Consolidation (Reduce to ≤ 13 collections)
Reduce the collection footprint by merging tightly coupled entities:
- Consolidate `routineLogs` into `routines` (e.g. document-embedded completion records).
- Merge local metadata collections (`changeLog` and `syncMeta`) into a single internal state store.
- **Estimated Effort:** Medium–High. Requires client-side IndexedDB migration strategies, updating repository CRUD methods, and adjusting cloud replication mapping.

### Path B: Migration to an Alternative Local-First Engine
Migrate away from RxDB to an unencumbered open-source local database:
- **Dexie.js directly:** buobu already uses the Dexie storage engine under RxDB; Dexie provides live queries and has no artificial collection count limits.
- **SQLite in WASM (e.g. PGlite, CR-SQLite):** Provides relational querying and standard SQL capabilities.
- **Estimated Effort:** High. Involves replacing `RxDBRepository` and subscription hooks (`useRxCollectionSubscription`, `useRxBoardSubscription`).

### Path C: Commercial License
- If commercial sponsorship or funding is allocated, an RxDB Premium license token can be configured via environment variables to lift the `COL23` limit.

## Related

- [ADR-001: RxDB as Database](../adr/001-rxdb-as-database.md)
- [Database Architecture](../tech-stack/database.md)
- Issue [#14](https://github.com/netologist/buobu/issues/14)
- Pull Request [#10](https://github.com/netologist/buobu/pull/10)
