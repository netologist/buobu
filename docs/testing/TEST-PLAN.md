# Test Plan

> Quality target: **≥80% code coverage** (statements, branches, functions, lines)
> Stack: Vitest 4 · @testing-library/react · Playwright · fake-indexeddb · MSW
>
> **How to run the suites:** [Setup — Testing](../setup/testing.md). That page is
> the operational reference (commands, environment variables, Node version, skip
> behaviour); this document records the strategy and the coverage targets.

---

## Table of Contents

1. [Philosophy](#1-philosophy)
2. [Coverage Targets](#2-coverage-targets)
3. [Test Pyramid Architecture](#3-test-pyramid-architecture)
4. [Tooling & Infrastructure](#4-tooling--infrastructure)
5. [Infrastructure (in place)](#5-infrastructure-in-place)
6. [Unit Tests](#6-unit-tests)
7. [Integration Tests](#7-integration-tests)
8. [Acceptance Tests (E2E)](#8-acceptance-tests-e2e)
9. [Coverage Enforcement](#9-coverage-enforcement)
10. [Checklist](#10-checklist)

---

## 1. Philosophy

This is a **client-first offline application** with a complex local database (RxDB/Dexie), server sync (Supabase), and rich state management (Zustand + Jotai). The test strategy must reflect that:

- **Logic without UI is the easiest to break and the hardest to notice.** Every pure function, every store reducer, every DB operation gets a unit test first.
- **Components are integration surfaces.** Test component behaviour through user interactions, not implementation details.
- **E2E tests guard critical flows.** They are expensive — use them for paths where a regression would be catastrophic (auth, data persistence, sync).
- **No mocked code in production paths.** Mocks are explicitly typed; any mock drift breaks the build.

---

## 2. Coverage Targets

| Layer | Min Coverage | Rationale |
|---|---|---|
| `src/lib/` | **90%** | Pure logic, DB API, auth — zero tolerance for silent bugs |
| `src/stores/` | **85%** | State transitions are invisible to users but cause cascading failures |
| `src/components/` | **75%** | UI behaviour matters; render-only code is lower risk |
| `src/app/` (pages) | **70%** | Routing + guard logic; visual markup excluded |
| **Global** | **≥80%** | Aggregate goal — see [Coverage Enforcement](#9-coverage-enforcement) |

Excluded from coverage in `vitest.config.ts`:
- `src/components/ui/**` — shadcn primitives, not our logic
- `src/**/*.d.ts`, `src/**/types.ts`
- `src/test/**`
- `src/app/**/*.tsx` — page files, routing/markup only
- `src/**/*.stories.{ts,tsx}`

---

## 3. Test Pyramid Architecture

```
               ┌─────────────────────────┐
               │   Acceptance / E2E      │  ~10%  (Playwright)
               │  (10–15 critical flows) │
               └─────────────────────────┘
          ┌──────────────────────────────────────┐
          │       Integration Tests              │  ~25%  (Vitest + RTL)
          │  (components + hooks + stores)       │
          └──────────────────────────────────────┘
   ┌─────────────────────────────────────────────────────┐
   │                   Unit Tests                        │  ~65%  (Vitest)
   │  (lib/, stores/, atoms/, recurrence, db, auth)      │
   └─────────────────────────────────────────────────────┘
```

---

## 4. Tooling & Infrastructure

### 4.1 Dependencies

All test dependencies are already in `package.json` `devDependencies`:

| Package | Version | Purpose |
|---|---|---|
| `vitest` | ^4.1.0 | Unit + integration test runner |
| `@vitest/coverage-v8` | ^4.1.1 | V8 coverage provider |
| `@testing-library/react` | ^16.3.2 | Component rendering |
| `@testing-library/user-event` | ^14.6.1 | User-interaction simulation |
| `@testing-library/jest-dom` | ^6.9.1 | DOM matchers |
| `jsdom` | ^29.0.1 | DOM environment |
| `fake-indexeddb` | ^6.2.5 | IndexedDB polyfill for RxDB/Dexie |
| `msw` | ^2.12.14 | Network mocking |
| `@playwright/test` | ^1.58.2 | E2E runner |
| `@vitejs/plugin-react` | ^6.0.1 | React JSX transform for Vitest |
| `dotenv` | ^17.3.1 | Loads `.env.local` / `.env` for Playwright |

Scripts (from `package.json`):

```bash
pnpm test           # vitest (watch)
pnpm test:run       # vitest run
pnpm test:coverage  # vitest run --coverage
pnpm test:e2e       # playwright test
pnpm test:e2e:ui    # playwright test --ui
```

### 4.2 vitest.config.ts

```ts
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/__tests__/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/components/ui/**',
        'src/**/*.d.ts',
        'src/**/types.ts',
        'src/test/**',
        'src/app/**/*.tsx',
        'src/**/*.stories.{ts,tsx}',
      ],
      // thresholds are currently commented out — see §9
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

### 4.3 src/test/setup.ts

The setup file runs before every suite and does four things:

1. **Sets environment variables before any module import** — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_BILLING_ENABLED=true`, so `@/lib/supabase` does not throw at module load.
2. **Registers DOM matchers and the IndexedDB polyfill** — `@testing-library/jest-dom` and `fake-indexeddb/auto`.
3. **Stubs the environment** — `next/navigation`, `next/image`, `@/lib/supabase` (via `createSupabaseMock()` from `src/test/mocks/supabase.ts`), `window.matchMedia`, `ResizeObserver`, `IntersectionObserver`, `URL.createObjectURL`, `URL.revokeObjectURL`.
4. **Resets state per test** — marks the DailyBriefing toast as dismissed for today in `beforeEach` (its fixed overlay would otherwise intercept pointer events), then clears mocks and `localStorage`/`sessionStorage` in `afterEach`.

Individual tests override specific stubs, e.g. `vi.mocked(supabase.auth.getUser).mockResolvedValue(...)`.

### 4.4 playwright.config.ts

```ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

The config loads `.env.local` first and `.env` second through `dotenv`.

### 4.5 Shared Test Utilities

`src/test/factories.ts` exports one factory per entity, plus `TEST_USER_ID` and `buildKanbanPerformanceFixture()`:

- **Board** — `makeBoard`, `makeBoardColumn`
- **Swimlane** — `makeSwimlane`
- **Task** — `makeTask`, `makeTaskComment`, `makeChecklist`, `makeChecklistItem`, `makeTaskTransaction`, `makeTaskWorklog`
- **Backlog** — `makeBacklogItem`
- **Habit** — `makeHabit`, `makeHabitLog`
- **Recurrence** — `makeRecurrenceRule`
- **Routine** — `makeRoutine`, `makeRoutineLog`
- **Note** — `makeNote`
- **Bookmark** — `makeBookmark`
- **Mindmap** — `makeMindmap`, `makeMindmapNode`
- **Vision board** — `makeVisionBoardItem`

Each factory accepts `Partial<T>` overrides and fills the sync bookkeeping fields from `BaseEntity`; use them instead of hand-written object literals so a new required field does not break every suite at once.

Two further helpers exist: `src/test/helpers/rxdb.ts` (in-memory RxDB instance) and `src/test/helpers/render.tsx` (provider wrapper for component tests), plus the Supabase mock in `src/test/mocks/supabase.ts`.

---

## 5. Infrastructure (in place)

These files exist in the repository; nothing here needs to be created before writing tests.

| Path | What it provides |
|---|---|
| `vitest.config.ts` | jsdom environment, `globals`, `setupFiles`, include/exclude globs, V8 coverage config, `@` alias |
| `playwright.config.ts` | `./e2e` test dir, three browser projects, `pnpm dev` web server on port 3000, `.env.local`/`.env` loading |
| `src/test/setup.ts` | Environment variables, jest-dom matchers, `fake-indexeddb/auto`, framework stubs, per-test reset |
| `src/test/factories.ts` | One entity factory per domain type, plus `TEST_USER_ID` and `buildKanbanPerformanceFixture()` |
| `src/test/mocks/supabase.ts` | `createSupabaseMock()`, `makeSupabaseUser()`, `makeSupabaseSession()`, `mockAuthenticatedUser()` |
| `src/test/helpers/rxdb.ts` | `createTestDb()` / `destroyTestDb(db)` — in-memory RxDB over `fake-indexeddb` |
| `src/test/helpers/render.tsx` | `renderWithProviders()` (also re-exported as `render`), re-exports Testing Library |
| `e2e/fixtures/auth.ts` | `authenticatedPage` fixture and a `loginViaUI` helper, driven by `E2E_TEST_*` environment variables |
| `e2e/` | Spec directories `auth/`, `tasks/`, `habits/`, `routines/`, `notes/`, `bookmarks/`, `data/`, `sync/` |

Scripts are declared in `package.json` (`test`, `test:run`, `test:coverage`, `test:e2e`, `test:e2e:ui`).

Coverage thresholds are **present but commented out** in `vitest.config.ts`; see [§9](#9-coverage-enforcement) for the current enforcement status.

---

## 6. Unit Tests

> Target: **≥90% coverage on `src/lib/`**, **≥85% on `src/stores/`**

### 6.1 src/lib/ — Core Library

#### UNIT-LIB-01: `src/lib/utils.ts`
File: `src/lib/__tests__/utils.test.ts`
Test cases:
- `cn()` merges class names correctly
- `cn()` handles conditional classes (falsy values ignored)
- `cn()` resolves Tailwind conflicts via tailwind-merge
- Any other exported utilities (formatters, validators)

#### UNIT-LIB-02: `src/lib/uuid.ts`
File: `src/lib/__tests__/uuid.test.ts`
Test cases:
- `uuidv7()` embeds the current timestamp and a per-millisecond counter (the implementation uses an 8-5-3-3-14 layout)
- Sequential calls within one millisecond stay lexicographically increasing
- `uuidv7()` is unique across 1000 calls
- `generateId()` delegates to `uuidv7()`
- `isValidId()` accepts generated ids and rejects malformed ones

#### UNIT-LIB-03: `src/lib/date.ts`
File: `src/lib/__tests__/date.test.ts`
Test cases:
- All exported date formatting/parsing functions
- Timezone edge cases (UTC, local time)
- Invalid date input handling
- Date range functions (if any)

#### UNIT-LIB-04: `src/lib/naming.ts`
File: `src/lib/__tests__/naming.test.ts`
Test cases:
- `getPresetKey()` maps preset label sets to their key and returns `'custom'` otherwise
- `DEFAULT_NAMING` is the `default` preset
- `PRESET_OPTIONS` covers every key in `NAMING_PRESETS` plus `custom`

#### UNIT-LIB-05: `src/lib/recurrence.ts`
File: `src/lib/__tests__/recurrence.test.ts`
Existing coverage, plus the gaps below:
- Existing suite covers the main recurrence rules
- `computeNextDueDate` with `null`/`undefined` rule → returns null
- `type: 'none'` or missing type → graceful handling
- Negative interval → error or null
- `interval: 0` edge case
- Very large intervals (interval: 365 for daily)
- Complete coverage of all branches in the implementation

#### UNIT-LIB-06: `src/lib/device-id.ts`
File: `src/lib/__tests__/device-id.test.ts`
Test cases:
- `getDeviceId()` returns the same id across calls within a session
- The id persists across module reloads (backed by `STORAGE_KEYS.DEVICE_ID`)
- `resetDeviceId()` clears it so the next call generates a fresh one

#### UNIT-LIB-07: `src/lib/migration.ts`
File: `src/lib/__tests__/migration.test.ts`
Test cases:
- `checkMigrationNeeded(userId)` returns false when the legacy database is absent
- `checkMigrationNeeded(userId)` returns true when legacy data exists for that user
- `migrateFromOldDB(userId)` copies legacy records into the new database
- `migrateFromOldDB()` is idempotent — a second run does not duplicate records
- `checkSeedBoardsNeeded(db)` / `seedBoardsFromJSON(db)` seed when empty and skip when not

#### UNIT-LIB-08: `src/lib/onboarding-state.ts`
File: `src/lib/__tests__/onboarding-state.test.ts`
Test cases:
- `hasAnyCoreData(db)` returns false for a fresh database
- `hasAnyCoreData(db)` returns true as soon as any core collection has a row
- Covered for each core collection (tasks, habits, notes, bookmarks, mindmaps, routines, timeblocks, vision items, backlog)

#### UNIT-LIB-09: `src/lib/rxdb-repository.ts`
File: `src/lib/__tests__/rxdb-repository.test.ts`
Setup: Use `createTestDb()` from `src/test/helpers/rxdb.ts`
Test cases (the repository mirrors the `src/lib/db.ts` surface):
- `putTask()` inserts a document and returns it, stamped with `user_id`, `_version`, `_createdAt`, `_updatedAt`, `_deviceId`
- `putTask()` on an existing id patches the document and increments `_version`
- `getTasksByBoard()` / `getTasksBySwimlane()` filter and exclude `_deleted: true` documents
- `deleteTask()` sets `_deleted: true` rather than removing the document
- `getBoardById()` returns the board, `null` for a missing id
- `putBoard()` / `putSwimlane()` persist columns and swimlane `order`
- `deleteSwimlane()` refuses to delete the last swimlane of a board unless `skipLastGuard` is set
- `putHabit()` / `putHabitLog()` / `putNote()` / `putBookmark()` round-trip
- Auth guard: methods reject when the repository has no `userId`

#### UNIT-LIB-10: `src/lib/db.ts` (the data-access façade)
File: `src/lib/__tests__/db.test.ts`
Setup: In-memory RxDB plus a mocked `getUser()` returning a test user
Test cases (grouped by entity; every function below exists in `src/lib/db.ts`):

**Auth guard:**
- Calling any exported function without a cached user throws `Error('User must be authenticated to access database')`

**Boards:**
- `putBoard()` creates with the given name and returns the board
- `getAllBoards()` returns all non-deleted boards
- `getBoardById()` returns the board, `null` for an unknown id
- `deleteBoard()` soft-deletes; `permanentDeleteBoard()` removes
- `archiveBoard()` / `unarchiveBoard()` toggle `archived`

**Swimlanes:**
- `getSwimlanesByBoard()` returns only that board's swimlanes
- `putSwimlane()` persists field updates; `getSwimlaneById()` reads them back
- `deleteSwimlane()` soft-deletes; `permanentDeleteSwimlane()` removes
- `archiveSwimlane()` / `unarchiveSwimlane()` toggle `archived`

**Tasks:**
- `putTask()` stores boardId/swimlaneId/columnId and returns nothing
- `putTasks()` writes a batch
- `getAllTasks()` excludes `_deleted` documents
- `getTasksByBoard()` / `getTasksBySwimlane()` filter correctly
- `deleteTask()` soft-deletes

**Habits:**
- `putHabit()` creates; `getHabitsByBoard()` / `getHabitsBySwimlane()` filter
- `putHabitLog()` writes a log; `getHabitLogsByHabit()` reads it back; `getAllHabitLogs()` returns every log
- `deleteHabitLog()` / `deleteHabit()` soft-delete

**Notes / Bookmarks / Mindmaps / Vision items:**
- `putNote()` / `putBookmark()` / `putMindmap()` / `putVisionItem()` create and update
- The matching `getByBoard` / `getBySwimlane` / `getAll` getters filter correctly
- The matching delete functions soft-delete

**Routines:**
- `putRoutine()` creates; `getRoutinesBySwimlane()` filters; `archiveRoutine()` toggles archive
- `putRoutineLog()` writes a log; `getRoutineLogsByRoutine()` / `getAllRoutineLogs()` read them back
- `deleteRoutineLog()` / `deleteRoutine()` soft-delete

**Time blocks:**
- `putTimeblock()` creates; `getTimeblocksBySwimlane()` filters
- `getHabitsByTimeblock()` / `getRoutinesByTimeblock()` return linked items
- `archiveTimeblock()` / `unarchiveTimeblock()` / `permanentDeleteTimeblock()` / `detachFromTimeblock()`

**Backlog:**
- `putBacklogItem()` / `getBacklogBySwimlane()` / `getBacklogCountsBySwimlane()` / `deleteBacklogItem()`

**Change tracking:**
- Every write triggers `markLocalChange()` and `queueSync()`; reads do not

#### UNIT-LIB-11: `src/lib/auth/service.ts`
File: `src/lib/__tests__/auth/service.test.ts`
Setup: Mock `@/lib/supabase` with `createSupabaseMock()`
Test cases:
- `login()` calls `supabase.auth.signInWithPassword` with the email, password and optional captcha token
- `login()` returns the mapped user on success; throws on invalid credentials
- `logout()` calls `supabase.auth.signOut` and clears the cached user
- `getUser()` returns the cached user synchronously (and `null` when nothing is cached)
- `getSessionUser()` reads the Supabase session and refreshes the cache
- `hasPersistedSession()` reports whether a Supabase auth token is present
- `register()` forwards the campaign/invite code and captcha token
- `loginWithOAuth('google')` initiates the OAuth flow
- `getLinkedIdentities()` lists provider identities
- `linkGoogleAccount()` links a Google identity; `unlinkGoogleAccount(identityId)` removes one
- `uploadAvatar(userId, file)` rejects extensions outside .jpg/.jpeg/.png/.webp
- `uploadAvatar()` calls `storage.from('avatars').upload` with the `{userId}/avatar.{ext}` path and returns the public URL
- `removeAvatar(userId)` deletes from Supabase Storage
- `updateEmail()` / `updatePassword()` call the matching Supabase auth methods
- `sendPasswordResetEmail()` calls `supabase.auth.resetPasswordForEmail`

#### UNIT-LIB-12: `src/lib/supabase-replication.ts`
File: `src/lib/__tests__/supabase-replication.test.ts`
Setup: Mock supabase, use in-memory RxDB
Test cases:
- Pull replication reads the PostgREST tables in `_modified`/`id` order and resumes from the stored checkpoint
- Pull replication applies remote documents to local RxDB
- Push replication sends local changes to Supabase
- Push conflict handling: when the remote `_modified` differs from the one the local write assumed, the conflict handler resolves it
- `markLocalChange(userId)` marks the user as having unpushed changes
- `isSupabaseReplicationPaused(userId)` gates replication (used by the sync store and the entitlement gate)
- `startSupabaseReplication(db, userId)` starts replication for every collection; `stopSupabaseReplication(userId)` / `stopAllSupabaseReplications()` tear it down
- `getSyncStatus()`, `subscribeSyncStatus()`, `awaitInitialSync()` report progress
- `triggerSupabaseResync()` forces a re-run; `acknowledgeRemoteChanges()` clears the remote-change flag
- Network errors surface through the sync status rather than throwing

### 6.2 src/stores/ — State Management

#### UNIT-STORE-01: `src/stores/auth-store.ts`
File: `src/stores/__tests__/auth-store.test.ts`
Test cases:
- Initial state: `user: null`, `isLoading: true`, `isAuthenticated: false`
- `setAuthState({ user, isLoading })` stores the user and derives `isAuthenticated`
- `setAuthState({ user: null, isLoading: false })` leaves `isAuthenticated` false
- `resetAuthState()` returns to `{ user: null, isLoading: true, isAuthenticated: false }`

#### UNIT-STORE-02: `src/stores/db-store.ts`
File: `src/stores/__tests__/db-store.test.ts`
Test cases:
- Initial state: `db: null`, `isLoading: true`, `error: null`
- `initialize(userId)` opens the database and stores the instance
- `initialize()` runs the legacy migration when `checkMigrationNeeded()` is true
- `initialize()` failure stores the `Error` in `error` and clears `isLoading`
- `reset()` returns to `{ db: null, isLoading: true, error: null }`

#### UNIT-STORE-03: `src/stores/board-store.ts`
File: `src/stores/__tests__/board-store.test.ts`
Test cases:
- `loadBoards()` loads boards and their swimlanes and clears `isLoading`
- `putBoard()` / `deleteBoard()` write through `lib/db` and reload
- `putSwimlane()` / `deleteSwimlane()` write through `lib/db` and reload swimlanes
- `archiveBoard()` / `unarchiveBoard()` / `permanentDeleteBoard()` and the swimlane equivalents
- `reorderBoards()` / `reorderSwimlanes()` update local state optimistically, then persist `order`
- `reorderColumns()` rewrites the board's `columns` array
- `moveSwimlane()` remaps `columnId` to the target board's first (or archive) column
- `getSwimlaneResources()` aggregates all seven entity types for a swimlane
- `cleanup()` runs the stored `_unsubscribers` and empties boards/swimlanes

#### UNIT-STORE-04: `src/stores/filter-store.ts`
File: `src/stores/__tests__/filter-store.test.ts`
Test cases:
- Initial state is `DEFAULT_FILTERS` (`searchText: ''`, `date: 'all'`, `deadline: 'all'`, `priorities: ['all']`, `labels: []`)
- `setFilters()` replaces the filter object
- `resetFilters()` restores `DEFAULT_FILTERS`
- Persistence: the state round-trips through the `goals-kanban-filters-v2` localStorage key

#### UNIT-STORE-05: `src/stores/theme-store.ts`
File: `src/stores/__tests__/theme-store.test.ts`
Test cases:
- Initial state: `theme: 'system'`, `resolvedTheme: 'light'`
- `setTheme('dark')` / `setTheme('light')` update both `theme` and `resolvedTheme`
- `setTheme('system')` resolves through `window.matchMedia('(prefers-color-scheme: dark)')`
- `toggleTheme()` cycles `light → dark → system → light`
- `setTheme()` writes `STORAGE_KEYS.THEME` (`buobu-theme`) to localStorage
- `initTheme()` restores a valid stored value and falls back to `system` for garbage
- The `<html>` class is applied by `src/components/theme/ThemeProvider.tsx`, not by this store

#### UNIT-STORE-06: `src/stores/sync-store.ts`
File: `src/stores/__tests__/sync-store.test.ts`
Test cases:
- Initial state: `status: 'idle'`, no error, no pending changes
- `queueSync()` moves the status to `pending` and debounces the run (`SYNC_DEBOUNCE_MS`)
- A successful run transitions `pending → syncing → synced`, then back to `idle` after `SYNC_SUCCESS_RESET_MS`
- A failure stores `errorMessage` and sets `status: 'error'`; `retry()` re-runs
- Offline: `setOffline()` reports `offline`; `setOnline()` re-queues only when `hasPendingChanges`
- Sync is skipped when `isSupabaseReplicationPaused(user.id)` is true

#### UNIT-STORE-07: `src/stores/archive-filter-store.ts` + `archive-view-store.ts`
File: `src/stores/__tests__/archive-stores.test.ts`
Test cases:
- `setShowArchivedItems(true/false)` toggles visibility
- `setLockedBySelection(true)` pins archived mode on
- `useArchiveViewStore.enter({ boardId, swimlaneId })` sets `target`; `exit()` clears it

#### UNIT-STORE-08: `src/stores/swimlane-selection-store.ts`
File: `src/stores/__tests__/swimlane-selection-store.test.ts`
Test cases:
- `selectAll()` produces `['*:*']`
- `selectBoard(boardId)` produces `boardId:*`
- `toggleSwimlane(boardId, swimlaneId)` adds and removes `boardId:swimlaneId`
- Removing the last individual swimlane falls back to the board-level selection
- `clearSelection()` empties the list
- `parseSelection()` splits a selection string; `createSelection()` joins one
- `filterSwimlanes()` / `filterItems()` respect `*:*`, `boardId:*` and exact selections
- Persistence: the selection round-trips through the `buobu-swimlane-selections` localStorage key

#### UNIT-STORE-09: `src/stores/entitlements-store.ts`
File: `src/stores/__tests__/entitlements-store.test.ts`
Test cases:
- With `BILLING_ENABLED` false, the store short-circuits to Plus-tier defaults without a Supabase call
- `refreshEntitlements()` reads the Supabase `entitlements` view and caches the result
- A failed fetch falls back to the cached values with `isOffline: true`, or to Free defaults when nothing is cached
- `resetEntitlements()` clears the cache and returns to Free defaults

#### UNIT-STORE-10: `src/stores/nav-visibility-store.ts` + `src/stores/apps-bar-store.ts`
Files: `src/stores/__tests__/nav-visibility-store.test.ts`, `src/stores/__tests__/apps-bar-store.test.ts`
Test cases:
- Navigation visibility toggles persist and restore
- Apps-bar state transitions

### 6.3 src/stores/atoms/ — Jotai Atoms

#### UNIT-ATOMS-01: All collection atoms
File: `src/stores/__tests__/atoms.test.ts`
Setup: Wrap in `<Provider>`, use `renderHook` + `act`
Test per atom (`tasks`, `habits`, `notes`, `bookmarks`, `mindmaps`, `routines`, `vision`, `backlog`):
- Initial value is empty array
- Setting atom updates value
- Derived/computed atoms produce correct output from base atoms
- Atom reset returns to default

---

## 7. Integration Tests

> Target: **≥75% coverage on `src/components/`**
> Use: `@testing-library/react` + `@testing-library/user-event` + Vitest
> Principle: Render real components, mock external I/O (DB, network)

### Test Wrapper

`src/test/helpers/render.tsx` exports `renderWithProviders()` (re-exported as `render`), which wraps a component in the providers it needs and re-exports Testing Library:

```tsx
// Wraps component in all required providers:
// JotaiProvider, AuthProvider (mocked), ThemeProvider, etc.
export function renderWithProviders(ui, options?) { ... }
```

### 7.1 Auth Components

#### INT-AUTH-01: `src/components/auth/AuthProvider.tsx`
File: `src/components/auth/__tests__/AuthProvider.test.tsx`
Test cases:
- Renders children when session check completes
- Shows loading state during session check
- Redirects to `/login` when no session (on protected route)
- Does NOT redirect on public routes
- Calls `supabase.auth.onAuthStateChange` on mount
- Updates auth store on SIGNED_IN event
- Clears auth store on SIGNED_OUT event

#### INT-AUTH-02: `src/components/auth/AccountSettingsModal.tsx`
File: `src/components/auth/__tests__/AccountSettingsModal.test.tsx`
Test cases:
- Renders all tabs (Profile, Security, Connected Accounts)
- Profile tab: displays current user name and email
- Profile tab: submitting updates user metadata
- Security tab: password change validates current password is required
- Security tab: password change validates new password ≥ 8 chars
- Security tab: shows error on wrong current password
- Avatar tab: accepts jpg/jpeg/png/webp files
- Avatar tab: rejects svg/exe/pdf files with error message
- Connected Accounts: shows "Connect Google" button when not linked
- Connected Accounts: shows "Disconnect Google" button when linked
- Connected Accounts: disconnect calls unlinkGoogleAccount

### 7.2 Kanban Components

#### INT-KANBAN-01: `src/components/kanban/KanbanBoard.tsx`
File: `src/components/kanban/__tests__/KanbanBoard.test.tsx`
Test cases:
- Renders columns from board configuration
- Renders tasks in correct columns
- Empty state shown when board has no tasks
- Task card displays title, priority badge, due date
- Overdue tasks display visual indicator
- Clicking task card opens the task detail panel
- Creating task adds it to the correct column (modal submits)
- Filter panel: filtering by priority hides/shows tasks
- Filter panel: filtering by swimlane shows only matching tasks
- Drag-and-drop: task moves to new column (mock dnd-kit)

#### INT-KANBAN-02: `src/components/kanban/TasksListBoard.tsx`
File: `src/components/kanban/__tests__/TasksListBoard.test.tsx`
Test cases:
- Renders task list rows
- Sorting by different columns works
- Task row displays all key fields
- Clicking row opens detail view
- Completing task updates its status

#### INT-KANBAN-03: `src/components/kanban/TasksCalendar.tsx`
File: `src/components/kanban/__tests__/TasksCalendar.test.tsx`
Test cases:
- Renders FullCalendar component
- Tasks with due dates appear on correct day
- Clicking date opens task creation with prefilled date
- Tasks with recurrence rules show correctly
- Month/week/day view switching works

### 7.3 Habits Components

#### INT-HABITS-01: `src/components/habits/HabitsBoard.tsx`
File: `src/components/habits/__tests__/HabitsBoard.test.tsx`
Test cases:
- Renders habit grid with habit names in rows
- Renders 7-day column headers
- Today's column is highlighted
- Habit log value 0–3 renders correct visual state (empty/partial/full)
- Clicking cell updates habit log for that day
- Creating habit (via dialog) adds row to grid
- Editing habit opens dialog with pre-filled values
- Deleting habit shows confirmation, then removes row
- Habit on break mode is visually distinct

### 7.4 Routines Components

#### INT-ROUTINES-01: `src/components/routines/RoutinesBoard.tsx`
File: `src/components/routines/__tests__/RoutinesBoard.test.tsx`
Test cases:
- Renders list of routines
- Expanding routine shows its task list
- Logging routine creates RoutineLog for today
- Already logged routine shows completion state
- Creating routine via dialog adds to list
- Deleting routine prompts confirmation

### 7.5 Notes Components

#### INT-NOTES-01: `src/components/notes/NotesBoard.tsx` + `NoteEditor.tsx`
File: `src/components/notes/__tests__/NotesBoard.test.tsx`
Test cases:
- Renders note cards in grid
- Clicking note opens editor
- Editor saves on blur/explicit save
- Rich text: bold, italic keyboard shortcuts work
- Creating new note creates blank document
- Deleting note shows confirmation

### 7.6 Bookmarks Components

#### INT-BOOKMARKS-01: `src/components/bookmarks/BookmarksBoard.tsx`
File: `src/components/bookmarks/__tests__/BookmarksBoard.test.tsx`
Test cases:
- Renders bookmark cards with title, URL, favicon
- Adding bookmark calls metadata fetch API
- Metadata fetch error shows fallback (URL as title)
- Tag filtering shows correct subset
- Deleting bookmark removes card

### 7.7 Layout & Navigation

#### INT-LAYOUT-01: `src/components/layout/AppLayout.tsx`
File: `src/components/layout/__tests__/AppLayout.test.tsx`
Test cases:
- Renders sidebar with navigation items
- Active route is highlighted in nav
- Sidebar collapse/expand works on mobile
- User avatar displays in nav header
- Logout button calls signOut

### 7.8 Custom Hooks

#### INT-HOOKS-01: `src/stores/hooks/use-tasks.ts`
File: `src/stores/hooks/__tests__/use-tasks.test.ts`
Setup: Wrap in `<JotaiProvider>`, mock db functions
Test cases:
- `useTasks()` returns the tasks in `tasksAtom`
- `useFilteredTasks()` / `useActiveTasks()` / `useArchivedTasks()` derive from the base atom
- `useTasksLoading()` reflects `tasksLoadingAtom`
- `taskActions.put()` delegates to `db.putTask`; `taskActions.delete()` to `db.deleteTask`
- `useTasksSubscription()` / `useBoardTasksSubscription(boardId)` register the RxDB subscription

Repeat the equivalent shape for: `use-habits`, `use-notes`, `use-bookmarks`, `use-mindmaps`, `use-routines`, `use-boards`.

---

## 8. Acceptance Tests (E2E)

> Tool: Playwright | Directory: `e2e/`
> The suite signs in with a **real account against a real Supabase project**. Without `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` the credential-gated specs skip themselves rather than fail — a green run with those variables unset proves very little, so check the skip count. See [Setup — Testing](../setup/testing.md).

### 8.1 Fixtures

`e2e/fixtures/auth.ts` exports a `test` object extended with one fixture:

- `authenticatedPage` — a `Page` already signed in as the `E2E_TEST_EMAIL` account (skips the test if credentials are missing or the login fails)
- `loginViaUI(page, email, password)` — the helper the fixture uses; it also seeds `buobu.last-briefing-date` in `localStorage` so the Daily Briefing overlay does not intercept clicks

Environment variables: `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, `E2E_TEST_INVITE_CODE` (registration spec only).

### 8.2 Covered Flows

#### E2E-AUTH-01: Registration Flow
File: `e2e/auth/registration.spec.ts` (7 scenarios)
- Valid invite code + email/password → account created, redirected to app
- Invalid invite code → error message shown
- Invite code too short → client-side validation error
- Passwords do not match → validation error
- Weak password (< 8 chars) → validation error
- Email format validation → browser prevents submit
- Sign in link navigates to login page

#### E2E-AUTH-02: Login / Logout Flow
File: `e2e/auth/login.spec.ts` (7 scenarios)
- Valid credentials → login succeeds, redirected to board
- Invalid credentials → error message shown
- Unauthenticated access to `/habits` and to `/notes` → redirected to `/auth/login`
- Session persistence: refresh page stays logged in
- Logout → session cleared, redirected to landing
- Sign up link navigates to register page

#### E2E-AUTH-03: Google OAuth
File: `e2e/auth/google-oauth.spec.ts` (4 scenarios)
- Login page renders the "Continue with Google" button
- Clicking the Google button initiates an OAuth redirect
- OAuth error in the URL → friendly error shown on the login page
- Home page handles `error_description` in the URL → redirects to login with a message

The full OAuth round-trip cannot be automated without a mock identity provider; the manual steps live in [`e2e-manual-checklist.md`](./e2e-manual-checklist.md).

#### E2E-TASKS-01: Core Task Management
File: `e2e/tasks/task-management.spec.ts` (6 scenarios)
- Kanban board renders columns
- Create board → swimlane → task → task appears in column
- Task card displays title, priority badge, and due date when set
- Switch to list view renders task rows
- Switch to calendar view renders the calendar
- Completing a task updates its status

#### E2E-HABITS-01: Habit Tracking
File: `e2e/habits/habit-tracking.spec.ts` (7 scenarios)
- Habits board renders; add-habit button is visible
- Create habit with daily frequency
- Log habit for today → cell state updates
- Page reload → habit data persists
- Edit habit → dialog opens with pre-filled values
- Delete habit → confirmation → habit removed

#### E2E-ROUTINES-01: Daily Routines
File: `e2e/routines/routine-management.spec.ts` (6 scenarios)
- Routines board renders; add-routine button is visible
- Create routine with tasks
- Log routine as complete for today
- Refresh → completion state persists
- Delete routine → confirmation → removed

#### E2E-NOTES-01: Note Taking
File: `e2e/notes/note-editing.spec.ts` (7 scenarios)
- Notes board renders
- Create note → editor opens
- Type content → content is visible
- Click an existing note card → editor opens with content
- Rich text formatting via the bold shortcut
- Page reload → note content persists
- Delete note → confirmation → removed from list

#### E2E-BOOKMARKS-01: Bookmark Management
File: `e2e/bookmarks/bookmarks.spec.ts` (6 scenarios)
- Bookmarks board renders; add-bookmark button is visible
- Add URL → bookmark card appears
- Bookmark card shows URL or title
- Search filter shows matching bookmarks
- Delete bookmark → confirmation → removed

#### E2E-SYNC-01: Cross-Tab Sync
File: `e2e/sync/cross-tab.spec.ts` (2 scenarios)
- Create a task in tab 1 → it appears in tab 2 (Supabase Realtime)
- Update a task in tab 2 → tab 1 reflects the change

#### E2E-DATA-01: Import / Export
File: `e2e/data/import-export.spec.ts` (3 scenarios)
- Export all data → triggers a file download
- Exported file has a non-zero size
- Import button is accessible

> The full import round-trip is not yet automated — it needs a seed fixture.

---

## 9. Coverage Enforcement

### 9.1 Thresholds — configured but not currently enforced

`vitest.config.ts` contains the threshold block, but it is **commented out**, so `pnpm test:coverage` currently reports coverage without failing the run:

```ts
// thresholds: {
//   statements: 80,
//   branches: 80,
//   functions: 80,
//   lines: 80,
// },
```

The intent is to uncomment these once the outstanding suites (notably `supabase-replication.test.ts`) land. Nothing in this repository currently blocks a commit or a build on coverage.

### 9.2 Per-Directory Targets (monitored, not enforced)

| Directory | Target |
|---|---|
| `src/lib/` | 90% |
| `src/stores/` | 85% |
| `src/components/` | 75% |
| `src/app/` | 70% |

Coverage is produced in four formats (`text`, `html`, `lcov`, `json-summary`) under `coverage/`. `coverage/lcov.info` is the machine-readable artifact for whatever reporting is wired up.

### 9.3 CI

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) runs on every pull request and on every push to `main`: typecheck, lint, `pnpm test:run`, then a build of both modes. It holds no secrets, so it runs unchanged on a fork. A failing job marks the pull request red; nothing else enforces it.

It is **not** a coverage gate: `pnpm test:coverage` is not part of it, because the thresholds in §9.1 are still commented out. There is also no scheduled E2E job — the Playwright suite needs a real account, and the `e2e.yml.disabled` template is kept for that (see [Deployment](../setup/deployment.md)).

Run both suites locally with `pnpm test:coverage` and `pnpm test:e2e` — see [Setup — Testing](../setup/testing.md).

---

## 10. Checklist

> Status of every suite named above. Undone items are genuine gaps, not aspirations.

### Infrastructure — done
- [x] **INFRA-01** Install test dependencies (`@vitest/coverage-v8`, RTL, jsdom, fake-indexeddb, MSW, Playwright)
- [x] **INFRA-02** Create `vitest.config.ts` (coverage thresholds present but commented out)
- [x] **INFRA-03** Create `src/test/setup.ts` with global mocks
- [x] **INFRA-04** Create `src/test/factories.ts` with entity factories
- [x] **INFRA-05** Create `src/test/mocks/supabase.ts` mock module
- [x] **INFRA-06** Create `src/test/helpers/rxdb.ts` in-memory DB helper
- [x] **INFRA-07** Create `playwright.config.ts` and `e2e/` directory structure
- [x] **INFRA-08** Add coverage scripts to `package.json`

### Unit tests
- [x] **UNIT-LIB-01** `utils.ts` → `utils.test.ts` ✅ 2025-09-25
- [x] **UNIT-LIB-02** `uuid.ts` → `uuid.test.ts` ✅ 2025-09-25 *(note: impl is non-standard 8-5-3-3-14 format; tests document real behaviour)*
- [x] **UNIT-LIB-03** `date.ts` → `date.test.ts` ✅ 2025-09-25
- [x] **UNIT-LIB-04** `naming.ts` → `naming.test.ts` ✅ 2025-09-25
- [x] **UNIT-LIB-05** `recurrence.ts` → extended `recurrence.test.ts` ✅ 2025-09-25 *(added 4 tests: empty daysOfWeek fallback, unknown type default, monthly/yearly without optional params)*
- [x] **UNIT-LIB-06** `device-id.ts` → `device-id.test.ts` ✅ 2025-09-25
- [x] **UNIT-LIB-07** `migration.ts` → `migration.test.ts` ✅ 2025-09-25 *(10 tests: checkMigrationNeeded, migrateFromOldDB, checkSeedBoardsNeeded, seedBoardsFromJSON)*
- [x] **UNIT-LIB-08** `onboarding-state.ts` → `onboarding-state.test.ts` ✅ 2025-09-25 *(6 tests: hasAnyCoreData with all 9 collections)*
- [x] **UNIT-LIB-09** `rxdb-repository.ts` → `rxdb-repository.test.ts` ✅ 2025-09-25 *(real in-memory RxDB: task/board/swimlane/habit/note/bookmark CRUD + guards)*
- [x] **UNIT-LIB-10** `db.ts` → `db.test.ts` ✅ 2025-09-25 *(auth guard + read/write delegation pattern; markLocalChange+queueSync on writes only)*
- [x] **UNIT-LIB-11** `auth/service.ts` → `auth/service.test.ts` ✅ 2025-09-25
- [ ] **UNIT-LIB-12** `supabase-replication.ts` → `supabase-replication.test.ts`
- [x] **UNIT-STORE-01** `auth-store.ts` → `auth-store.test.ts` ✅ 2025-09-25
- [x] **UNIT-STORE-02** `db-store.ts` → `db-store.test.ts` ✅ 2025-09-25
- [x] **UNIT-STORE-03** `board-store.ts` → `board-store.test.ts` ✅ 2025-09-25 *(all 14 actions: load, CRUD, archive, reorder, cleanup)*
- [x] **UNIT-STORE-04** `filter-store.ts` → `filter-store.test.ts` ✅ 2025-09-25
- [x] **UNIT-STORE-05** `theme-store.ts` → `theme-store.test.ts` ✅ 2025-09-25
- [x] **UNIT-STORE-06** `sync-store.ts` → `sync-store.test.ts` ✅ 2025-09-25
- [x] **UNIT-STORE-07** `archive-*-store.ts` → `archive-stores.test.ts` ✅ 2025-09-25
- [x] **UNIT-STORE-08** `swimlane-selection-store.ts` → `swimlane-selection-store.test.ts` ✅ 2025-09-25
- [x] **UNIT-ATOMS-01** All Jotai atoms → `atoms.test.ts` ✅ 2025-09-25

### Integration tests
- [x] **INT-AUTH-01** `AuthProvider.tsx` → `AuthProvider.test.tsx` ✅ 2025-09-25 *(16 tests: render, init, route protection, session expired, context guard)*
- [x] **INT-AUTH-02** `AccountSettingsModal.tsx` → `AccountSettingsModal.test.tsx` ✅ 2025-09-25 *(11 tests: tabs, Google link/unlink, password validation, email change, avatar upload)*
- [x] **INT-KANBAN-01** `KanbanBoard.tsx` → `KanbanBoard.test.tsx` ✅ 2025-09-25 *(7 tests: layout, swimlane panel, loading state, tasks)*
- [x] **INT-KANBAN-02** `TasksListBoard.tsx` → `TasksListBoard.test.tsx` ✅ 2025-09-25 *(5 tests: layout, swimlane panel, tasks, loading state)*
- [x] **INT-KANBAN-03** `TasksCalendar.tsx` → `TasksCalendar.test.tsx` ✅ 2025-09-25 *(5 tests: layout, FullCalendar mount, task fetch, no-task state, due-date tasks)*
- [x] **INT-HABITS-01** `HabitsBoard.tsx` → `HabitsBoard.test.tsx` ✅ 2025-09-25 *(7 tests: layout, empty state, habit names, multiple habits, add button, dialog, habit logs)*
- [x] **INT-ROUTINES-01** `RoutinesBoard.tsx` → `RoutinesBoard.test.tsx` ✅ 2025-09-25 *(9 tests: layout, empty state, routine titles, add button, search filter)*
- [x] **INT-NOTES-01** `NotesBoard.tsx` + `NoteEditor.tsx` → `NotesBoard.test.tsx` ✅ 2025-09-25 *(11 tests: layout, notes, click-to-edit, add note, search filter)*
- [x] **INT-BOOKMARKS-01** `BookmarksBoard.tsx` → `BookmarksBoard.test.tsx` ✅ 2025-09-25 *(9 tests: layout, bookmark cards, add flow, metadata fetch, search filter)*
- [x] **INT-LAYOUT-01** `AppLayout.tsx` → `AppLayout.test.tsx` ✅ 2025-09-25 *(9 tests: panels, boards in config, archive mode)*
- [x] **INT-HOOKS-01** `use-tasks.ts` → `use-tasks.test.ts` ✅ 2025-09-25
- [x] **INT-HOOKS-02** `use-habits.ts` → `use-habits.test.ts` ✅ 2025-09-25
- [x] **INT-HOOKS-03** `use-notes.ts` → `use-notes.test.ts` ✅ 2025-09-25
- [x] **INT-HOOKS-04** `use-bookmarks.ts` → `use-bookmarks.test.ts` ✅ 2025-09-25
- [x] **INT-HOOKS-05** `use-routines.ts` → `use-routines.test.ts` ✅ 2025-09-25 *(includes dueRoutinesAtom + approvalRequired + autoProcess with fake timers)*
- [x] **INT-HOOKS-06** `use-boards.ts` → `use-boards.test.ts` ✅ 2025-09-25 *(useBoards selector composition, useBoardsSubscription, hoisted Zustand mocks)*
- [x] **INT-HOOKS-07** `use-mindmaps.ts` → `use-mindmaps.test.ts` ✅ 2025-09-25 *(useMindmaps, useActiveMindmaps, useArchivedMindmaps, mindmapActions)*
- [x] Create `src/test/helpers/render.tsx` provider wrapper ✅ 2025-09-25

### E2E tests
- [x] **E2E-AUTH-01** Registration flow → `e2e/auth/registration.spec.ts` ✅ 2025-09-25 *(7 scenarios: valid invite, invalid invite, short invite, password mismatch, weak password, email format, sign-in link)*
- [x] **E2E-AUTH-02** Login/logout flow → `e2e/auth/login.spec.ts` ✅ 2025-09-25 *(7 scenarios: valid login, invalid credentials, protected route redirect ×2, session persistence, logout, sign-up link)*
- [x] **E2E-AUTH-03** Google OAuth → `e2e/auth/google-oauth.spec.ts` ✅ 2025-09-25 *(4 scenarios: button visible, OAuth redirect, error in URL, home page error redirect — full round-trip requires manual verification, documented)*
- [x] **E2E-TASKS-01** Task management → `e2e/tasks/task-management.spec.ts` ✅ 2025-09-25 *(kanban render, task creation, task card fields, list view, calendar view, task completion)*
- [x] **E2E-HABITS-01** Habit tracking → `e2e/habits/habit-tracking.spec.ts` ✅ 2025-09-25 *(board render, add button, create habit, log habit, persistence, edit habit, delete habit)*
- [x] **E2E-ROUTINES-01** Routine management → `e2e/routines/routine-management.spec.ts` ✅ 2025-09-25 *(6 scenarios: board render, add button, create routine, log routine, persistence, delete routine)*
- [x] **E2E-NOTES-01** Note editing → `e2e/notes/note-editing.spec.ts` ✅ 2025-09-25 *(7 scenarios: board render, create note → editor opens, content visible, open existing note, bold shortcut, persistence on reload, delete note)*
- [x] **E2E-BOOKMARKS-01** Bookmark management → `e2e/bookmarks/bookmarks.spec.ts` ✅ 2025-09-25 *(6 scenarios: board render, add button, add URL → card appears, card shows URL/title, search filter, delete bookmark)*
- [x] **E2E-SYNC-01** Cross-tab sync → `e2e/sync/cross-tab.spec.ts` ✅ 2025-09-25 *(cross-context login, create task in ctx1 → appears in ctx2 via Realtime; guarded by E2E_TEST_EMAIL env var)*
- [x] **E2E-DATA-01** Import/export → `e2e/data/import-export.spec.ts` ✅ 2025-09-25 *(export triggers download, file size > 0, import button accessible; full round-trip skipped pending seed fixture)*
- [x] Create `e2e/fixtures/auth.ts` Playwright fixtures ✅ 2025-09-25 *(authenticatedPage fixture, loginViaUI helper, env var fallbacks)*

---

## Appendix: Test File Map

Files marked *(planned)* do not exist yet.

```
src/
├── lib/
│   ├── __tests__/
│   │   ├── auth/
│   │   │   └── service.test.ts            ← UNIT-LIB-11
│   │   ├── utils.test.ts                  ← UNIT-LIB-01
│   │   ├── uuid.test.ts                   ← UNIT-LIB-02
│   │   ├── date.test.ts                   ← UNIT-LIB-03
│   │   ├── naming.test.ts                 ← UNIT-LIB-04
│   │   ├── recurrence.test.ts             ← UNIT-LIB-05
│   │   ├── device-id.test.ts              ← UNIT-LIB-06
│   │   ├── migration.test.ts              ← UNIT-LIB-07
│   │   ├── onboarding-state.test.ts       ← UNIT-LIB-08
│   │   ├── rxdb-repository.test.ts        ← UNIT-LIB-09
│   │   ├── db.test.ts                     ← UNIT-LIB-10
│   │   ├── colors.test.ts
│   │   ├── feature-flags.test.ts
│   │   ├── frontmatter.test.ts
│   │   ├── refactor-utils.test.ts
│   │   └── supabase-replication.test.ts   ← UNIT-LIB-12 (planned)
│   ├── auth/__tests__/
│   │   └── service-register.test.ts
│   ├── navigation/__tests__/
│   │   ├── app-nav-items.test.ts
│   │   ├── nav-visibility.test.ts
│   │   └── search-context.test.ts
│   ├── subscriptions/__tests__/
│   │   ├── activate-sync.test.ts
│   │   ├── checkout.test.ts
│   │   ├── guards.test.ts
│   │   ├── limits.test.ts
│   │   ├── stripe-customer.test.ts
│   │   ├── trial-warning.test.ts
│   │   └── usage.test.ts
│   └── validation/__tests__/
│       └── boardForm.test.ts
├── stores/
│   ├── __tests__/
│   │   ├── auth-store.test.ts             ← UNIT-STORE-01
│   │   ├── db-store.test.ts               ← UNIT-STORE-02
│   │   ├── board-store.test.ts            ← UNIT-STORE-03
│   │   ├── filter-store.test.ts           ← UNIT-STORE-04
│   │   ├── theme-store.test.ts            ← UNIT-STORE-05
│   │   ├── sync-store.test.ts             ← UNIT-STORE-06
│   │   ├── archive-stores.test.ts         ← UNIT-STORE-07
│   │   ├── swimlane-selection-store.test.ts ← UNIT-STORE-08
│   │   ├── atoms.test.ts                  ← UNIT-ATOMS-01
│   │   ├── entitlements-store.test.ts
│   │   ├── nav-visibility-store.test.ts
│   │   └── apps-bar-store.test.ts
│   └── hooks/__tests__/
│       ├── use-tasks.test.ts              ← INT-HOOKS-01
│       ├── use-habits.test.ts             ← INT-HOOKS-02
│       ├── use-notes.test.ts              ← INT-HOOKS-03
│       ├── use-bookmarks.test.ts          ← INT-HOOKS-04
│       ├── use-routines.test.ts           ← INT-HOOKS-05
│       ├── use-boards.test.ts             ← INT-HOOKS-06
│       └── use-mindmaps.test.ts           ← INT-HOOKS-07
├── hooks/__tests__/
│   ├── refactor-hooks.test.tsx
│   └── useUpgradeGuard.test.ts
├── app/api/stripe/__tests__/
│   └── webhook.test.ts
├── components/
│   ├── auth/__tests__/
│   │   ├── AuthProvider.test.tsx          ← INT-AUTH-01
│   │   ├── AccountSettingsModal.test.tsx  ← INT-AUTH-02
│   │   ├── BillingSection.test.tsx
│   │   ├── McpSettingsModal.test.tsx
│   │   └── ReferralSection.test.tsx
│   ├── kanban/__tests__/
│   │   ├── KanbanBoard.test.tsx           ← INT-KANBAN-01
│   │   ├── TasksListBoard.test.tsx        ← INT-KANBAN-02
│   │   └── TasksCalendar.test.tsx         ← INT-KANBAN-03
│   ├── habits/__tests__/
│   │   └── HabitsBoard.test.tsx           ← INT-HABITS-01
│   ├── routines/__tests__/
│   │   ├── RoutinesBoard.test.tsx         ← INT-ROUTINES-01
│   │   └── RoutineDialog.test.tsx
│   ├── notes/__tests__/
│   │   ├── NotesBoard.test.tsx            ← INT-NOTES-01
│   │   ├── NoteMetadataPanel.test.tsx
│   │   └── TableOfContents.test.tsx
│   ├── bookmarks/__tests__/
│   │   └── BookmarksBoard.test.tsx        ← INT-BOOKMARKS-01
│   ├── layout/__tests__/
│   │   ├── AppLayout.test.tsx             ← INT-LAYOUT-01
│   │   ├── AppsBar.test.tsx
│   │   ├── CompactNavigation.test.tsx
│   │   ├── CompactNavigationSwimlanesPane.test.tsx
│   │   └── CompactSwimlaneSearchInput.test.tsx
│   ├── onboarding/__tests__/
│   │   └── OnboardingGate.test.tsx
│   ├── subscriptions/__tests__/
│   │   └── TrialExpiryBanner.test.tsx
│   ├── import-export/details/__tests__/
│   │   ├── TaskDetail.test.tsx
│   │   └── WhiteboardDetail.test.tsx
│   └── ui/__tests__/
│       ├── BoardModal.test.tsx
│       └── global-search-palette.test.tsx
└── test/
    ├── setup.ts                           ← INFRA-03
    ├── factories.ts                       ← INFRA-04
    ├── mocks/
    │   └── supabase.ts                    ← INFRA-05
    └── helpers/
        ├── rxdb.ts                        ← INFRA-06
        └── render.tsx                     ← renderWithProviders()
e2e/
├── fixtures/
│   └── auth.ts                            ← authenticatedPage, loginViaUI
├── auth/
│   ├── registration.spec.ts               ← E2E-AUTH-01
│   ├── login.spec.ts                      ← E2E-AUTH-02
│   └── google-oauth.spec.ts               ← E2E-AUTH-03
├── tasks/
│   └── task-management.spec.ts            ← E2E-TASKS-01
├── habits/
│   └── habit-tracking.spec.ts             ← E2E-HABITS-01
├── routines/
│   └── routine-management.spec.ts         ← E2E-ROUTINES-01
├── notes/
│   └── note-editing.spec.ts               ← E2E-NOTES-01
├── bookmarks/
│   └── bookmarks.spec.ts                  ← E2E-BOOKMARKS-01
├── sync/
│   └── cross-tab.spec.ts                  ← E2E-SYNC-01
└── data/
    └── import-export.spec.ts              ← E2E-DATA-01
```

---

*Coverage is a gate, not a metric — once the threshold block in `vitest.config.ts` is uncommented, no change should land with `pnpm test:coverage` exiting non-zero.*
