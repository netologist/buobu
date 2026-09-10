# Initial Setup Flow (First Login)

Runs after authentication when the local RxDB workspace is empty. The UI is rendered by `OnboardingGate` → `FirstLoginFlow`, and the state machine lives in `useFirstLoginOnboarding()` (`src/lib/use-first-login-onboarding.ts`).

The flow has two branches, selected by build-time mode:

| Mode | Condition | Initial sync | Offline step |
|------|-----------|--------------|--------------|
| Cloud Mode | `NEXT_PUBLIC_LOCAL_MODE` is unset or any value other than `true` | `awaitInitialSync(userId)` runs | Shown when the browser is offline |
| Local Mode | `NEXT_PUBLIC_LOCAL_MODE=true` | Never runs (no Supabase client, no replication) | Never shown |

Both modes share the empty-workspace choices (import, preset, default) and the same seeding helpers.

## Trigger Conditions

The onboarding UI is active when the current path is not public (`/`, `/auth/login`, `/auth/register`) and all of the following are true:

1. The user is authenticated.
2. The per-user RxDB is initialized.
3. Core collections contain no non-deleted records (`hasAnyCoreData(db)`).

Core collections checked, exactly as listed in `hasAnyCoreData` (`src/lib/onboarding-state.ts`):

- `boards`
- `swimlanes`
- `tasks`
- `backlogs`
- `habits`
- `habitLogs`
- `notes`
- `mindmaps`
- `visionItems`

While auth or database initialization is still in flight the hook reports the synthetic `preparing-db` step, which renders the blocking "Preparing Your Workspace" screen.

## Steps

`OnboardingStep` (`src/lib/onboarding-state.ts`) defines the machine:

| Step | Screen | Entered when |
|------|--------|--------------|
| `idle` | none | Reset on user change; replaced by `preparing-db` while loading |
| `preparing-db` | "Preparing Your Workspace" (blocking) | Auth or DB still loading on a protected path |
| `initial-sync` | "Preparing Your Workspace" + sync spinner | Cloud Mode, online, empty workspace |
| `offline-choice` | "You Are Offline" | Cloud Mode and `navigator.onLine` is false |
| `fallback-options` | "No Existing Data Found" | Sync found nothing, the user chose "Continue Offline", or Local Mode with an empty database |
| `import` | Import dialog (`forcedMode="append"`) | "Import" chosen |
| `preset-select` | "Applying preset" | A preset card was chosen |
| `seeding-default` | "Creating default workspace" | "Skip & Auto Setup" chosen |
| `done` | none — the app renders | Data exists locally (or after a successful seed/import) |
| `error` | "Setup Needs Attention" | Sync, seeding or default setup threw |

## Cloud Mode Flow

1. **Prepare DB.** `OnboardingGate` shows the blocking screen until `db` is ready.
2. **Initial full sync.** `awaitInitialSync(userId)` (`src/lib/supabase-replication.ts`) awaits the initial replication of every active replication state; it is a no-op when no replication state exists.
3. **Data check.** If `hasAnyCoreData(db)` is true, boards are reloaded and the step becomes `done` — the user enters the app.
4. **Fallback choices.** If the sync completed but the workspace is still empty, or if the user chose **Continue Offline**, the "No Existing Data Found" screen offers:
   - **Import** — opens `ImportModal` with `forcedMode="append"`. When the modal closes, the hook re-checks core data: `done` if records arrived, otherwise back to `fallback-options`.
   - **Skip & Auto Setup** — `seedDefaultWorkspace(db, userId)`, then `done` if data exists.
   - **Preset cards** (Minimal / Personal / Work) — `seedFromPreset(presetId, db, userId)`, then `done` if data exists.
5. **Offline.** If the browser is offline at bootstrap, the "You Are Offline" screen offers:
   - **Wait For Connection** — registers a one-shot `online` listener and runs the initial sync as soon as connectivity returns.
   - **Continue Offline** — skips sync and continues to the empty-workspace choices. This is the *Cloud Mode user deferring first sync*, not the Local Mode Local User.
6. **Errors.** A sync or seeding failure moves to `error`, showing the message plus **Retry Sync** and **Continue Offline**. `retrySync` re-checks connectivity first and falls back to the offline screen if the browser is offline.

## Local Mode Flow

`src/lib/feature-flags.ts` exposes `LOCAL_MODE`, and the hook's `bootstrap` branches on it:

```typescript
if (LOCAL_MODE) {
  setStep('fallback-options');
  return;
}
```

- The user is the synthetic **Local User** (`LOCAL_USER`, `id: 'local'`, `src/lib/auth/service.ts`); the database is `buobu-db-local`. There is no Supabase client, no replication, no Workers, no billing and no invite codes, so no network is involved at any point.
- Steps skipped compared to Cloud Mode: **`initial-sync`** and **`offline-choice`**. Both would be misleading here — there is no first sync to wait for and no connection to leave.
- What the user sees instead: if the local database already has core data, onboarding never appears (`done` immediately after the bootstrap check). If it is empty, the **"No Existing Data Found"** screen appears directly, with the same Import, Skip & Auto Setup and preset options.
- Everything after that step is shared: import (into IndexedDB only), preset seeding, default workspace, and the `error` screen if seeding throws.

Because Local Mode has no replication, `awaitInitialSync` would be a no-op even if it were reached; the branch exists to skip the two screens rather than to skip a network call.

## Seed Sources

Preset source file: `src/data/onboarding-presets.json`. It defines three presets, returned verbatim by `getOnboardingPresets()`:

| Preset | Board | Columns | Swimlanes |
|--------|-------|---------|-----------|
| `minimal` — "Minimal" | My Board | To Do, In Progress, Done | Default Swimlane |
| `personal` — "Personal" | Personal Goals | To Do, This Week, Done | Health, Learning |
| `work` — "Work" | Work Projects | Backlog, Doing, Review, Done | Product, Engineering |

Seed helpers (`src/lib/onboarding-seed.ts`):

- `seedFromPreset(presetId, db, userId)` — looks the preset up by id (unknown id throws `Preset not found`), then for each preset board inserts the board and its swimlanes. A board without `columns` falls back to To Do / In Progress / Done; a board without `swimlanes` gets a single "Default Swimlane".
- `seedDefaultWorkspace(db, userId)` — `await seedFromPreset('minimal', db, userId)`, i.e. "Skip & Auto Setup" and the Minimal preset produce the same workspace.
- Seeded documents are written with `_deleted: false`, `_version: 1`, `_createdAt`/`_updatedAt`, `_modified` and `_deviceId` (`baseMeta`). They do **not** set `archived`; the missing field is treated as active by every archive filter. Swimlane currency defaults to `DEFAULT_CURRENCY`, colour to `#3b82f6`, and pomodoro/break to 25/5 minutes.

## Safety Guards

Deletion protections are enforced in both the UI and the repository layer (`src/lib/rxdb-repository.ts`):

- The last board cannot be deleted: `deleteBoard` throws `Cannot delete the last board. Create another board first.` when only one non-deleted board remains.
- The last swimlane in a board cannot be deleted: `deleteSwimlane` throws `Cannot delete the last swimlane in a board. Create another swimlane first.` unless the internal `skipLastGuard` option is set — used by cascades such as `permanentDeleteBoard` and `permanentDeleteSwimlane`.

## Related

- [Architecture Overview](./overview.md)
- [Local-First Strategy](./local-first.md)
- [Local Mode setup](../setup/local-mode.md)
- [ADR 014 — Local Mode](../adr/014-local-mode.md)
