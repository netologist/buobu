# Deep Linking & URL-First Navigation

**Status:** Implemented
**Related:** [inventory.md](inventory.md) (§2)

---

## Problem Statement

The app had inconsistent URL-based navigation:

- After login, users were always redirected to the tasks kanban view, ignoring where they last were.
- Board/swimlane selection was persisted to `localStorage` only — not shareable via URL.
- Resource detail views (notes, bookmarks, routines, …) had inconsistent or missing URL representations.
- Mindmaps and routines had no URL param for the selected resource at all.

---

## Goals

1. **Last-visited persistence** — After login, redirect the user to the last section they were in, not always to the default task view.
2. **Shareable resource URLs** — Every opened resource (note, bookmark, mindmap, whiteboard, routine, timeblock, habit, task) is reflected in the URL as a search param on its section route, e.g. `/notes?noteId=abc123`.
3. **Board/swimlane in URL** — The active board and swimlane selection is reflected in the URL (`?board=<id>&swimlanes=<id1,id2>`), enabling direct-link sharing.
4. **Static-export compatibility** — URLs must resolve on a static export; the app has no server, so all routing is client-side over the section routes in `src/app/`.

---

## Non-Goals

- Path-segment resource routes (`/notes/[noteId]`) — resource ids are transient and RxDB is IndexedDB-only, so each route would still be a client-side lookup with a loading state; the search param keeps every section a single static route.
- SSR resource hydration — there is no application server in production (`output: "export"`).
- Restoring a section the user has hidden — `post-login-path` skips nav items hidden in the navigation settings and falls back to the default view.

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| URL format for resources | Search param on the section route (`/notes?noteId=…`, `/tasks/kanban-view?taskId=…`) | Works with a static export; no dynamic segments to prerender |
| Last-visited granularity | Full href, including query string (e.g. `/notes?noteId=abc123`) | Restores a deep link after login |
| Board/swimlane URL format | `?board=<boardId>&swimlanes=<id1,id2>` | Search params are optional and additive; avoids deep path nesting |
| URL priority over localStorage | URL wins on mount | Enables link sharing to override the user's persisted selection |
| Tasks URL strategy | Keep `?taskId` (search param) on the kanban view | Cross-view access makes a path segment awkward |
| Route naming | Kebab-case (`/tasks/kanban-view`) | Matches `src/lib/navigation/app-nav-items.ts` |

---

## Implementation

### Phase 1 — Last-Visited Section Persistence

**Files:**
- `src/lib/constants.ts` — `STORAGE_KEYS.LAST_VISITED_PATH` (`"buobu_last_visited_path"`)
- `src/hooks/useLastVisitedPath.ts` — writes `globalThis.location.href` to localStorage on every navigation whose pathname starts with a known section prefix (`/tasks`, `/habits`, `/notes`, `/bookmarks`, `/mindmaps`, `/whiteboards`, `/routines`, `/timeblocks`, `/home`)
- `src/components/auth/AuthProvider.tsx` — mounts `useLastVisitedPath()`
- `src/lib/navigation/post-login-path.ts` — `getPostLoginPath(isMobile)` reads the stored href, accepts absolute URLs only when same-origin, validates the path against the section prefixes, excludes nav items the user has hidden, and otherwise falls back to the home page (when `NEXT_PUBLIC_HOME_PAGE_ENABLED` is on) or the default task view
- `src/lib/auth/service.ts` — clears `LAST_VISITED_PATH` on logout

**Behavior:**
- User visits `/notes?noteId=abc123`, closes the browser → reopens, logs in → lands on `/notes?noteId=abc123`
- User logs out → `buobu_last_visited_path` is cleared
- Invalid, hidden, or cross-origin stored paths fall back to the default post-login path

### Phase 2 — Resource Deep Links via Search Params

Each board component reads its resource param on mount and selects the matching resource; selecting or deselecting a resource then writes the param back with `globalThis.history.replaceState` (no new history entry).

| Section | Param | Component |
|---|---|---|
| Tasks (kanban) | `taskId` | `src/components/kanban/KanbanBoard.tsx` |
| Habits | `habitId` | `src/components/habits/HabitsBoard.tsx` |
| Notes | `noteId` | `src/components/notes/NotesBoard.tsx` |
| Bookmarks | `bookmarkId` | `src/components/bookmarks/BookmarksBoard.tsx` |
| Mindmaps | `mindmapId` | `src/components/mindmap/MindmapBoard.tsx` |
| Whiteboards | `whiteboardId` | `src/components/vision/VisionBoard.tsx` |
| Routines | `routineId` | `src/components/routines/RoutinesBoard.tsx` |
| Time Blocks | `timeblockId` | `src/components/timeblocks/TimeblocksBoard.tsx` |

`src/lib/navigation/search-context.ts` declares the same params as `SEARCH_SCOPED_FILTER_KEYS`, so the global search palette can set them to scope results to a resource and clear them when the context ends.

### Phase 3 — Board/Swimlane URL Sync

**Hook:** `src/hooks/useBoardSwimlaneUrlSync.ts`

Behavior:
- **On mount:** If `?board=<id>` is present in the URL, it overrides the localStorage-persisted selection; `?swimlanes=` then selects those swimlanes.
- **On selection change:** writes `?board` and `?swimlanes` with `history.replaceState`, so no history entries are added.
- **All-selected state:** when no specific board is selected, `?board` and `?swimlanes` are removed from the URL.

**Applied via:**
- `src/hooks/useBoardBase.ts` — covers Tasks kanban, Tasks list, Cash Flow, Habits, Routines, Notes, Bookmarks and Time Blocks
- `src/components/mindmap/MindmapBoard.tsx` — applied directly
- `src/components/vision/VisionBoard.tsx` — applied directly

---

## URL Examples

| Scenario | URL |
|----------|-----|
| Notes section | `/notes` |
| Specific note open | `/notes?noteId=abc-123` |
| Notes with board filter | `/notes?board=board-1` |
| Notes + board + swimlane filter | `/notes?board=board-1&swimlanes=lane-1,lane-2` |
| Specific note + board filter | `/notes?noteId=abc-123&board=board-1` |
| Bookmark | `/bookmarks?bookmarkId=xyz-456` |
| Mindmap | `/mindmaps?mindmapId=map-789` |
| Whiteboard | `/whiteboards?whiteboardId=wb-321` |
| Routine | `/routines?routineId=rt-654` |
| Time block | `/timeblocks?timeblockId=tb-987` |
| Task | `/tasks/kanban-view?taskId=t-1` |
| Cash Flow view | `/tasks/cash-flow-view` |
| Task list view | `/tasks/list-view` |
| Task calendar view | `/tasks/calendar-view` |

---

## Verification Checklist

- [ ] Click a note → address bar gains `?noteId=<id>`; deselect → param is removed
- [ ] Open `/notes?noteId=<id>` directly → that note is selected
- [ ] Browser back after selecting a resource → the previous page is restored (param writes use `replaceState`, so selections add no history entries)
- [ ] Login after being on `/habits` → lands on `/habits`
- [ ] Logout → `buobu_last_visited_path` is cleared from localStorage
- [ ] Select a board → URL gains `?board=<id>`
- [ ] Copy URL with `?board=<id>`, open in a new tab → same board is selected
- [ ] Select specific swimlanes → URL gains `?board=<id>&swimlanes=<id1,id2>`
- [ ] Open `/tasks/kanban-view?taskId=<id>` → the task detail panel opens for that task
- [ ] Open `/mindmaps?mindmapId=<id>` → the mindmap editor is visible
- [ ] Open `/routines?routineId=<id>` → the routine detail view is shown
