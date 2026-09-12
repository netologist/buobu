# Contributing

Buobu is a local-first app: it runs entirely in the browser and a backend is optional. That shapes what a contribution has to keep true — both modes build, `pnpm test:run` stays green, and no server-side work sneaks into the static export.

This file covers setup, the checks and the pull request flow. [README.md](./README.md) is the product overview, and [`docs/README.md`](./docs/README.md) indexes the design notes.

## Before you start

- Small fixes — a bug, a typo, a missing null check — are welcome as a pull request without ceremony.
- Anything larger: open an issue first. A new feature, a schema change, a dependency swap or anything expensive to reverse belongs in the discussion before the code. Decisions that would be costly to undo get an ADR in [`docs/adr/`](./docs/adr/), numbered and copied from [`docs/adr/template.md`](./docs/adr/template.md).
- Security problems do not belong in a public issue. Mail <hasan@ozgan.net> instead.

## Setup

Node 20–24 and pnpm 10.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

`.env.local` is gitignored — `.env.example` is the only committed example — and the copy it comes from sets `NEXT_PUBLIC_LOCAL_MODE=true`, so a fresh clone runs in **Local Mode**: no account, no backend, and data in this browser's IndexedDB.

Cloud Mode needs Supabase values instead: comment out `NEXT_PUBLIC_LOCAL_MODE` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. See [`docs/setup/supabase.md`](./docs/setup/supabase.md).

The mode is read at build time and inlined, so change your configuration and restart the dev server — setting variables on a build that already exists does nothing. `LOCAL_MODE` and `CLOUD_MODE` in [`src/lib/feature-flags.ts`](./src/lib/feature-flags.ts) are the flags to branch on in code.

## Checks

| Command | What it does |
|---|---|
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test:run` | Unit and component tests |
| `pnpm test:coverage` | The same, with coverage |
| `pnpm test:e2e` | Playwright, against the dev server it starts itself |
| `pnpm build` | The static export |

Run typecheck, lint and `pnpm test:run` before opening a pull request — [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs exactly those, then builds both modes: Local Mode with no configuration, and Cloud Mode with placeholder Supabase values.

The end-to-end suite signs in against a real Supabase project, so it needs `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` in `.env.local` and skips itself without them. A green run with those unset proves little; check the skip count. [`docs/setup/testing.md`](./docs/setup/testing.md) has the rest, including the Node 26 `localStorage` caveat that breaks the unit-test environment.

## Tests

- Vitest tests live next to what they test, under `src/`.
- Build entities with [`src/test/factories.ts`](./src/test/factories.ts) rather than hand-written literals — it keeps new required fields from breaking every test at once.
- [`src/test/setup.ts`](./src/test/setup.ts) deliberately stubs a **Cloud Mode** default, so a test that forgets to choose a mode fails on Cloud Mode behaviour rather than silently passing in Local Mode. A Local Mode test overrides the flag itself.

## Style

The conventions live in [`docs/standards/typescript.md`](./docs/standards/typescript.md) and [`docs/standards/react.md`](./docs/standards/react.md). The short version:

- Component files under `src/components/**` are PascalCase; hooks, stores, `src/lib` modules and App Router route segments are kebab-case. Route paths mirror the directory name.
- `@/*` maps to `src/*`.
- Tests sit beside the code they cover.

## What the app can and cannot do

`next.config.ts` sets `output: "export"`, so a build is a pile of static files with no server behind it. Three consequences for anything you add:

- `src/app/api/**` route handlers are a `pnpm dev` convenience; they never exist in a deployed artifact. Work that must run server-side belongs in a Cloudflare Worker or in Supabase.
- Every route is prerendered, so anything that reads the URL reads it on the client.
- `NEXT_PUBLIC_*` values are inlined at build time.

A feature should work with or without a backend. Cloud-only integrations are guarded rather than assumed: branch on `CLOUD_MODE` instead of expecting credentials to exist. And never set `NEXT_PUBLIC_LOCAL_MODE=true` in a deploy environment — it would ship a local-only app, which is the failure the flag exists to prevent. [`docs/setup/deployment.md`](./docs/setup/deployment.md) covers the rest.

## Data model changes

Three definitions move together:

| Where | What |
|---|---|
| [`src/lib/types.ts`](./src/lib/types.ts) | The TypeScript entity types |
| [`src/lib/rxdb.ts`](./src/lib/rxdb.ts) | The RxDB schemas, each with its own version and migration path |
| [`supabase/migrations/`](./supabase/migrations) | The server-side schema, one `<timestamp>_<name>.sql` file per change |

Add a migration; never edit one that has already been applied. When the change is visible to users, update [`docs/domain/entities.md`](./docs/domain/entities.md) and any README table it makes stale in the same pull request.

## Commits and pull requests

Commit subjects follow the Conventional Commits style used in this history: `feat(mcp):`, `fix(security):`, `docs:`, `chore(clean):`. Lowercase after the colon, imperative mood, a scope in parentheses when the subject alone does not say where the change lands.

One concern per pull request. Update the documentation it invalidates: the README for user-visible behaviour, `docs/` for design, an ADR for a decision. Include screenshots for anything visual.

## Licensing

The project is [AGPL-3.0](./LICENSE) and contributions are accepted under it — inbound equals outbound, with no CLA to sign. If you contribute on behalf of an employer, make sure you are able to. Commercial use is permitted by the AGPL; the trademark note sits at the end of [README.md](./README.md).
