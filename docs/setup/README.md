# Setup

buobu is one codebase that runs in one of two modes, resolved at build time:

| | Local Mode | Cloud Mode |
|---|---|---|
| Selected by | `NEXT_PUBLIC_LOCAL_MODE=true` | anything else, including unset |
| Backend | none | Supabase, plus optional Cloudflare Workers and Stripe |
| Identity | one synthetic Local User | real accounts |
| Data | this browser's IndexedDB only | this browser, synced to your Supabase project |
| Billing, invite and referral codes, MCP and API keys, avatars | no | yes |

A copy of `.env.example` sets the flag, so the default developer path lands in Local Mode with nothing to configure. See [`docs/adr/014-local-mode.md`](../adr/014-local-mode.md) for why the mode is opted into rather than inferred, and [`docs/domain/glossary.md`](../domain/glossary.md) for the vocabulary.

## Prerequisites

- **Node.js 20–24.** Node 26 breaks the unit test environment: its experimental global `localStorage` shadows the one jsdom provides. Use an LTS release.
- **pnpm 10.** `package.json` pins `pnpm@10.33.2`. `corepack enable` picks it up.
- Cloud Mode only, as needed: a Supabase project, a Cloudflare account, a Stripe account.

## Which guide

| Goal | Guide | Needs |
|---|---|---|
| Complete cloud & infrastructure playbook | [setup-playbook.md](../setup-playbook.md) | Terraform + Supabase + Cloudflare + CI/CD |
| Run the app on one machine, alone | [local-mode.md](./local-mode.md) | nothing |
| Accounts, multi-device sync | [supabase.md](./supabase.md) | Supabase |
| Let MCP clients reach your data | [workers.md](./workers.md) | Supabase + Cloudflare |
| Charge for Plus | [billing.md](./billing.md) | Supabase + Stripe |
| Run the test suites | [testing.md](./testing.md) | a test account, for E2E |
| Publish a build | [deployment.md](./deployment.md) | a static host |

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server on <http://localhost:3000>. Runs with `NEXT_TURBOPACK=0`. |
| `pnpm build` | Static export into `out/`. |
| `pnpm typecheck` | `tsc --noEmit`. |
| `pnpm lint` | ESLint. |
| `pnpm test` / `pnpm test:run` | Vitest, watch / single run. |
| `pnpm test:e2e` | Playwright. |
| `pnpm dev:mcp`, `pnpm dev:referral` | The Cloudflare Workers, locally. |
| `pnpm deploy:mcp`, `pnpm deploy:referral` | Deploy the Workers. |

`pnpm start` does not work: `next.config.ts` sets `output: "export"`, so `next build` emits static files with no server to start. Serve `out/` with any static host.

## How configuration is read

`NEXT_PUBLIC_*` values are **inlined into the bundle at build time**. Setting them on an already-built artifact does nothing — change the value and rebuild, or restart the dev server.

Non-public values (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) are read at runtime by the dev-only API routes under `src/app/api/` and by the Workers. Because the deployed artifact is a static export, those routes never run in production; anything that must happen server-side at runtime belongs in a Worker or in Supabase.

`.env.example` is the authoritative list of variables, grouped by feature, with the default for each stated.
