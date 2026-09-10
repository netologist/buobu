# Local Mode

The default. No account, no sign-up, no service to create, no network calls to any backend. Data lives in this browser's IndexedDB and nowhere else.

## Run it

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open <http://localhost:3000>. The copied file contains `NEXT_PUBLIC_LOCAL_MODE=true`.

`pnpm build` produces the same app as a static export in `out/`.

## What is available

Everything except the backend-backed surfaces:

| Feature | Local Mode |
|---|---|
| Tasks, habits, routines, notes, bookmarks, mindmaps, whiteboards, time blocks | yes |
| Multi-device sync | no |
| Accounts, avatars, password reset, OAuth | no |
| Billing, invite codes, referral codes, MCP and API keys | no |

Billing and invite codes are forced off whatever the environment says. Both are entirely backend-backed, and a stray variable must not be able to point the app at a backend that is not there.

## Identity and storage

The app runs as a single synthetic **Local User** whose identifier is the literal `local`. That yields the IndexedDB database name `buobu-db-local` — a name a Supabase account identifier (a UUID) can never collide with.

The header shows a permanent **Local only** indicator. Click it for an explanation and a link to Export. It is not decoration: nothing is synced and nothing is backed up, and a silent absence of backup is normally discovered by losing data.

If you clear browser storage, switch browser profiles, or use a private window, that data is gone.

## Backups, and moving into an account

**Export Data** and **Import Data** are in the account menu; Export is also linked from the Local only indicator.

Local Mode and Cloud Mode keep **separate databases**, and nothing is migrated or deleted automatically. To move across:

1. In Local Mode, **Export Data**.
2. Turn off `NEXT_PUBLIC_LOCAL_MODE`, set your Supabase configuration, and restart (mode is read at build time).
3. Sign in, then **Import Data** at the first-login prompt.

The Local Mode database is left untouched, so you can go back to it.

## Consequences worth knowing

- A built artifact cannot switch modes. Mode is inlined at build time; rebuild to change it.
- The Supabase client is never constructed. Any missed gate throws `Supabase is not available in Local Mode (accessed <path>)` rather than failing as a network error.
- A user provisioned to exercise every feature cannot exist in Local Mode. Auth, sync, entitlements, storage, MCP and billing are backend-backed, so a fully entitled user only exists against a real backend. This is deliberate — see [`docs/adr/014-local-mode.md`](../adr/014-local-mode.md).

## Troubleshooting

**The app throws `Cloud Mode requires NEXT_PUBLIC_SUPABASE_URL ...`.** `NEXT_PUBLIC_LOCAL_MODE` is not exactly `true` — the only value that switches Local Mode on. Check for a typo, quoting, or trailing whitespace, and restart the dev server.

**Editing `.env.local` appears to do nothing.** Restart the dev server. Public values are read at build time, not per request.

**Change the mode and the old data is missing.** Expected: Local and Cloud use different databases. Export from one and import into the other.
