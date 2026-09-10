# ADR 011 — Referral / Invite Code System

**Date:** 2026-04-29  
**Status:** Accepted — shipped  
**Author:** AI-assisted design

---

## Context

The app already had a `referral_codes` table in the DB schema, and no application code used it.
There was also a separate shared-pool campaign code system (`campaign_codes`, `campaign_code_usages`).
This ADR covers the design of a **per-user referral code** system to complement the campaign system.

---

## Decisions

| Parameter | Decision | Rationale |
|-----------|----------|-----------|
| Codes per user | 1 (auto-generated at signup) | Simpler UX; the limit is on *uses*, not codes |
| Max uses per code | **5** | Scarcity creates social value; not so tight that sharing feels pointless |
| Code lifetime | **3 months** from generation | Creates urgency to share; can be regenerated after expiry |
| Code regeneration | Allowed after expiry only | Prevents abuse (generating many codes to reset limits) |
| Who gets a code | **All registered users** | Low barrier to entry; referral flywheel from day one |
| Referrer benefit | **Visibility only (v1)** — reward mechanism added later | De-risks first ship; schema is reward-ready (`months_earned` already exists) |
| Referee benefit | **Visibility only (v1)** — reward added later | Same rationale |
| Referee identity | **Anonymised in UI** — "User #1 joined on Apr 29, 2026" | Privacy-first; no email leak |

---

## Data Model Changes

### 1. Alter `referral_codes` (new columns)

```sql
ALTER TABLE public.referral_codes
  ADD COLUMN max_uses    INT          NOT NULL DEFAULT 5,
  ADD COLUMN expires_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW() + INTERVAL '3 months';
```

The existing columns stay:
- `user_id UUID PK`
- `code TEXT UNIQUE NOT NULL CHECK (code ~ '^[A-Z0-9]{8}$')`
- `created_at TIMESTAMPTZ`
- `months_earned INT` — reserved for the v2 reward
- `months_earned_window_start TIMESTAMPTZ` — reserved for the v2 reward window

### 2. New `referral_code_uses` table

```sql
CREATE TABLE public.referral_code_uses (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_user_id  UUID        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Constraints:
- `UNIQUE (referrer_user_id, referee_user_id)` — same pair can only appear once  
- `UNIQUE (referee_user_id)` — a referee can only be attributed to one referrer

RLS: a user can SELECT rows where they are either the referrer or the referee
(`referral_code_uses_read_own`).

### 3. DB trigger — auto-generate code on user signup

An `AFTER INSERT ON auth.users` trigger (`trg_user_created_referral_code`) calls
`on_user_created_generate_referral_code()`. The function retries on collision
(max 20 attempts) and draws 8 characters from a 32-symbol alphabet that omits
look-alike characters (`0`/`O`, `1`/`I`).

---

## RPCs

### `use_referral_code(p_code TEXT) → JSONB`

Validates and records a referral code use.

Checks (in order):
1. The code exists (`not_found` otherwise)
2. The code is not expired (`expires_at > NOW()`)
3. Calling user is not the referrer themselves
4. Calling user has not already used any referral code
5. The code has uses remaining (`uses_count < max_uses`)
   — *Note*: the use count is computed from `referral_code_uses`, not stored as a counter, to avoid race conditions

Returns: `{ "ok": true }` or `{ "ok": false, "reason": "not_found"|"expired"|"self"|"already_used"|"exhausted" }`

### `get_my_referral_info() → JSONB`

Returns the calling user's referral state:

```jsonb
{
  "code":       "AB3D7F9K",
  "max_uses":   5,
  "uses_count": 2,
  "expires_at": "2026-07-29T00:00:00Z",
  "expired":    false,
  "uses": [
    { "ordinal": 1, "used_at": "2026-05-01T10:00:00Z" },
    { "ordinal": 2, "used_at": "2026-05-15T08:23:00Z" }
  ]
}
```

No referee PII is exposed. The `ordinal` is just `ROW_NUMBER() OVER (ORDER BY used_at)`.

### `regenerate_referral_code() → JSONB`

Allowed only after the current code has expired.  
Invalidates old code row, inserts a new one (new 8-char code, new 3-month window, uses reset).  
Returns `{ "ok": true, "code": "NEW8CHR" }` or `{ "ok": false, "reason": "not_expired" }`.

---

## API

The RPCs are not exposed to the browser directly. They are called by the
**referral Cloudflare Worker** (`workers/referral`), which authenticates the
caller with a Supabase access token (Bearer) and then calls the RPC with the
service role key:

| Worker endpoint | RPC |
|-----------------|-----|
| `GET /me` | `get_my_referral_info()` |
| `POST /regenerate` | `regenerate_referral_code()` |
| `POST /use` (body `{ code }`) | `use_referral_code(p_code)` |

The client side is `src/lib/referral.ts`, which posts to
`NEXT_PUBLIC_REFERRAL_API_URL`. There are no Next.js API routes for referrals.

---

## UI

### New "Referrals" tab in `AccountSettingsModal`

Navigation item: `{ id: "referrals", label: "Invite Friends", icon: Users }` — shown when invite codes are enabled (Cloud Mode, and `NEXT_PUBLIC_INVITE_CODES_ENABLED` not `false`). It is not tied to `BILLING_ENABLED`, and Local Mode has no referrals at all.

```
┌─────────────────────────────────────────────────────┐
│  Invite Friends                                     │
│                                                     │
│  Share your referral code and grow the community.   │
│                                                     │
│  ┌────────────────────────────────────────────┐    │
│  │  AB3D7F9K                         [ Copy ] │    │
│  └────────────────────────────────────────────┘    │
│                                                     │
│  ██████████░░░░░░░░░░  2 / 5 uses                  │
│  Expires in 87 days  (Jul 29 2026)                 │
│                                                     │
│  Recent referrals                                   │
│  ─────────────────                                  │
│  ✓  User #1 — joined May 1, 2026                   │
│  ✓  User #2 — joined May 15, 2026                  │
│                                                     │
│  ─────────────────────────────────────────────     │
│  Rewards coming soon. Every referral helps us       │
│  grow — thank you!                                  │
└─────────────────────────────────────────────────────┘
```

When code is expired:
```
  Code expired.   [ Generate new code ]
```

---

## Future v2 Hooks (not in scope now)

- On referee's first paid invoice → `months_earned += 1` in `referral_codes`, extend Stripe subscription
- Referee gets: trial extended from 7 → 14 days (Stripe `trial_end` override in `use_referral_code`)
- Leaderboard: top referrers shown on a public "Wall of Fame" variant
- Email notification to referrer when code is used

---

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| Multiple codes per user (one per invitee) | Adds complexity; one code with a use-count is simpler and more shareable |
| Codes never expire | Without expiry there is no regeneration trigger → no sense of freshness or urgency |
| Rolling expiry (reset on each use) | Could keep a highly-used code alive indefinitely; 3-month hard window is simpler |
| Require Plus to share | Contradicts the goal of a viral referral loop from all users |

---

## What shipped

- `supabase/migrations/20260429000000_referral_codes_v2.sql` — `max_uses` and
  `expires_at` on `referral_codes`, the `referral_code_uses` table with its
  unique constraints and RLS policy, the signup trigger, and all three RPCs.
- `workers/referral` — the `/me`, `/regenerate` and `/use` endpoints.
- `src/lib/referral.ts` — client fetch helpers.
- `src/components/auth/ReferralSection.tsx` — the tab content, wired into
  `AccountSettingsModal` as the **Invite Friends** tab.

Companion migrations that followed: `20260429000002_referral_rpc_server_overloads.sql`
(server-side RPC overloads) and `20260429000003_validate_referral_code_anon.sql`
(anonymous validation during registration).
