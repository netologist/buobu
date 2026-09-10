# ADR-014: Local Mode, opted into through an explicit flag

## Status

Accepted

## Context

The product is local-first: [ADR-001](./001-rxdb-as-database.md) chose an
in-browser RxDB database as the store of record, and the application is expected
to keep working without a backend. The shipped application nevertheless required
a Supabase project before it would render at all: the Supabase client module
threw during module evaluation, and that module sat on the boot path of every
route.

Running a local Supabase stack instead was evaluated and rejected. A self-hosted Supabase is roughly ten containers wired by about thirty-five configuration files that belong to Supabase and change between its releases. Copying them into this repository transfers their maintenance here, and one missed file breaks auth or realtime in a way that reads as a bug in this application. Letting the Supabase CLI own those files avoids that, but keeps Supabase as a hard dependency — which is the problem being solved.

A consequence worth stating plainly: a local user provisioned to exercise every feature cannot exist. Auth, sync, entitlements, storage, MCP and billing are all backend-backed, so a fully-entitled user only exists against a real backend. That trade was made deliberately rather than overlooked.

## Decision

The application has two modes, selected at build time. `NEXT_PUBLIC_LOCAL_MODE=true` switches on Local Mode; every other value, including an unset variable, means Cloud Mode.

Selection was first derived from the absence of Supabase configuration, and that derivation was wrong in the way that only shows up in production: an unconfigured build is indistinguishable from a deliberately local one. A deploy whose Supabase variables were missing or mistyped served a single-browser app — no accounts, no sync, no backup — to users who had asked for none of it, and nothing in the build said so. Local Mode is therefore asked for by name, and the explicit flag wins over leftover Supabase values, so an env file holding both still runs local.

Cloud Mode needs both `NEXT_PUBLIC_SUPABASE_URL` and a publishable key. With the flag off and either value missing, the application stops at `src/lib/supabase.ts` with an error naming both remedies, instead of leaving the library's `supabaseUrl is required.` as the only clue.

In Local Mode the app never constructs a Supabase client, never opens replication and never calls a Worker. Identity collapses to a single Local User whose identifier is the literal `local`, which yields the IndexedDB database name `buobu-db-local` — a name a Supabase account identifier (a UUID) can never collide with.

Mode is resolved at build time because public environment values are inlined into the static export. A built artifact therefore cannot switch modes; changing mode means rebuilding.

## Considered Options

- **A local Supabase stack via docker compose.** Rejected; see Context.
- **Runtime-configurable mode** through a fetched configuration file or an in-app connection form. Rejected as unnecessary for a repository whose users clone and build it, and because it adds an asynchronous boot gate plus a surface for entering credentials.
- **A storage or sync port with the backend behind it.** That would be a refactor
  of the storage layer described by ADR-001 and the sync path described by
  ADR-005. Building it here would be disproportionate; this decision reads one
  derived constant at the gates that already exist and does not foreclose that
  work.
- **Deriving the mode from configuration presence.** The original decision, reversed here. Rejected because absence carries no intent: it cannot distinguish a user who wants a local app from a deploy whose variables went missing, and the failure is silent and user-visible.
- **Hiding the local-only indicator.** Rejected: a user would learn their data was unbacked-up only by losing it.

## Consequences

- A copy of `.env.example` plus `pnpm dev` gives the product with no account, no service to create and no network. That copy carries `NEXT_PUBLIC_LOCAL_MODE=true`, so the flag is set by the normal OSS flow rather than remembered.
- A build that omits the flag runs Cloud Mode, which is the safe direction for anything deployed: missing Supabase configuration stops the build with an error naming both remedies instead of serving a local-only app to real users.
- Local Mode data lives only in the browser. The header states this permanently and links to Export, because a silent absence of backup is discovered by losing data.
- Local and Cloud data are separate worlds. Moving between them is an explicit Export, then Import; nothing is migrated or deleted silently.
- Billing and invite codes are forced off in Local Mode whatever the environment says. Both are entirely backend-backed, and a stray environment variable must not be able to point the app at a backend that is not there.
- A mis-gated backend call fails loudly and names the access path, rather than surfacing as an inscrutable network failure.
- Documentation must state that mode is baked into the build, so supplying configuration to an existing artifact appears to do nothing.

## Related

- [ADR-001: RxDB as Database](./001-rxdb-as-database.md) — the local store Local Mode runs on.
- [Tech Stack: Backend](../tech-stack/backend.md) — the backend Cloud Mode talks to.
- [Glossary](../domain/glossary.md) — the Local Mode / Cloud Mode vocabulary.
