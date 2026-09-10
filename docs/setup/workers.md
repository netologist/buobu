# Cloudflare Workers

Two Workers, both Cloud Mode only. Neither is needed to run the app; between them they add MCP access and referral codes.

| Worker | Source | Does |
|---|---|---|
| MCP | `workers/mcp/index.ts` | Serves the Model Context Protocol so external clients (Claude, Cursor, any MCP host) can read and write your data |
| Referral | `workers/referral/index.ts` | Serves referral-code endpoints the app calls |

They declare no D1, R2, KV or Durable Object bindings. Everything they store lives in Supabase, which they reach with the service-role key.

## Secrets

Both Workers require the same two secrets:

```bash
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

They are marked `required` in each `wrangler.jsonc`, so `wrangler deploy` refuses to publish an environment that is missing one.

Each also takes an optional CORS origin, with different names on the two sides:

| Purpose | Client env | Worker secret |
|---|---|---|
| MCP allowed origin | `MCP_ALLOWED_ORIGIN` | `MCP_ALLOWED_ORIGIN` |
| Referral allowed origin | `REFERRAL_ALLOWED_ORIGIN` | `ALLOWED_ORIGIN` |

Unset means `*`, which allows every origin. Set them.

## Local development

```bash
pnpm dev:mcp        # http://localhost:8787
pnpm dev:referral   # http://localhost:8789
```

Put the secrets in `workers/mcp/.dev.vars` and `workers/referral/.dev.vars`. Both are gitignored, as is `workers/*/secrets.json`.

Point the app at them in `.env.local`:

```bash
NEXT_PUBLIC_MCP_URL=http://localhost:8787
NEXT_PUBLIC_REFERRAL_API_URL=http://localhost:8789
```

The Workers need a Supabase project to talk to, so this is a Cloud Mode workflow.

## Deploying

```bash
pnpm exec wrangler login
pnpm deploy:mcp
pnpm deploy:referral
```

Both configs define `production` and `staging` environments and publish to `*.workers.dev`, so deploying works without owning a domain at all.

**Custom domains are attached in the Cloudflare dashboard, not in the config.** There is deliberately no `routes` key in `workers/*/wrangler.jsonc`: Wrangler treats `routes` as the source of truth and overwrites dashboard-defined routes on every deploy, so leaving the key out is what keeps the two from fighting. Cloudflare documents this under [other deprecated behavior](https://developers.cloudflare.com/workers/wrangler/deprecations/#other-deprecated-behavior).

To put a Worker on your own domain:

1. Cloudflare Dashboard → **Workers & Pages** → the worker → **Settings → Domains & Routes → Add → Custom Domain**.
2. Point `NEXT_PUBLIC_MCP_URL` (or `NEXT_PUBLIC_REFERRAL_API_URL`) at it.
3. Add the domain to `connect-src` in [`public/_headers`](../../public/_headers), or the browser will block the app's calls to it.

Until then, use the `*.workers.dev` URL for step 2 and skip step 3 — that host is already allowed.

CI used to build `workers/*/secrets.json` from GitHub secrets and pass it to `wrangler deploy --secrets-file`. That pipeline is disabled (see [deployment.md](./deployment.md)), so set the secrets yourself:

```bash
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config workers/mcp/wrangler.jsonc --env production
```

## The MCP Worker

- Speaks Remote MCP over Streamable HTTP. It answers on `/` and `/mcp`.
- Authenticates with a **buobu API key** in the `Authorization` header. Keys are generated in the app under Account Settings → MCP/API, carry a `buobu_` prefix, and are stored **hashed** (SHA-256) in `public.api_keys` with scopes and an optional expiry. The plaintext key is shown once, at creation.
- Rate-limits each key to **60 requests per 60 seconds**; windows are pruned every five minutes. See [`docs/architecture/modules/rate-limit.md`](../architecture/modules/rate-limit.md).
- Acts on Supabase with the service-role key, deliberately bypassing RxDB: the same tool layer can then serve an in-app assistant later.
- Tool modules, in `src/lib/mcp/tools/`: `tasks`, `habits`, `routines`, `notes`, `bookmarks`, `mindmaps`, `boards`, `timeblocks`, `analytics`. There are no whiteboard tools.

## The Referral Worker

- Authenticates with a **Supabase access token** as a Bearer token, validated with `supabase.auth.getUser`. No API keys.
- Endpoints: `GET /me`, `POST /regenerate`, `POST /use`. Anything else is a 404.
- Reads and writes the `referral_codes` and `referral_code_uses` tables through the RPCs created by `20260429000000_referral_codes_v2.sql` and `20260429000002_referral_rpc_server_overloads.sql`.
- Gated in the client by `NEXT_PUBLIC_INVITE_CODES_ENABLED`, which is on by default in Cloud Mode.
