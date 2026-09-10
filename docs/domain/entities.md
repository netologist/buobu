# Domain Entities

Types live in `src/lib/types.ts`. Every entity carries the optional `BaseEntity` metadata fields described at the bottom of this page.

## Entity Hierarchy

```
┌─────────┐
│  User   │  (Supabase account, or the Local User in Local Mode)
└────┬────┘
     │
     ▼
┌─────────┐     ┌───────────┐
│  Board  │────▶│ Swimlane  │
└─────────┘     └─────┬─────┘
                      │
   ┌──────────┬───────┼────────┬──────────┬───────────┐
   │          │       │        │          │           │
   ▼          ▼       ▼        ▼          ▼           ▼
┌──────┐ ┌────────┐ ┌──────┐ ┌───────┐ ┌───────┐ ┌──────────┐
│ Task │ │ Habit  │ │ Note │ │Routine│ │Time-  │ │ Bookmark │
└──────┘ └───┬────┘ └──────┘ └───┬───┘ │block  │ └──────────┘
             │                   │     └───────┘
             ▼                   ▼
        ┌──────────┐       ┌────────────┐
        │ HabitLog │       │ RoutineLog │
        └──────────┘       └────────────┘
```

`Mindmap`, `VisionBoardItem` and `BacklogItem` also hang off a swimlane; they are omitted from the diagram for width.

## Core Entities

### Board

Project or workspace container.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID v7 |
| name | string | Display name |
| description | string? | Optional description |
| columns | BoardColumn[] | Kanban columns (`id`, `title`, `order?`) |
| order | number? | Board sort position |
| weekStart | number? | 0=Sunday, 1=Monday |
| archiveColumnId | string? | Id of the column treated as the archive column |
| showArchiveColumn | boolean? | Whether that column is rendered |
| archived | boolean? | Archive status (explicit user action, unlike `_deleted`) |
| archivedAt | string? \| null | When the board was archived |
| naming | NamingLabels? | Board/swimlane label overrides |

### Swimlane

Sub-division within a Board for organizing work.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID v7 |
| boardId | string? | Parent board |
| name | string | Display name |
| description | string? | Optional description |
| label | string? | Badge label |
| currency | string | Currency for this swimlane's transactions |
| color | string? | Visual color |
| durationHours | number? | Time tracking default |
| pomodoroMinutes | number? | Pomodoro duration |
| breakMinutes | number? | Break duration |
| deadline | string? | Target date |
| order | number? | Sort position within the board |
| archived | boolean? | Archive status |
| archivedAt | string? \| null | When the swimlane was archived |

### Task

Kanban task card.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID v7 |
| boardId | string | Parent board |
| swimlaneId | string | Parent swimlane |
| columnId | string | Kanban column |
| title | string | Task title |
| description | string | Rich text content |
| labels | string[] | Tags |
| comments | TaskComment[] | Discussion entries (`id`, `text`, `createdAt`) |
| checklists | Checklist[] | Checklists of `ChecklistItem`s |
| transactions | TaskTransaction[] | Money in/out (`type`, `amount`, `currency`, `note?`, `date?`) |
| worklogs | TaskWorklog[] | Time tracking (`startedAt`, `endedAt`, `durationMinutes`, `breakMinutes?`) |
| pomodoros | number? | Completed pomodoro count |
| order | number? | Sort position within its column |
| date | string? \| null | Scheduled date |
| deadline | string? \| null | Due date |
| priority | 'low'\|'medium'\|'high' (or null) | Priority level |
| archived | boolean? | Archive status |
| archivedAt | string? \| null | When the task was archived |
| completedAt | string? \| null | When the task was completed |
| routineId | string? \| null | Routine that generated this task, if any |
| time | string? \| null | Start time as `HH:MM` |
| timeboxMinutes | number? \| null | Planned duration in minutes (time-box feature) |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

### Habit

Recurring habit to track.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID v7 |
| boardId | string | Parent board |
| swimlaneId | string | Parent swimlane |
| title | string | Habit name |
| color | string? | Visual color |
| order | number? | Sort position |
| breakHabit | boolean? | Habit being broken rather than built |
| frequencyDays | number[]? | Days of week (0=Sunday … 6=Saturday) |
| timeblockId | string? \| null | Timeblock that owns the schedule; `frequencyDays` is then overridden at runtime |
| sourceType | 'timeblock' \| null? | Set when the habit is derived from a timeblock |
| sourceTimeblockId | string? \| null | Originating timeblock |
| archived | boolean? | Archive status |
| archivedAt | string? \| null | When the habit was archived |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

### HabitLog

Daily habit entry.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID v7 |
| habitId | string | Parent habit |
| date | string | ISO date (`YYYY-MM-DD`) |
| value | number | 0–3 completion level; negative for a skipped day |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

### Routine

Recurring definition that generates tasks, events or payments.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID v7 |
| boardId | string | Parent board |
| swimlaneId | string | Parent swimlane |
| columnId | string | Column that generated tasks land in |
| title | string | Routine title |
| description | string? \| null | Optional description |
| type | 'task'\|'event'\|'payment' | What the routine produces |
| recurrence | RecurrenceRule | Schedule definition |
| timeblockId | string? \| null | Timeblock that owns the schedule; `recurrence` is then overridden at runtime |
| lastGeneratedAt | string? \| null | Last generation run |
| nextDueDate | string? \| null | Next due date |
| eventTime | string? \| null | `HH:MM` for the `event` type |
| paymentAmount | number? \| null | Amount for the `payment` type |
| paymentCurrency | string? \| null | Currency for the `payment` type |
| paymentType | 'income'\|'expense'\|null? | Direction of the payment |
| paymentNote | string? \| null | Note for the `payment` type |
| order | number? | Sort position |
| archived | boolean? | Archive status |
| archivedAt | string? \| null | When the routine was archived |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

`RecurrenceRule` carries `type` (`daily`, `weekly`, `monthly`, `yearly` or `custom`), `interval`, and the optional `daysOfWeek`, `dayOfMonth`, `monthOfYear` and `endDate` refinements.

### RoutineLog

One outcome of a routine for a given day.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID v7 |
| routineId | string | Parent routine |
| date | string | `YYYY-MM-DD` |
| status | 'approved'\|'skipped'\|'auto-processed' | Outcome |
| taskId | string? \| null | Task created by an approved or auto-processed run |
| createdAt | string | Creation timestamp |

### Timeblock

Named block of the day, optionally owning the schedule of the habits and routines attached to it.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID v7 |
| boardId | string | Parent board |
| swimlaneId | string | Parent swimlane |
| title | string | Timeblock name |
| description | string? \| null | Optional description |
| color | string? | Visual color |
| startTime | string | `HH:MM`, 24-hour |
| endTime | string | `HH:MM`, 24-hour |
| recurrence | RecurrenceRule | A two-weekly block is `{ type: 'weekly', interval: 2 }` |
| showAsHabit | boolean? | Render the block as a habit row |
| order | number? | Sort position |
| archived | boolean? | Archive status |
| archivedAt | string? \| null | When the timeblock was archived |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

### Note

Rich text note document.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID v7 |
| boardId | string | Parent board |
| swimlaneId | string | Parent swimlane |
| title | string | Note title |
| content | string | Markdown source rendered by the TipTap editor; exported files prepend YAML front matter |
| tags | string[] | Tags |
| references | string[] | Links to other entities |
| metadata | NoteMetadataField[]? | Typed key/value fields (`key`, `value`, `type`) |
| pinned | boolean? | Pin status |
| archived | boolean? | Archive status |
| archivedAt | string? \| null | When the note was archived |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

### Mindmap

Mind map document.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID v7 |
| boardId | string | Parent board |
| swimlaneId | string | Parent swimlane |
| title | string | Map title |
| nodes | MindmapNode[] | Flat node list with `parentId`, `label`, `color`, `x`, `y`, `order`, `collapsed?`, `direction?` |
| archived | boolean? | Archive status |
| archivedAt | string? \| null | When the mindmap was archived |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

### VisionBoardItem

Vision board (whiteboard) item.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID v7 |
| boardId | string | Parent board |
| swimlaneId | string | Parent swimlane |
| title | string | Item title |
| content | string? | Text content |
| excalidrawData | string? | Serialized Excalidraw scene |
| archived | boolean? | Archive status |
| archivedAt | string? \| null | When the item was archived |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

### Bookmark

Saved link with tags, comments and links to other entities.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID v7 |
| boardId | string | Parent board |
| swimlaneId | string | Parent swimlane |
| url | string | Original URL |
| urlNormalized | string | Normalised URL used for matching |
| domain | string | Host domain |
| title | string | Bookmark title |
| description | string | Description or excerpt |
| previewImage | string? | Preview image URL |
| favicon | string? | Favicon URL |
| siteName | string? | Site name |
| tags | string[] | Tags |
| comments | BookmarkComment[] | Threaded comments (`id`, `userId`, `content`, `createdAt`) |
| links | BookmarkLink[] | Links to other entities (`linkedType`, `linkedId`) |
| status | BookmarkStatus | `unread`, `reading`, `important`, `archived` or `favorite` |
| rating | number? | User rating |
| pinned | boolean? | Pin status |
| archived | boolean? | Archive status |
| archivedAt | string? \| null | When the bookmark was archived |
| metadataFetchStatus | 'pending'\|'success'\|'failed'\|'timeout'? | Result of the metadata fetch |
| metadataLastFetchedAt | string? | When metadata was last fetched |
| isBroken | boolean? | Marked as a dead link |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

### BacklogItem

Simple backlog item.

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID v7 |
| swimlaneId | string | Parent swimlane |
| text | string | Item text |
| archived | boolean? | Archive status |
| archivedAt | string? \| null | When the item was archived |
| createdAt | string | Creation timestamp |

## Base Entity Fields

Every entity is intersected with `Partial<BaseEntity>`, and `RxDBRepository` writes these fields on every create and update:

| Field | Type | Description |
|-------|------|-------------|
| user_id | string | Owning user id (the Local User id in Local Mode) |
| _modified | number | Millisecond timestamp used for pull ordering and conflict detection |
| _version | number | Incremented on update |
| _createdAt | string | ISO timestamp |
| _updatedAt | string | Last modification |
| _deleted | boolean | Soft delete flag |
| _deviceId | string | Identifier of the browser that made the change |

## Relationships Summary

| Entity | Parent | Children |
|--------|--------|----------|
| Board | - | Swimlane |
| Swimlane | Board | Task, Habit, Routine, Timeblock, Note, Mindmap, VisionBoardItem, Bookmark, BacklogItem |
| Task | Board, Swimlane | - |
| Habit | Board, Swimlane | HabitLog |
| HabitLog | Habit | - |
| Routine | Board, Swimlane | RoutineLog |
| RoutineLog | Routine | - |
| Timeblock | Board, Swimlane | - |
| Note | Board, Swimlane | - |
| Mindmap | Board, Swimlane | - |
| VisionBoardItem | Board, Swimlane | - |
| Bookmark | Board, Swimlane | - |
| BacklogItem | Swimlane | - |

## Related

- [Glossary](./glossary.md)
- [Architecture: Data Flow](../architecture/data-flow.md)
