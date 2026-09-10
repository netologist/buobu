# Backend

## Overview

**Supabase** is the only backend: it provides Auth, Postgres (with PostgREST), Storage and Realtime. Cloud Mode uses it; Local Mode uses no backend at all.

Two Cloudflare Workers run alongside it:

| Worker | Directory | Purpose |
|--------|-----------|---------|
| MCP | `workers/mcp` | Streamable HTTP MCP server, authenticated with per-user API keys |
| Referral | `workers/referral` | Referral/invite code API used by the onboarding flow |

Both are deployed with Wrangler through the `dev:*` and `deploy:*` scripts in `package.json`. Neither declares D1, R2, KV or Durable Object bindings, so the only state either holds is in-process (the MCP worker caches rate-limit windows and Supabase clients on `globalThis`).

`supabase/functions/fetch-bookmark-metadata` is a Supabase Edge Function that scrapes OpenGraph metadata for bookmarks.

## Architecture

```
┌─────────────────────────────────────────────┐
│                 Supabase                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │ Postgres │  │ Storage  │   │
│  │ Sessions │  │ + REST   │  │ Avatars  │   │
│  └──────────┘  └──────────┘  └──────────┘   │
│         │              │             │       │
│         └──────────────┴─────────────┘       │
│                    Realtime                  │
└─────────────────────────────────────────────┘
        ▲                        ▲
        │  PostgREST + Realtime  │  service role
        │                        │
┌───────────────┐        ┌───────────────────┐
│  Browser app  │        │ Cloudflare Workers│
│  (RxDB client)│        │  mcp / referral   │
└───────────────┘        └───────────────────┘
```

## Storage Strategy

| Storage | Data | Size |
|---------|------|------|
| Postgres | User-scoped app data, invite/referral codes, subscriptions, API keys | KBs-MBs |
| Supabase Auth | User accounts, sessions, refresh tokens | Managed by Supabase |
| Supabase Storage | Public avatar files in the `avatars` bucket | KBs-MBs |

### Core Database Objects

Defined by the SQL files in `supabase/migrations/`.

```sql
-- Supabase-managed auth users
auth.users

-- User-scoped sync tables (one per replicated RxDB collection)
boards
swimlanes
tasks
backlogs
habits
habit_logs
vision_items
notes
mindmaps
bookmarks
routines
routine_logs
timeblocks

-- Billing and entitlements
subscriptions
stripe_events_processed
stripe_events_failed
cohort_counters
app_config

-- Invite, referral and campaign codes
invite_codes
campaign_codes
campaign_code_usages
referral_codes
referral_code_uses

-- MCP API keys
api_keys
```

Every sync table stores the entity as columns plus `user_id`, `_version`, `_createdAt`, `_updatedAt`, `_deleted`, `_deviceId` and `_modified`. A `set_row_modified` trigger rewrites `_modified` and `updated_at` on every `UPDATE`, so the server timestamp is authoritative.

Row Level Security is enabled on these tables with policies of the form `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`, so a client can only read and write its own rows. The Workers and the server-only Stripe routes use the service-role key instead, which bypasses RLS.

Most sync tables are indexed on `(user_id, _modified, id)` to match the replication pull order.

## Authentication

Authentication uses Supabase Auth:

- access tokens are JWTs issued by Supabase
- refresh tokens are used to rotate sessions
- PostgREST, Storage and Realtime calls are authorized with `Authorization: Bearer <access_token>`
- Row Level Security relies on `auth.uid()`

See [Authentication](./authentication.md) for the detailed flow.

## Billing

Stripe powers Plus subscriptions. The server-only route handlers live in `src/app/api/stripe/{checkout,portal,webhook}` and run **only** under `pnpm dev` — a static export has no server to run them. Subscription state is read from the `subscriptions` table (and the entitlements view) and gated in the client through `useEntitlementsStore`.

## Project Structure

```
supabase/
├── migrations/            # Postgres schema, RLS policies, RPCs and triggers
├── functions/             # Edge Functions (fetch-bookmark-metadata)
└── templates/             # Auth email templates

workers/
├── mcp/                   # MCP Worker (index.ts, wrangler.jsonc)
└── referral/              # Referral Worker (index.ts, wrangler.jsonc)

src/lib/
├── supabase.ts            # Supabase client (Cloud Mode) / throwing stub (Local Mode)
├── supabase-admin.ts      # Service-role client for server-side route handlers
├── supabase-replication.ts
├── mcp/                   # MCP tools and server shared with the Worker
└── auth/
    └── service.ts         # App-facing auth service
```

## Development

```bash
pnpm dev              # App (see README for Local vs Cloud Mode setup)
pnpm dev:mcp          # MCP worker via wrangler dev
pnpm dev:referral     # Referral worker via wrangler dev
pnpm deploy:mcp       # wrangler deploy
pnpm deploy:referral  # wrangler deploy
```

Cloud Mode requires the schema and functions in `supabase/migrations` to be applied to your project.

## Configuration

Source reads these variables:

| Variable | Used by |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | App, both Workers |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | App (with `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` as a fallback name) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only routes and both Workers |
| `NEXT_PUBLIC_MCP_URL` | App (API keys UI) |
| `MCP_ALLOWED_ORIGIN` | MCP worker |
| `NEXT_PUBLIC_REFERRAL_API_URL` | Referral worker endpoint used by the app; the Worker itself reads its allowed origin from the `ALLOWED_ORIGIN` secret |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL` | Stripe routes |
| `NEXT_PUBLIC_STRIPE_PRICE_PLUS_MONTHLY`, `NEXT_PUBLIC_STRIPE_PRICE_PLUS_YEARLY` | Checkout pricing |

Session-duration settings such as JWT expiry and inactivity timeout live in the hosted Supabase project, not in this repository.

## Related

- [Authentication](./authentication.md)
