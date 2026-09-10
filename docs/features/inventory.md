# Feature Inventory — Current State of the buobu App

**Last reviewed:** 2026-09-10
**Purpose:** A readable inventory of what the **currently shipped** application actually contains, organized by the user-facing navigation surface.
**Relationship to other docs:** This is the map of everything that ships. Individual features are documented in depth by their own design docs in this folder ([deep-linking-and-routing.md](deep-linking-and-routing.md), [notes-markdown-import-export.md](notes-markdown-import-export.md)); where a feature has no such doc, §5 records the gap.

---

## 1. Product Identity

| Item | Value |
|---|---|
| Name | **buobu** (`package.json` v0.2.0) |
| Type | Local-first personal productivity workspace |
| Stack | Next.js 16.1.6 (App Router) · React 18.3.1 · TypeScript · Tailwind 4 · shadcn/ui (Radix) · RxDB over IndexedDB (Dexie storage) · Supabase (auth + replication) · Stripe (billing) · Cloudflare Workers (MCP + referrals) |
| Data model | User-scoped **Boards → Swimlanes → entities** (tasks, habits, routines, notes, bookmarks, mindmaps, whiteboards, time blocks) |
| Device strategy | Responsive web (mobile bottom-nav + FAB + resource gates), CSR for data-heavy routes, deployed as a static export (`output: "export"` → `out/`) |

---

## 2. Primary Feature Areas (from `src/lib/navigation/app-nav-items.ts`)

These are the apps the user reaches from the top/bottom navigation.

### 2.1 Tasks — `src/app/tasks/*`

Four interchangeable **views** over the same task data, scoped to board/swimlane:

| View | Route | Purpose | Status |
|---|---|---|---|
| Kanban | `/tasks/kanban-view` | Boards → swimlanes → columns; drag-and-drop (dnd-kit) | ✅ Core |
| List | `/tasks/list-view` | Flat grouped task list | ✅ Core |
| Calendar | `/tasks/calendar-view` | FullCalendar of scheduled/deadline tasks | ✅ Core |
| Cash Flow | `/tasks/cash-flow-view` | Income/expense transactions tied to tasks, monthly charts, currency, per-task totals | ⚠️ Built & in nav, **no feature doc** |

Task capabilities: create/edit/move/archive, title-required validation, checklists, priority, scheduled date + deadline, time-box duration (`timeboxMinutes`), backlog capture, per-task worklogs and transactions.

### 2.2 Routines — `/routines`

Recurring rules (`task`, `event` and `payment` types), due detection via `nextDueDate`, daily-briefing approve/skip, optional generated-task linkage (`RoutineLog.taskId`, `Task.routineId`), idempotent per-date processing, archive.

### 2.3 Time Blocks — `/timeblocks`

Recurring time blocks (recurrence rule, start/end time), an optional `showAsHabit` toggle that projects the timeblock into a habit, weekly calendar placement, and side panels listing the habits and routines linked to a block.

### 2.4 Habits — `/habits`

Frequency days, daily logs (4-state cycle + long-press skip), streak/completion stats, 365-day GitHub-style grid, archive, history preservation on edit. A habit linked to a timeblock has its recurrence driven by that timeblock at runtime.

### 2.5 Notes — `/notes` (deep link `?noteId=`)

Tiptap rich-text editor (markdown internal), tags, pin, **metadata panel** (id/created/updated/swimlane/pinned, custom key–value metadata fields, references), **markdown import/export with YAML frontmatter**, multi-color highlights, safe-content sanitization (DOMPurify). Math (KaTeX) + code blocks available.

### 2.6 Bookmarks — `/bookmarks` (deep link `?bookmarkId=`)

Save URL, normalized domain, metadata fetch (title/description/favicon) with failure handling, status lifecycle (unread/reading/important/favorite/archived), comments and links to other resources, archive.

### 2.7 Whiteboards — `/whiteboards` (deep link `?whiteboardId=`)

Excalidraw-based drawing canvas, opaque drawing payload, text content, archive.

### 2.8 Mindmaps — `/mindmaps` (deep link `?mindmapId=`)

Node tree (parent/child), label + color, persisted layout positions, archive, invalid-reference repair.

---

## 3. Cross-Cutting & Platform Features

| Feature | Location | Status |
|---|---|---|
| **Home dashboard** | `/home` (`HomeDashboard`), behind `NEXT_PUBLIC_HOME_PAGE_ENABLED`; linked from the app header, not the primary nav | ⚠️ Built, **no feature doc** |
| **Global search palette** | `src/components/ui/global-search-palette.tsx` (cmdk) | ⚠️ Built, **no feature doc** |
| **Compact navigation + cross-board swimlane search** | `src/components/layout/Compact*` | ✅ Core |
| **Deep linking / URL-first routing** | Resource selection in search params (`?noteId=`, `?bookmarkId=`, `?taskId=`, …), board/swimlane in `?board=&swimlanes=` | ✅ Documented in `deep-linking-and-routing.md` |
| **Authentication** | Supabase email + OAuth, CSRF state, session restore, forgot/reset password | ✅ Core |
| **Onboarding** | First-run workspace bootstrap, persisted completion | ✅ Core |
| **Import / Export** | Versioned data ownership package (`schemaVersion`), integrity checksum, preview, validation | ✅ Core |
| **Archive** | Cross-entity soft-archive + restore | ✅ Core |
| **Billing & entitlements** | Stripe checkout + portal, webhook idempotency, free caps, behind `NEXT_PUBLIC_BILLING_ENABLED` | ✅ Built (flag-gated) |
| **Referrals / invite codes** | Cloudflare Worker, behind `NEXT_PUBLIC_INVITE_CODES_ENABLED` | ✅ Built (flag-gated) |
| **MCP / API keys** | Cloudflare Worker, scoped keys (hash-only storage), rate limits | ✅ Built |
| **Mobile UX** | Bottom nav, FAB, `MobileResourceGate`, responsive layouts | ✅ Implicit core |
| **Feature flags** | `src/lib/feature-flags.ts` (local mode, billing, home, storage indicator, invite codes) | ✅ Core infra |

---

## 4. Release Status Summary

- **Core, shipped:** auth, onboarding, workspace (boards/swimlanes/columns), tasks (kanban/list/calendar), habits, routines, notes, bookmarks, whiteboards, mindmaps, time blocks, archive, import/export, local-first RxDB storage, deep linking.
- **Shipped without a dedicated feature doc:** Time Blocks, Bookmarks, Whiteboards, Mindmaps, Cash Flow/Transactions, Home dashboard, global search palette.
- **Commercial / growth:** billing, referrals/invite codes, MCP/API keys.
- **Behind a flag / opt-in:** home dashboard (`NEXT_PUBLIC_HOME_PAGE_ENABLED`), billing (`NEXT_PUBLIC_BILLING_ENABLED`), invite codes (`NEXT_PUBLIC_INVITE_CODES_ENABLED`); the storage indicator is shown unless `NEXT_PUBLIC_STORAGE_INDICATOR_ENABLED=false`.

---

## 5. Documentation Gaps (2026-09-10)

| # | Gap | Evidence |
|---|---|---|
| G1 | **Cash Flow / Transactions** has no design doc, yet is in the primary nav | `src/app/tasks/cash-flow-view/page.tsx`, `src/components/transactions/`, listed in `app-nav-items.ts` |
| G2 | **Home dashboard** has no design doc; only a feature flag controls it | `src/components/home/HomeDashboard.tsx`, `feature-flags.ts` |
| G3 | **Global search palette** has tests but no design doc | `src/components/ui/global-search-palette.tsx`, `src/components/ui/__tests__/global-search-palette.test.tsx` |

---

## 6. How to keep this file accurate

- When a feature gains a design doc in this folder, link it from §2/§3 and drop the corresponding §5 row.
- When a new top-level nav item is added to `app-nav-items.ts`, add a §2 row here.
- When a feature moves between flag-gated and always-on, update its §3 "Status" cell and §4 bucket.
