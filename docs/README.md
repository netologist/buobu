# Documentation

Design and operating notes for buobu. The [root README](../README.md) is the short version: what the product is, how to run it, and the two modes it runs in.

## Setup

| Guide | Covers |
|---|---|
| [setup-playbook.md](./setup-playbook.md) | **Production Playbook**: Terraform, Supabase, Cloudflare, custom domains, and CI/CD pipelines |
| [setup/README.md](./setup/README.md) | Prerequisites, commands, how configuration is read |
| [setup/local-mode.md](./setup/local-mode.md) | The default path: run the app with no backend at all |
| [setup/supabase.md](./setup/supabase.md) | Cloud Mode: project, migrations, edge function, auth |
| [setup/workers.md](./setup/workers.md) | The MCP and referral Cloudflare Workers |
| [setup/billing.md](./setup/billing.md) | Stripe, entitlements and Plus |
| [setup/testing.md](./setup/testing.md) | Vitest and Playwright |
| [setup/deployment.md](./setup/deployment.md) | The static export, hosting, CI, and the deploy templates |

## Architecture

| Document | Covers |
|---|---|
| [architecture/overview.md](./architecture/overview.md) | Components, technologies, data hierarchy, key files |
| [architecture/local-first.md](./architecture/local-first.md) | The storage model and how replication works |
| [architecture/data-flow.md](./architecture/data-flow.md) | Reads, writes, soft deletes, sync flow |
| [architecture/archive.md](./architecture/archive.md) | The archive system across boards, swimlanes and children |
| [architecture/onboarding-flow.md](./architecture/onboarding-flow.md) | First login: sync, preset or import |

### Module maps

Code maps of individual modules. The source is authoritative; these exist to save you a read.

- [architecture/modules/stores.md](./architecture/modules/stores.md) — Zustand stores, Jotai atoms, the RxDB subscription bridge
- [architecture/modules/auth-provider.md](./architecture/modules/auth-provider.md) — session, database and sync orchestration
- [architecture/modules/mcp-worker.md](./architecture/modules/mcp-worker.md) — the MCP Worker and its tool layer
- [architecture/modules/rate-limit.md](./architecture/modules/rate-limit.md) — per-key request limiting
- [architecture/modules/board-modal.md](./architecture/modules/board-modal.md) — board create, edit, archive, delete
- [architecture/modules/mobile-fab.md](./architecture/modules/mobile-fab.md) — the mobile action button
- [architecture/modules/notes-extensions.md](./architecture/modules/notes-extensions.md) — the TipTap extension set
- [architecture/modules/use-board-render-profiler.md](./architecture/modules/use-board-render-profiler.md) — the opt-in render profiler

## Decisions

[`adr/`](./adr/) — one decision per file, numbered, with its status and the alternatives that were rejected. Start at [adr/000-adr-index.md](./adr/000-adr-index.md).

The one to read first is [adr/014-local-mode.md](./adr/014-local-mode.md): it explains why the app has two modes and why the mode is opted into rather than inferred.

## Reference

| Document | Covers |
|---|---|
| [domain/glossary.md](./domain/glossary.md) | The vocabulary — board, swimlane, Local User, Local vs Cloud Mode |
| [domain/entities.md](./domain/entities.md) | Entity fields and relationships |
| [tech-stack/frontend.md](./tech-stack/frontend.md), [backend.md](./tech-stack/backend.md), [database.md](./tech-stack/database.md), [authentication.md](./tech-stack/authentication.md) | The libraries and services in use, and how |
| [standards/react.md](./standards/react.md), [typescript.md](./standards/typescript.md) | Coding conventions |
| [testing/TEST-PLAN.md](./testing/TEST-PLAN.md) | What is tested, at which layer |
| [testing/e2e-manual-checklist.md](./testing/e2e-manual-checklist.md) | The manual steps E2E cannot automate |
| [testing/stripe-test-cards.md](./testing/stripe-test-cards.md) | Card numbers for exercising Stripe Checkout locally |
| [diagrams/](./diagrams/) | Mermaid state machines and an entity-relationship diagram |
| [features/](./features/) | Feature inventory and per-feature design notes |

## Technical Debt

[`tech-debt/`](./tech-debt/) — known architectural limitations, vendor license restrictions, and deferred refactors. Start at [tech-debt/README.md](./tech-debt/README.md).

## Conventions

- **The source is the schema.** `src/lib/types.ts`, `supabase/migrations/` and `src/lib/rxdb.ts` define the data model; these documents describe it.
- **Docs are English-only.** Turkish drafts and archived planning notes are not part of the public documentation.
- **Decisions get an ADR.** If a choice would be expensive to reverse, it belongs in [`adr/`](./adr/), not in a comment.
