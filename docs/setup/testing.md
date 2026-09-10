# Testing

## Unit and component tests

Vitest with Testing Library, jsdom, MSW and `fake-indexeddb`. 75 test files live under `src/`, next to what they test.

```bash
pnpm test:run     # single run
pnpm test         # watch
pnpm test:coverage
```

`vitest.config.ts` sets the environment and `src/test/setup.ts` the global stubs. `src/test/setup.ts` deliberately stubs a **Cloud Mode** default so a test that forgets to choose a mode fails on Cloud Mode behaviour rather than silently passing in Local Mode; a Local Mode test file overrides the flag itself.

`src/test/factories.ts` builds entities for tests. Prefer it over hand-written object literals — it keeps new required fields from breaking every test at once.

Static checks:

```bash
pnpm typecheck
pnpm lint
```

Node version matters here: Node 26 ships an experimental global `localStorage` that shadows the one jsdom provides and breaks the unit-test environment — every suite fails with `Cannot read properties of undefined (reading 'clear')`. Use Node 20–24, or keep Node 26 and run `NODE_OPTIONS=--no-experimental-webstorage pnpm test:run`.

## End-to-end tests

Playwright, configured in `playwright.config.ts`. Three projects: `chromium`, `firefox`, and `Mobile Chrome`.

```bash
pnpm exec playwright install chromium --with-deps
pnpm test:e2e
pnpm test:e2e:ui        # interactive
pnpm test:e2e --project=chromium
```

The config starts `pnpm dev` itself and waits on <http://localhost:3000>, reusing an already-running server outside CI. It loads `.env.local` first, then `.env`.

The suite signs in with a **real account against a real Supabase project**. In `.env.local`:

```bash
E2E_TEST_EMAIL=<existing test account>
E2E_TEST_PASSWORD=<its password>
E2E_TEST_INVITE_CODE=<a valid unused invite code>   # registration spec only
```

Without the credentials the credential-gated specs **skip themselves** rather than fail — `e2e/fixtures/auth.ts` logs the reason. A green run with those variables unset proves very little; check the skip count.

Coverage, by directory under `e2e/`: `auth` (login, registration, Google OAuth), `tasks`, `habits`, `routines`, `notes`, `bookmarks`, `data` (import/export), `sync` (cross-tab).

Several specs also skip when the board they need is empty, so run them against an account that already has data.

- Google OAuth cannot be fully automated without a mock identity provider. The parts that can be checked are in `e2e/auth/google-oauth.spec.ts`; the manual round-trip is in [`docs/testing/e2e-manual-checklist.md`](../testing/e2e-manual-checklist.md).
- CI ran the suite with `CI=true` (1 worker, 2 retries, GitHub reporter) to avoid Supabase rate-limiting. GitHub Actions is disabled in this repository — see [deployment.md](./deployment.md) — so set `CI=true` yourself if you want that behaviour locally.
