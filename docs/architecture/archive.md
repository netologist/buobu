# Archive Feature — Architecture

**Status:** Implemented. This document began as the design plan for the archive feature and is kept as the reference description of the shipped implementation. Where the original plan and the code differ, the difference is stated explicitly.

What shipped, in short:

- `archived?: boolean` and `archivedAt?: string | null` on every user-visible entity in `src/lib/types.ts`, and the matching fields in the RxDB schemas in `src/lib/rxdb.ts`.
- Cascading archive/unarchive in `RxdbRepository` (`src/lib/rxdb-repository.ts`), wrapped by `src/lib/db.ts` and exposed as actions on `src/stores/board-store.ts`.
- Derived Jotai atoms (`archivedTasksAtom`, `archivedNotesAtom`, …) and hooks (`useArchivedTasks()`, `useArchivedNotes()`, …) plus two Zustand stores — `src/stores/archive-filter-store.ts` and `src/stores/archive-view-store.ts` — that every view reads.
- An archive browser at `/archive` (`src/app/archive/page.tsx`).

Related decisions: [ADR 004 — Simplified sidebar with board filter](../adr/004-simplified-sidebar-with-board-filter.md) (board `archiveColumnId` / `showArchiveColumn`) and [ADR 001 — RxDB as database](../adr/001-rxdb-as-database.md) (schema versions and migrations).

## Overview

A unified archive system for **boards**, **swimlanes**, and their child resources. Archiving hides entities from active views while preserving data integrity, sync compatibility, and restorability. Archived items are browsable in a dedicated archive view, can be restored, and are shown in a read-only mode while an archive view or an archived board/swimlane selection is active.

### Two distinct mechanisms

Do not confuse these; both are called "archive" in the codebase:

| Mechanism | Field(s) | Meaning |
|-----------|----------|---------|
| Archive flag | `archived`, `archivedAt` | The entity is archived (this feature) |
| Archive column | `Board.archiveColumnId`, `Board.showArchiveColumn` | The Kanban column that renders "done" styling and hosts the task archive action (see [§4.5](#45-archive-column)) |

## Goals

1. Archive/unarchive boards and swimlanes, cascading to children — shipped.
2. Consistent `archived` + `archivedAt` fields on every archivable entity — shipped.
3. Archived items hidden from active views by default — shipped.
4. A dedicated archive browser with search — shipped at `/archive`.
5. Archived content read-only — partially shipped: enforced while an archive view is open and for archived Kanban tasks; not a global form lock (see [§4.3](#43-read-only-mode)).
6. Zero data loss — archive is reversible, never destructive — shipped.
7. Full sync compatibility (RxDB ↔ Supabase) — shipped; archive fields replicate like any other field.

---

## 1. Data Model

### 1.1 Shipped field matrix

Verified against `src/lib/types.ts`, the collection schemas in `src/lib/rxdb.ts`, and `supabase/migrations/20250917120000_archive_fields.sql`.

| Entity | `archived` | `archivedAt` | Notes |
|--------|-----------|--------------|-------|
| Board | Yes | Yes | Also carries `archiveColumnId` / `showArchiveColumn`, which are column config, not archive state |
| Swimlane | Yes | Yes | Cascade root for child entities |
| Task | Yes | Yes | Set by cascade and by the task archive action (offered while the task sits in the archive column) |
| Habit | Yes | Yes | |
| Routine | Yes | Yes | Has fields, atoms and hooks, but is **not** part of the cascade |
| Timeblock | Yes | Yes | Cascaded with swimlanes even though the original plan did not mention it |
| Note | Yes | Yes | |
| Mindmap | Yes | Yes | |
| Bookmark | Yes | Yes | See the schema caveat in [§1.4](#14-supabase-migration) |
| VisionBoardItem | Yes | Yes | Type name is `VisionBoardItem`, not `VisionItem` |
| BacklogItem | Yes | Yes | No dedicated archive UI; archived through cascade only |
| HabitLog, RoutineLog | No | No | Log records are never archived |

The original plan differed in three places, all corrected here:

| Plan said | Shipped reality |
|-----------|-----------------|
| Habit / Note / Mindmap need `archivedAt` added (they already had `archived`) | Both fields exist on all three |
| Bookmark gets a new `archived` **boolean** plus `archivedAt`, keeping `status` | Both fields exist: the boolean was already on the bookmarks table, the archive migration adds only `archivedAt`. `Bookmark.status` keeps its own `'archived'` value, used by the bookmarks status filter |
| Routine and Timeblock are not archivable | Both have `archived` + `archivedAt` |

### 1.2 TypeScript shape (`src/lib/types.ts`)

Both fields are optional on every entity, so documents created before the feature (and freshly seeded documents) remain valid:

```typescript
archived?: boolean;
archivedAt?: string | null;
```

`archivedAt` is an ISO timestamp string set when the entity is archived and reset to `null` on restore.

### 1.3 RxDB schemas (`src/lib/rxdb.ts`)

Every affected collection defines the pair inside `properties`:

```typescript
archived: { type: 'boolean' },
archivedAt: { type: ['string', 'null'] },
```

Shipped schema versions and the migration strategies that introduce archive fields:

| Collection | Version | Archive-related migration strategy |
|------------|---------|------------------------------------|
| tasks | 2 | Field already present; later versions add `routineId`/`time` (v1) and `timeboxMinutes` (v2) |
| backlogs | 1 | v1 defaults `archived: false`, `archivedAt: null` |
| habits | 3 | v1 adds `archivedAt: null`; v2 adds `timeblockId`; v3 adds `sourceType`/`sourceTimeblockId` |
| visionItems | 1 | v1 defaults `archived: false`, `archivedAt: null` |
| notes | 1 | v1 adds `archivedAt: null` |
| bookmarks | 1 | v1 adds `archivedAt: null` |
| mindmaps | 1 | v1 adds `archivedAt: null` |
| boards | 4 | v2 defaults `archived: false`, `archivedAt: null`; v3 adds `order`; v4 adds `description` |
| swimlanes | 3 | v1 defaults `archived: false`, `archivedAt: null`; v2 adds `order`; v3 adds `description` |
| routines | 1 | v1 adds `timeblockId` (archive fields already present) |
| timeblocks | 1 | v1 adds `showAsHabit` (archive fields already present) |

Migration strategies receive the old document and return it with the new fields defaulted, for example:

```typescript
migrationStrategies: {
  2: (oldDoc: Record<string, unknown>) => ({ ...oldDoc, archived: false, archivedAt: null }),
},
```

### 1.4 Supabase migration

Shipped file: `supabase/migrations/20250917120000_archive_fields.sql`.

```sql
-- Boards, swimlanes, vision items, backlogs: both columns
ALTER TABLE public.boards        ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.boards        ADD COLUMN IF NOT EXISTS "archivedAt" TEXT;
ALTER TABLE public.swimlanes     ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.swimlanes     ADD COLUMN IF NOT EXISTS "archivedAt" TEXT;
ALTER TABLE public.vision_items  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.vision_items  ADD COLUMN IF NOT EXISTS "archivedAt" TEXT;
ALTER TABLE public.backlogs      ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.backlogs      ADD COLUMN IF NOT EXISTS "archivedAt" TEXT;

-- Habits, notes, mindmaps, bookmarks: archivedAt only
ALTER TABLE public.habits        ADD COLUMN IF NOT EXISTS "archivedAt" TEXT;
ALTER TABLE public.notes         ADD COLUMN IF NOT EXISTS "archivedAt" TEXT;
ALTER TABLE public.mindmaps      ADD COLUMN IF NOT EXISTS "archivedAt" TEXT;
ALTER TABLE public.bookmarks     ADD COLUMN IF NOT EXISTS "archivedAt" TEXT;
```

Two caveats an implementer must know:

1. **Bookmarks.** The migration adds only `"archivedAt"`, because the `archived` boolean already existed on the table (created by the bookmarks migration, `supabase/migrations/20250912120000_bookmarks.sql`). Bookmarks therefore have two independent representations of "archived": the boolean `archived` (used by archive filtering and this feature) and the `status` value `'archived'` (allowed by the `bookmarks_status_check` constraint and used by the bookmarks status filter).
2. **Routines and timeblocks.** This migration does not touch them, because both tables were created later with `archived` + `"archivedAt"` already present (`supabase/migrations/20250920200000_routines.sql`, `supabase/migrations/20260506000000_timeblocks.sql`). Their behaviour still differs from each other: timeblocks participate in the swimlane cascade, routines do not (see §2).

There is no `tasks` change in the migration: tasks already had both columns.

---

## 2. Cascade Rules

### 2.1 Board archive

When a board is archived, `RxdbRepository.archiveBoard(boardId)`:

1. Writes `archived: true` + `archivedAt: <now>` on the board.
2. Loads the board's swimlanes and calls `archiveSwimlane(swimlane.id, now)` for each, reusing a single timestamp.

```
Board (archived = true)
 └── every Swimlane of the board (archived = true)
      └── every child entity in that swimlane (archived = true)
```

There is no `archivedBy` or "reason" field; provenance is implied by the parent's state. The cascade is *stored* — each document carries its own flag so reads stay simple.

### 2.2 Swimlane archive

`archiveSwimlane(swimlaneId, timestamp?)` writes the swimlane flag and then patches every non-deleted document in these collections whose `swimlaneId` matches:

```
tasks, habits, notes, mindmaps, visionItems, backlogs, bookmarks, timeblocks
```

Two details differ from the original plan:

- `timeblocks` are included in the cascade; the plan's collection list omitted them.
- `routines` are **not** cascaded, even though `Routine` has archive fields, an `archivedRoutinesAtom` and a `useArchivedRoutines()` hook.

Each patched document gets:

```typescript
{
  archived: true,
  archivedAt: timestamp,
  _updatedAt: new Date().toISOString(),
  _version: json._version + 1,
  _modified: Date.now(),
}
```

The selector is `{ swimlaneId, _deleted: false }`, so already-archived documents are re-patched (same timestamp) and soft-deleted documents are skipped.

### 2.3 Unarchive rules

| Action | Behavior |
|--------|----------|
| Unarchive board | Board only: `archived: false`, `archivedAt: null`. **Swimlanes stay archived** — the user restores them explicitly. |
| Unarchive swimlane | Swimlane plus children. The repository patches the same eight collections, selecting `{ swimlaneId, archived: true, _deleted: false }`, setting `archived: false`, `archivedAt: null`. |
| Restore an individual item | Done by the entity's own views and the archive page with a normal `put` (`archived: false`, `archivedAt: null`). |

> **Rationale (unchanged from the plan):** board unarchive is a "make visible" action; swimlane unarchive restores the full working context because a swimlane without its items is useless.

### 2.4 Implementation

```typescript
// src/lib/rxdb-repository.ts (abridged)
async archiveBoard(boardId: string): Promise<void> {
  const now = new Date().toISOString();
  await this.putBoard({ id: boardId, archived: true, archivedAt: now });
  const swimlanes = await this.getSwimlanesByBoard(boardId);
  for (const swimlane of swimlanes) {
    await this.archiveSwimlane(swimlane.id, now);
  }
}

async archiveSwimlane(swimlaneId: string, timestamp?: string): Promise<void> {
  const now = timestamp || new Date().toISOString();
  await this.putSwimlane({ id: swimlaneId, archived: true, archivedAt: now });
  await Promise.all([
    this.archiveCollection('tasks', swimlaneId, now),
    this.archiveCollection('habits', swimlaneId, now),
    this.archiveCollection('notes', swimlaneId, now),
    this.archiveCollection('mindmaps', swimlaneId, now),
    this.archiveCollection('visionItems', swimlaneId, now),
    this.archiveCollection('backlogs', swimlaneId, now),
    this.archiveCollection('bookmarks', swimlaneId, now),
    this.archiveCollection('timeblocks', swimlaneId, now),
  ]);
}
```

Callers: `src/lib/db.ts` exposes `archiveBoard`, `archiveSwimlane`, `unarchiveBoard`, `unarchiveSwimlane`, each resolving the user's repository and marking the collection changed; `src/stores/board-store.ts` wraps them and reloads boards/swimlanes afterwards.

---

## 3. State Layer

The original plan proposed a family of repository query methods (`getActiveBoards()`, `getArchivedTasksByBoard()`, `searchArchived()`). **Those methods do not exist.** Filtering happens in derived Jotai atoms and in components:

- `src/stores/atoms/*.ts` exposes `activeXxxAtom` / `archivedXxxAtom` pairs for tasks, habits, notes, mindmaps, visionItems, bookmarks, backlogs, routines and timeblocks.
- `src/stores/hooks/*.ts` re-exports them as hooks — `useArchivedTasks()`, `useArchivedHabits()`, `useArchivedNotes()`, `useArchivedMindmaps()`, `useArchivedBookmarks()`, `useArchivedVisionItems()`, `useArchivedRoutines()`, `useArchivedTimeblocks()`.
- Boards and swimlanes have no archived atoms or hooks. `src/app/archive/page.tsx` filters with `boards.filter((b) => b.archived === true)` and `swimlanes.filter((s) => s.archived === true)`; `src/stores/hooks/use-boards.ts` filters archived swimlanes out of the default selection.

Example atom:

```typescript
export const archivedTasksAtom = atom<Task[]>((get) => {
  const tasks = get(tasksAtom);
  return tasks.filter((t) => t.archived === true);
});
```

View components then combine the archive filter with the selection:

- `isArchivedSelectionMode` is computed in `src/stores/hooks/use-boards.ts` (`showArchivedItems || isArchivedFromSelection`) and reaches board components through `src/hooks/useBoardBase.ts`, which also provides the `archivedSwimlaneIdSet` used for per-swimlane logic.
- Active mode filters `!item.archived`; archive mode filters `item.archived === true`.
- Per-swimlane counts use the pattern `item.archived === (inArchivedSwimlane || isArchivedSelectionMode)`, so archived items are counted only where they are actually shown.

The filter state itself lives in `src/stores/archive-filter-store.ts`:

```typescript
{ showArchivedItems: boolean, isLockedBySelection: boolean }
```

`isLockedBySelection` is set when the current board/swimlane selection forces archive mode; the header switch is disabled and the tooltip reads "Archived mode — selected board/swimlane is archived".

---

## 4. UI Architecture

### 4.1 Archive actions

Shipped surfaces (each entity type keeps its own restore affordance):

| Entity | Archive | Restore |
|--------|---------|---------|
| Board | Compact navigation board menu → `board-store.archiveBoard` | Hover "Restore" control on the archived board row |
| Swimlane | Compact navigation swimlane menu; swimlane dialog (`onArchive` in `AppLayout`) | Hover "Restore" control on the archived swimlane row |
| Task | Archive action on a task in the board's **archive column** (card menu or detail panel), or the bulk "archive done tasks" action | "Restore" in the Kanban archived-tasks dialog (`ArchiveView`), and the archive page |
| Habit | Habits board archive action; the habit form carries an `archived` checkbox that writes the flag on save | No dedicated restore button — restore from the archive page |
| Note | Notes board archive action | Notes board restore action |
| Mindmap | Mindmap toolbar | Mindmap toolbar restore action |
| Bookmark | Bookmark detail panel | Bookmark detail panel restore action |
| Vision item | Vision board item action | Archive page only |
| Routine | Routines board (`routineActions.archive`) | **None** — `archiveRoutine` has no counterpart |
| Timeblock | Timeblocks sidebar | Timeblocks sidebar (`timeblockActions.unarchive`) |
| Backlog item | No UI action; archived only by cascade | Unarchiving the parent swimlane |

Archiving a timeblock also archives the habits projected from it (`archiveTimeblockProjectionHabits`); unarchiving re-syncs the projection habit.

There is **no confirmation dialog** before archiving. `src/components/ui/archive-dialogs.tsx` exports an `ArchiveConfirmDialog`, but nothing imports it; only `PermanentDeleteDialog` is wired up (from the archive page). The original plan's dialog copy therefore does not appear in the product.

### 4.2 Archive browser — `/archive`

`src/app/archive/page.tsx` is a single page with:

- A local search box ("Search archived items…"), matched case-insensitively with `String.includes`.
- Grouped sections, rendered only when non-empty: **Boards, Swimlanes, Tasks, Habits, Notes, Mindmaps, Bookmarks, Vision items**. There are no Routines, Timeblocks or Backlog sections.
- One row per item: title (bookmarks fall back to the URL), optional parent context (`Board / Swimlane`), the relative `archivedAt`, a Restore button and a Delete Permanently button.
- Selecting a row (boards and swimlanes are not selectable) calls `selectBoard` + `toggleSwimlane` for the item's context and navigates to the owning feature route: `/boards`, `/habits`, `/notes`, `/mindmap`, `/bookmarks` or `/vision`.
- An empty state: "No archived items." or, while searching, "No archived items match your search."

```
┌──────────────────────────────────────────────┐
│  Archive                    [ 12 items ]      │
│  [ Search archived items...                 ] │
│                                              │
│  Boards (1)                                  │
│   Old Project Board       2 weeks ago  ↺ 🗑   │
│  Swimlanes (2)                               │
│   Sprint 14 (Product)       5 days ago ↺ 🗑   │
│  Tasks (4)                                   │
│   Fix login bug             3 days ago ↺ 🗑   │
└──────────────────────────────────────────────┘
```

Entry points:

- **App header menu:** a dropdown item linking to `/archive` (present in both the desktop and compact header variants).
- **Global search palette:** "Include archived" and "Only archived" filter buttons; archived results carry an amber "Archived" badge. Choosing an archived result calls `archive-view-store.enter(...)` and opens read-only archive view instead of navigating.

The plan's per-feature "Show archived" toggles inside filter panels did not ship as such. The shipped equivalents are the global **Show archived items** switch in the app header and the **SHOW ARCHIVED (n)** toggles for boards and swimlanes in the compact navigation.

### 4.3 Read-only mode

Shipped enforcement:

1. **Archive view mode.** `useArchiveViewStore` holds `{ boardId, swimlaneId?, entityType?, entityId? }` when the user opens an archived result from global search. While a target is set, `AppLayout` renders an amber banner — "You are viewing archived content. All changes are disabled." with an "Exit Archive View" button — and applies `pointer-events-none opacity-80` to the middle panel (compact variant) and the right panel.
2. **Archived Kanban tasks.** In `KanbanBoard` and `TasksListBoard`, the task detail panel is read-only when `draftTask.columnId === archiveColumnId || draftTask.archived`. The archive column also hides its "add card" affordance.
3. **Visual markers.** Archived items render with "Archived" badges and muted opacity in list sections and detail views (`TasksSection`, `NotesSection`, `HabitsSection`, `MindmapsSection`, `BookmarksSection`, and the corresponding `*Detail` components). The archive column has an amber tint.

Not shipped, despite being in the plan:

- A shared `ArchiveBanner` component and a generic `useArchiveReadOnly()` hook.
- Disabling every form field for archived items. Notes, mindmaps, habits, bookmarks and routines remain editable in their own views — that is where their Restore actions live. Only archive view mode and archived Kanban tasks are locked.
- TipTap `editable: false` for archived notes. The note editor only uses `editable: false` in the read-only preview drawer, which is unrelated to archive state.
- Excalidraw view-only mode for archived vision items.

### 4.4 Sidebar / navigation behaviour

- Archived boards and swimlanes are hidden from the sidebar by default; the compact navigation shows a "SHOW ARCHIVED (n)" toggle that swaps in the archived boards (and archived swimlanes for the selected board).
- Selecting an archived board lists its archived swimlanes and shows the amber banner "Archived mode — showing archived items from the selected board/swimlane."
- `AppLayout` accepts archived boards as a valid primary selection so selecting one does not fight the "fall back to first board" guard.
- Counts exclude archived items from active views and include them in archive mode (see §3).

### 4.5 Archive column

`Board.archiveColumnId` (default `"done"`, see `DEFAULT_ARCHIVE_COLUMN_ID` in `src/lib/constants.ts`) names the column that behaves as the "done" column:

- Dropping a task into it sets `completedAt` (done state); moving it out clears `completedAt` (`useTaskBoardDragAndDrop`).
- The archive action for an individual task is only offered while the task sits in that column (`canArchive` in `TaskDetailPanel`); it sets `archived: true` + `archivedAt`. A bulk action archives every task currently in the archive column.
- `Board.showArchiveColumn` controls whether the archive column is visible on the board.
- Both fields are configured in the board modal's Columns tab, and the archive column cannot be deleted.
- The archive column and the archive *flag* are separate: a task archived by a swimlane cascade keeps whatever `columnId` it had, while tasks in the archive column can remain unarchived (they simply count as done).

---

## 5. Search

Shipped search is client-side substring matching, not the repository-level `searchArchived()` described in the plan. Fields actually searched:

| Entity | Fields matched |
|--------|----------------|
| Board | `name` |
| Swimlane | `name`, `label` |
| Task | `title` |
| Habit | `title` |
| Note | `title`, `tags` |
| Mindmap | `title` |
| Bookmark | `title`, `url` |
| Vision item | `title` |

Not searched (contrary to the plan's table): task `description`/`labels`, note `content`, bookmark `domain`/`tags`, backlog `text`.

The global search palette adds its own filter pills: **Include archived** and **Only archived** (mutually exclusive; both off by default, so archived items are hidden unless asked for). It indexes boards, swimlanes, tasks, habits, notes, mindmaps, bookmarks, vision items and timeblocks, matching each item's title (bookmarks fall back to the URL) and its "Board / Swimlane" subtitle.

`ArchiveSearchResult` is declared in `src/lib/types.ts` but is not referenced by the archive page or any other module; it is a leftover of the planned search API.

---

## 6. Permanent Deletion

- Offered only from the archive browser, one archived item at a time. Boards and swimlanes delete with a cascade; the other entity types go through their own delete action.
- `PermanentDeleteDialog` requires explicit confirmation before running the delete callback.
- Board: `permanentDeleteBoard(boardId)` deletes every swimlane of the board with `skipLastGuard` (bypassing the "last swimlane" protection), then soft-deletes the board document (`_deleted: true`, `_version` bumped, `_modified`/`_updatedAt` refreshed).
- Swimlane: `permanentDeleteSwimlane(swimlaneId)` delegates to `deleteSwimlane(id, { skipLastGuard: true })`.
- Child entities (tasks, habits, notes, mindmaps, bookmarks, vision items) are removed from the archive page through their own `xxxActions.delete(id)` soft delete.
- Permanent deletion is still a soft delete — documents are marked `_deleted: true`, which is the existing deletion mechanism used everywhere else.
- Auto-purge of long-archived items is **not** implemented.

---

## 7. Sync

- `archived` / `archivedAt` are ordinary fields; they replicate through the RxDB ↔ Supabase replication like any other document update. No archive-specific replication code exists.
- A cascade touches many documents at once (one update per affected entity). Each patch bumps `_version` and `_modified`, so each replicates as a normal document update.
- Batch updates from one cascade share a single `archivedAt` timestamp, which keeps the cascade grouping readable after sync.
- Conflict handling is the replication's generic one: pushes upsert with `on_conflict=id`, and a row whose remote `_modified` no longer matches the assumed state is reported as a conflict. Archive fields get no special treatment.

---

## 8. Plan vs. Shipped

The original phase plan, with status:

| Phase | Item | Status |
|-------|------|--------|
| 1 | Add archive fields to types and RxDB schemas with migrations | Shipped |
| 1 | Supabase migration for archive columns | Shipped: `archived` + `archivedAt` on boards, swimlanes, vision items and backlogs; `archivedAt` only on habits, notes, mindmaps and bookmarks (which already had `archived`) |
| 1 | Repository `archiveBoard` / `archiveSwimlane` / unarchive methods | Shipped |
| 1 | Repository archive-filtered query methods | **Not shipped** — filtering lives in atoms/components |
| 2 | Archived atoms per entity | Shipped (tasks, habits, notes, mindmaps, visionItems, bookmarks, backlogs, routines, timeblocks) |
| 2 | Archived hooks per entity | Shipped (same list); no board/swimlane hooks |
| 2 | Board store / swimlane selection filtering | Shipped in `use-boards.ts` and compact navigation |
| 3 | Board and swimlane archive actions with confirmation | Actions shipped; **confirmation dialog not wired** |
| 3 | Individual item archive actions | Shipped for most entity types; backlog has none |
| 3 | Board settings danger-zone archive | **Not shipped** as a danger-zone action |
| 4 | `/archive` browser | Shipped (8 entity groups, search, restore, delete) |
| 4 | Archive search with entity-type/board/date filters | **Not shipped** — plain text search only |
| 4 | Sidebar link to the archive page | **Not shipped** — entry via the header menu and global search |
| 4 | Per-feature "Show archived" filter toggles | **Not shipped** — replaced by the global switch and compact-navigation toggles |
| 5 | Shared archive banner + read-only wrappers | Partially shipped: banner in archive view mode; no generic wrappers |
| 5 | TipTap / Excalidraw read-only for archived items | **Not shipped** |
| 6 | Sidebar hiding and selection fallback | Shipped |
| 6 | Restore flows and cascade correctness | Shipped |
| 6 | Permanent delete with cascade | Shipped |
| 6 | Empty state for the archive browser | Shipped |
| 6 | `Cmd+Shift+A` archive shortcut | **Not shipped** |

---

## 9. Edge Cases

Behaviour that the implementation actually defines:

| Scenario | Behavior |
|----------|----------|
| Archive the currently selected board | The compact navigation switches to showing archived boards; the selection stays valid because `AppLayout` accepts archived boards as a primary |
| Archive the last remaining board | Allowed (unlike deletion, which is guarded); archived boards stay reachable through the compact navigation's SHOW ARCHIVED toggle |
| Unarchive a swimlane whose parent board is archived | Allowed — the swimlane is restored but the board stays archived, so the board view remains in archive mode |
| Create an entity that targets an archived board/swimlane | Board and swimlane pickers skip archived parents (for example `TimeblockEditDialog`, `RoutineDialog`); the board's archive column hides its add-card affordance |
| Archived items in export | `ExportModal` has "Include archived items", **default on** — the export is a full backup unless the user opts out |
| Archived items in import | `ImportModal` has "Include archived items", **default off** — when off, archived documents are stripped from the file before preview and import |
| Search shows archived and active results | The archive page shows archived items only; the global palette separates them with an "Archived" badge and an "Only archived" filter |
| Onboarding seed data | Seeded boards/swimlanes do not set `archived` at all; the absent field is treated as active everywhere |

---

## 10. File Map

| File | Role |
|------|------|
| `src/lib/types.ts` | `archived` / `archivedAt` on every entity; `EntityType`; unused `ArchiveSearchResult` |
| `src/lib/rxdb.ts` | Collection schemas, archive field definitions, version bumps and migration strategies |
| `src/lib/rxdb-repository.ts` | `archiveBoard`, `archiveSwimlane`, `unarchiveBoard`, `unarchiveSwimlane`, `archiveCollection`, `unarchiveCollection`, `permanentDeleteBoard`, `permanentDeleteSwimlane` |
| `src/lib/db.ts` | Thin user-scoped wrappers around the repository archive methods |
| `src/stores/board-store.ts` | Board/swimlane archive actions used by the UI |
| `src/stores/archive-filter-store.ts` | `showArchivedItems`, `isLockedBySelection` |
| `src/stores/archive-view-store.ts` | Archive view target for read-only mode |
| `src/stores/atoms/*.ts` | `activeXxxAtom` / `archivedXxxAtom` pairs |
| `src/stores/hooks/use-*.ts` | `useArchivedXxx()` hooks |
| `src/stores/hooks/use-boards.ts` | Archive-aware swimlane filtering and `isArchivedSelectionMode` |
| `src/app/archive/page.tsx` | Archive browser |
| `src/components/ui/archive-dialogs.tsx` | `PermanentDeleteDialog` (and an unused `ArchiveConfirmDialog`) |
| `src/components/kanban/ArchiveView.tsx` | Per-swimlane archived task dialog with restore |
| `src/components/kanban/AppHeader.tsx` | Archive link, "Show archived items" switch |
| `src/components/kanban/KanbanBoard.tsx`, `TasksListBoard.tsx`, `TaskDetailPanel.tsx`, `KanbanColumn.tsx` | Archive column behaviour and archived task read-only state |
| `src/components/layout/AppLayout.tsx`, `AppLayoutStatusBanner.tsx`, `CompactNavigation*.tsx` | Archive banners, read-only panel state, board/swimlane archive and restore controls |
| `src/components/import-export/ExportModal.tsx`, `ImportModal.tsx` | Include-archived toggles |
| `src/hooks/useTaskBoardDragAndDrop.ts` | Archive column drop handling |
| `supabase/migrations/20250917120000_archive_fields.sql` | Cloud columns |

## Related

- [Architecture Overview](./overview.md)
- [Data Flow](./data-flow.md)
- [Local-First Strategy](./local-first.md)
- [Domain Entities](../domain/entities.md)
- [ADR 004 — Simplified sidebar with board filter](../adr/004-simplified-sidebar-with-board-filter.md)
