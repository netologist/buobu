# ADR-012: Time Blocks and Time Box

**Status:** Accepted  
**Date:** 2026-05-06

## Context

Users need two complementary scheduling primitives:

1. **Time Block** — a named recurring time slot tied to a swimlane (e.g. "Deep Work 09:00–11:00 Mon/Wed/Fri"). Habits and routines can be attached to a time block, which then overrides their individual recurrence at runtime.
2. **Time Box** — a planned duration (in minutes) on a task, used to visualise how long a task is expected to take on the calendar.

## Decision

### Timeblock entity

- Stored in a new `timeblocks` RxDB collection and Supabase table
  (`supabase/migrations/20260506000000_timeblocks.sql`).
- Fields: `id`, `boardId`, `swimlaneId`, `title`, `description`, `color`,
  `startTime` (HH:MM, required), `endTime` (HH:MM, required),
  `recurrence: RecurrenceRule`, `showAsHabit`, `order`, `archived`, `archivedAt`,
  plus the `BaseEntity` sync fields (`_version`, `_updatedAt`, `_deleted`).
- Scoped to a **swimlane** of a board (not a board or global), matching how
  habits/routines are scoped.
- Archiving is the reversible path: a time block can be archived and restored.
  Permanent delete is confirmed in the sidebar and soft-deletes any habit the
  time block was projecting (`showAsHabit`). `detachFromTimeblock` clears
  `timeblockId` on the habits and routines linked to a time block.

### Override-but-keep semantics

When a habit or routine has a `timeblockId`:
- Its own `frequencyDays` / `recurrence` fields are preserved in the DB untouched.
- At runtime, `src/lib/timeblocks/effective-recurrence.ts` substitutes the
  timeblock's `recurrence`: `getEffectiveFrequencyDaysForHabit` derives the
  habit's active days from it, and `getEffectiveRecurrenceForRoutine` overrides
  the routine's own rule. `computeOccurrencesInRange` expands that rule into
  concrete dates for the weekly calendar.
- The UI hides the recurrence editor and shows an info banner pointing to the linked timeblock.
- If the timeblock is later detached, the original recurrence is restored automatically.

### Time box on tasks

- `timeboxMinutes: number | null` added to the `Task` type.
- UI: two `<Input type="number">` fields (hours + minutes) in `TaskMetadataSection`.
- On the `TasksCalendar` (`timeGridWeek` view), an `end` ISO timestamp is derived from `task.date + timeboxMinutes` and passed to FullCalendar so the event block visually spans the planned duration.
- A `formatTimebox` helper formats the value as "X sa Y dk" (hours + minutes).

### Timeblocks UI

- `/timeblocks` page: `TimeblocksBoard` shell with `TimeblocksSidebar` (board→swimlane grouping, active/archived toggle, context menu) and `TimeblocksWeeklyCalendar` (7-column hourly grid rendered via `computeOccurrencesInRange`).
- Navigation: a **Time Blocks** entry between Routines and Habits, defined in `src/lib/navigation/app-nav-items.ts`.
- `TimeblockEditDialog`: create/edit with board/swimlane picker, color, `startTime`/`endTime`, recurrence editor.

### Import / Export

- `ExportFileData` gains a `timeblocks: Timeblock[]` field.
- Schema version bumped **5 → 6**; the v5→v6 migration injects `timeblocks: []` and `docCounts.timeblocks: 0` for older backup files.
- All three import modes (merge, replace, append) handle timeblocks.
- `remapIdsForAppend` generates fresh IDs for timeblocks and re-maps their `swimlaneId`.

## Alternatives considered

- **Global timeblocks (not swimlane-scoped):** Rejected — habits/routines are already swimlane-scoped; a global timeblock would create orphaned cross-references and complicate the board selector UI.
- **Separate preset collection for timebox durations:** Rejected — `timeboxMinutes` as a plain nullable integer on Task is sufficient and avoids an extra collection and FK relationship.
- **Replace recurrence on timeblock attach:** Rejected — lossy; the override-but-keep approach allows non-destructive detach.

## Consequences

- `src/lib/timeblocks/effective-recurrence.ts` is the single place where an
  attached time block changes scheduling: the daily briefing
  (`DailyBriefingModal`), routine detail, the habits board and the time blocks
  calendar all read the effective recurrence from it.
- Existing backup files at schema ≤5 are automatically upgraded on import with an empty `timeblocks` array — no data loss.
- The `/timeblocks` calendar is independent of the tasks calendar; they share no state.
