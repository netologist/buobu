# Architecture Overview

buobu is a **local-first** productivity application: every read and write goes to an
in-browser database first, and a remote backend is an optional addition rather than the
primary store.

## High-Level Design

### Core Principles

1. **Offline-first** — the application is fully usable with no network connection.
2. **Device ownership** — data lives in the browser's IndexedDB; the user can export it
   as a single file at any time.
3. **Cloud is optional** — sync is a separately entitled feature. In Local Mode the
   application runs with no backend at all.
4. **Reactive reads** — the UI subscribes to database queries, so a local write or an
   incoming synced change re-renders the affected views without a request round-trip.

### Deployment Shape

`next.config.ts` sets `output: "export"`, so a deployed build is a **static export in
`out/`**. There is no application server in the deployed artifact and no server-side
rendering: everything, including data access, happens in the browser.

The only route handlers are `src/app/api/stripe/{checkout,portal,webhook}`. They are
server-only and execute **only under `pnpm dev`** — they are dead code in a static
export, as are the Supabase admin helpers that require `SUPABASE_SERVICE_ROLE_KEY`.
Bookmark metadata is fetched by the `fetch-bookmark-metadata` Supabase Edge Function,
not by a Next.js route.

## System Components

### Frontend (Client)

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | Next.js 16 | Static export; client-rendered React |
| UI | React 18.3.1 | Components and hooks |
| Styling | Tailwind CSS 4 | Utility-first CSS with shadcn/Radix primitives |
| Local database | RxDB over IndexedDB, via the Dexie storage (`getRxStorageDexie`) | Reactive queries, soft deletes |
| State | Zustand stores plus Jotai atoms | In-memory application state |
| Editor | TipTap | Rich text editing in notes |
| Diagrams | Excalidraw | Whiteboard / vision board items |
| Calendars and drag-and-drop | FullCalendar, dnd-kit | Calendar views and reorderable lists |

### Backend (Supabase, Cloud Mode only)

| Component | Technology | Purpose |
|-----------|------------|---------|
| Auth | Supabase Auth | User authentication and sessions |
| Database | Supabase Postgres | Per-user application data, guarded by RLS |
| Storage | Supabase Storage | Avatar uploads |
| Realtime | Supabase Realtime | Websocket notification that remote rows changed |
| Sync | RxDB replication over PostgREST | Bidirectional document replication |

Additional Cloud Mode services:

- **Stripe** for billing. Server-only routes `src/app/api/stripe/{checkout,portal,webhook}`
  run only under `pnpm dev`.
- **Cloudflare Workers** in `workers/mcp` (MCP endpoint) and `workers/referral`
  (referral API). Neither declares D1, R2, KV or Durable Object bindings.

## Data Hierarchy

Boards are the top-level container; swimlanes belong to a board, and every work item
belongs to a swimlane. Habits and routines own their own log rows.

```
User
 └── Board (project / workspace, owns kanban columns)
      └── Swimlane (category within a board)
           ├── Task          (has columnId, points at a board column)
           ├── Habit ──────▶ HabitLog
           ├── Routine ────▶ RoutineLog
           ├── Timeblock
           ├── BacklogItem
           ├── Note
           ├── Bookmark
           ├── Mindmap
           └── VisionBoardItem
```

`Board` also carries its kanban `columns` (each with an id, title and order) and the
swimlane naming labels. See `src/lib/types.ts` for the authoritative shapes.

## Key Files

| Path | Purpose |
|------|---------|
| `src/lib/rxdb.ts` | RxDB database creation, Dexie storage and collection schemas |
| `src/lib/rxdb-repository.ts` | CRUD repository over the collections, including soft delete |
| `src/lib/db.ts` | Collection-level accessors used by the stores |
| `src/lib/supabase-replication.ts` | RxDB ⇄ Supabase replication and the Realtime resync socket |
| `src/lib/supabase.ts` | Supabase client creation and environment validation |
| `src/lib/types.ts` | Entity and `BaseEntity` type definitions |
| `src/lib/feature-flags.ts` | Build-time mode, billing and feature-flag constants |
| `src/stores/hooks/use-rx-subscription.ts` | Bridges RxDB reactive queries into Jotai atoms |
| `supabase/migrations/` | Postgres schema, tables and RLS policies |

## Related

- [Data Flow](./data-flow.md)
- [Local-First Strategy](./local-first.md)
- [Authentication](../tech-stack/authentication.md)
- [Local Mode decision record](../adr/014-local-mode.md)
- [Glossary](../domain/glossary.md)
