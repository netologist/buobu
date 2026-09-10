# Supabase (Cloud Mode)

Cloud Mode gives you accounts, multi-device sync, avatars, billing, invite codes and the MCP API. It needs a Supabase project, and it is what every deploy runs as.

## 1. Create the project

Create a project at <https://supabase.com>. From **Project Settings → API** you need:

- the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- the **publishable key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- the **service role key** → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never in the client bundle)

This repository has never read a variable named `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Older Supabase documentation and older docs in this repository use that name; the code does not.

## 2. Configure the app

In `.env.local`:

```bash
# NEXT_PUBLIC_LOCAL_MODE=true      # comment this out — Cloud Mode is everything else
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>

# server-only: used by the dev-only routes under src/app/api/ and by the Workers
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

With `NEXT_PUBLIC_LOCAL_MODE` off, both public values are required. If either is missing the build stops with an error naming both remedies rather than quietly serving a local-only app. Restart the dev server afterwards.

## 3. Apply the migrations

All schema lives in [`supabase/migrations`](../../supabase/migrations) — 26 files, ordered by timestamp, from `20250830214000_invite_codes.sql` to `20260613110000_notes_metadata.sql`. They are plain SQL and idempotent enough to read top to bottom; there is no separate schema document because the migrations are the schema.

With the Supabase CLI:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

The CLI owns its own config, so nothing beyond the one function stanza in [`supabase/config.toml`](../../supabase/config.toml) is checked in.

Without the CLI, run the files in filename order through the dashboard's SQL editor or `psql`.

They create:

| Group | Objects |
|---|---|
| Sync data | `boards`, `swimlanes`, `tasks`, `backlogs`, `habits`, `habit_logs`, `notes`, `mindmaps`, `bookmarks`, `timeblocks`, `vision_items`, `routines`, `routine_logs` |
| Accounts and access | `api_keys`, `app_config`, `avatars` storage bucket |
| Billing | `subscriptions`, `stripe_events_processed`, `stripe_events_failed` |
| Invites and referrals | `invite_codes`, `campaign_codes`, `campaign_code_usages`, `referral_codes`, `referral_code_uses`, `cohort_counters` |

Row Level Security is enabled on the user-facing tables, with 27 policies across the migration set. The `invite_codes` and `invite_campaigns` migrations seed 100 codes each.

Key RPCs the client calls: `validate_invite_code`, `consume_invite_code`, `validate_campaign_code`, `consume_campaign_code`, `apply_campaign_benefit`, `validate_referral_code`, `use_referral_code`, `get_my_referral_info`, `get_wall_of_fame`, `regenerate_referral_code`.

## 4. Deploy the edge function

The app fetches link previews for bookmarks through a Supabase edge function. Deploy it, or bookmark metadata falls back to a locally derived value:

```bash
supabase functions deploy fetch-bookmark-metadata --project-ref <project-ref>
```

[`supabase/config.toml`](../../supabase/config.toml) sets `verify_jwt = true` for it, so callers must be signed in.

## 5. Configure Auth

**Authentication → URL Configuration:**

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/**` (and your production origin once you have one)

**Authentication → Providers:** enable Email, and Google and/or GitHub if you want OAuth. Registration with OAuth is restricted to identities that already exist, enforced by the `restrict_google_to_existing_users` migration.

Email templates for confirmation, magic link, password reset and email change are in [`supabase/templates`](../../supabase/templates). Paste them into **Authentication → Email Templates**.

## 6. Verify

In the SQL editor:

```sql
select count(*) from public.invite_codes;                 -- 100
select public.validate_invite_code((select code from public.invite_codes where used_by is null limit 1));
select public.validate_campaign_code('NOPE');              -- a clear false
```

Then register a user in the app with one of those codes and confirm rows appear in `boards` after the first sync.

## Optional feature flags

| Flag | Default | Needs |
|---|---|---|
| `NEXT_PUBLIC_INVITE_CODES_ENABLED` | enabled | the invite and referral RPCs, plus the referral Worker |
| `NEXT_PUBLIC_HOME_PAGE_ENABLED` | disabled | nothing |
| `NEXT_PUBLIC_STORAGE_INDICATOR_ENABLED` | enabled | nothing |
| `NEXT_PUBLIC_BILLING_ENABLED` | disabled | Stripe — see [billing.md](./billing.md) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | unset | unset means no captcha is rendered |

## Troubleshooting

**`Cloud Mode requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.** Both are required in Cloud Mode. The message names both remedies; the usual cause is an unset `NEXT_PUBLIC_LOCAL_MODE` in a local `.env.local`.

**Auth redirects land on the wrong page.** The Supabase redirect allow-list does not match the origin you are running on.

**Sync never starts.** Sync is gated behind an entitlement. With billing disabled, every user is treated as Plus; with billing enabled, a `subscriptions` row must exist for the user. Check `src/lib/supabase-replication.ts` and the `hasSyncAccess` gate.

**Bookmark previews are blank.** The `fetch-bookmark-metadata` function is not deployed, or `verify_jwt` no longer matches the call site.
