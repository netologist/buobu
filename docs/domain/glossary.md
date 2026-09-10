# Glossary

## Application Terms

| Term | Definition |
|------|------------|
| **Board** | Top-level container for a project or workspace. Owns its kanban columns (`BoardColumn[]`), its naming labels and the swimlanes it contains |
| **Swimlane** | Sub-division of a board that groups work by category, client or priority. Tasks, habits, routines, notes, mindmaps, vision board items, bookmarks and timeblocks all belong to a swimlane |
| **Task** | Kanban card representing work to be done, positioned by `columnId` inside its swimlane |
| **Habit** | Recurring activity tracked per day. Can be attached to a timeblock, which overrides its own frequency |
| **Habit Log** | Daily entry for a habit, holding a `value` of 0–3 (or a negative value for a skipped day) |
| **Routine** | Recurring definition (`task`, `event` or `payment`) that generates work on a `RecurrenceRule` schedule |
| **Routine Log** | One-day record of a routine outcome: `approved`, `skipped` or `auto-processed` |
| **Timeblock** | Named block of the day with a `startTime`, an `endTime` and a recurrence. Habits and routines can be attached to it, which overrides their own schedule |
| **Note** | Rich text document edited with TipTap, optionally carrying typed metadata fields |
| **Mindmap** | Tree of `MindmapNode`s used for brainstorming |
| **Vision Board Item** | Item on a board's vision/whiteboard surface; may hold free text and Excalidraw drawing data |
| **Bookmark** | Saved link (URL, normalised URL, domain) with tags, threaded comments and links to other entities |
| **Backlog** | Unordered list of items to process later |

## Technical Terms

| Term | Definition |
|------|------------|
| **RxDB** | Reactive local database library. It is a database, not an ORM: entities are stored as RxDB documents |
| **Dexie** | The IndexedDB storage engine RxDB is configured with (`getRxStorageDexie()`) |
| **IndexedDB** | Browser storage API that holds all local data. Every entity lives here, in both modes |
| **Local-First** | Architecture where the local database is the working copy and the cloud holds a synchronised copy, when there is a cloud at all |
| **BaseEntity** | Metadata every entity carries: `user_id`, `_modified`, `_version`, `_createdAt`, `_updatedAt`, `_deleted`, `_deviceId` |
| **Soft Delete** | Marking a document `_deleted: true` instead of removing it. Cleanup runs later through the RxDB cleanup plugin |
| **`_modified`** | Millisecond timestamp rewritten on every write. The replication push handler compares it to detect a conflict |
| **Zustand** | Store library holding app state (`src/stores/*.ts`) |
| **Jotai** | Atom library holding reactive query results (`src/stores/atoms/`) |

## Sync Terms

| Term | Definition |
|------|------------|
| **Replication** | RxDB's `replicateRxCollection` running against Supabase: a PostgREST pull/push pair plus a Realtime websocket that triggers a re-sync when server rows change |
| **Pull** | Replication handler that fetches rows for the signed-in user, in `_modified` order, in batches of 100 |
| **Push** | Replication handler that upserts local changes into the matching Postgres table, in batches of 100 |
| **Checkpoint** | The last document of a pull batch. Stored per replication so the next pull resumes after it |
| **Conflict** | A push entry is skipped when the current server row's `_modified` differs from the value the local change was based on |
| **Realtime Resync** | Websocket subscription on `postgres_changes` per replicated table; a change triggers an immediate `reSync()` |
| **Sync Entitlement** | The Plus-tier `hasSyncAccess` entitlement. Replication starts only when it is granted, and stops when it is lost |
| **Paused Replication** | User-initiated state that pauses the replication states and the realtime socket without tearing them down |

## Deployment Modes

| Term | Definition |
|------|------------|
| **Local Mode** | buobu running with no remote backend at all, selected by `NEXT_PUBLIC_LOCAL_MODE=true`. No account, no sync, no server; the browser is the only place the user's data exists. It is opted into, never inferred from missing configuration. _Avoid_: offline mode, standalone mode, self-hosted, demo mode |
| **Cloud Mode** | buobu running against a remote backend — a Supabase project, and optionally the Workers. Accounts, sync, billing and MCP exist only here. It is what every build that does not opt into Local Mode runs as. _Avoid_: production mode, hosted mode, online mode |
| **Local User** | The single synthetic identity that owns everything in Local Mode, with the id `local`. Not an account: no credentials, cannot sign in, cannot sign out. _Avoid_: guest user, anonymous user, demo user |
| **Continue Offline** | An onboarding choice for a signed-in Cloud Mode user whose first sync has not completed. The user stays signed in with a Cloud Mode identity but proceeds before sync finishes. It is not Local Mode. _Avoid_: skip login, use offline, local mode |

## Editor Terms

| Term | Definition |
|------|------------|
| **TipTap** | Rich text editor framework |
| **Excalidraw** | Canvas drawing library |
| **Mermaid** | Diagram syntax renderer |
| **KaTeX** | Math equation renderer |

## UI Terms

| Term | Definition |
|------|------------|
| **Kanban** | Board view where cards sit in columns |
| **Column** | Vertical lane in a kanban board, defined by the board's `columns` array |
| **4-State Progression** | Habit completion levels cycled by a click: 0→1→2→3→0 |
| **Skip** | Marking a habit day as skipped (long press), stored as a negative `value` and drawn with a diagonal pattern |

## Related

- [Domain Entities](./entities.md)
- [ADR-014: Local Mode](../adr/014-local-mode.md)
