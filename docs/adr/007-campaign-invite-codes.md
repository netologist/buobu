# ADR-007: Campaign Codes

## Status

**Accepted** - 2026-03

## Context

The application uses a closed beta onboarding system with codes. The original implementation (`20250830214000_invite_codes.sql`) had:

- Single-use codes (1 code = 1 user)
- No expiration date
- No usage tracking per user

This approach doesn't scale for marketing campaigns where:
- A single code should be usable by multiple users (e.g., "LAUNCH2026" for 500 users)
- Campaigns have time limits (e.g., 1 month validity)
- We need to track which users used which campaign code

## Definitions

- **Campaign Code** - A reusable code with configurable limits (max uses, expiry)
- **Usage** - A record of a user consuming a campaign code

## Alternatives Considered

### Option 1: Keep Single-Use Codes
- **Pros:** Simpler data model, no counter management
- **Cons:** Requires generating hundreds of codes for campaigns, harder to track campaign effectiveness

### Option 2: Multi-Use Codes with Redis Counter
- **Pros:** Fast atomic counter increments
- **Cons:** Adds Redis dependency, data split between Postgres and Redis

### Option 3: Multi-Use Codes in Postgres (Selected)
- **Pros:** Single source of truth, ACID guarantees, leverages existing Supabase setup
- **Cons:** Row-level locking for counter increments

## Decision

Implement campaign-based multi-use codes with:

1. **`campaign_codes` table** - Stores campaign tokens
   - `max_uses` (NOT NULL) - Maximum number of users
   - `current_uses` - Running counter
   - `expires_at` (NOT NULL) - Campaign deadline
   - `is_active` - Manual enable/disable

2. **`campaign_code_usages` table** - Tracks who used what
   - `campaign_code_id` + `user_id` unique constraint
   - Prevents same user using same code twice

3. **RPC Functions**
   - `validate_campaign_code(p_code, p_campaign_type, p_user_id)` — check validity
   - `consume_campaign_code(p_code, p_campaign_type, p_user_id)` — atomic consume with counter increment

   `p_campaign_type` is required because one `campaign_codes` row can be an
   `invite`, `voucher`, `promo` or `referral` code; the registration flow passes
   `'invite'`.

## Consequences

### Positive
- Single code can serve entire campaign (e.g., 500 users)
- Easy campaign tracking via `campaign_code_usages`
- Time-limited campaigns reduce indefinite code exposure
- Same user cannot abuse single code multiple times

### Negative
- Counter increment requires row-level lock (`FOR UPDATE`)
- Slightly more complex validation logic

## Related

- Migrations: `supabase/migrations/20250901000000_invite_campaigns.sql`,
  `supabase/migrations/20260427000001_campaign_codes_ext.sql`
- Call site: `src/lib/auth/service.ts` (registration validates and consumes the code)
- [ADR-011: Referral / Invite Code System](./011-referral-invite-code-system.md) — the per-user system that complements campaign codes
