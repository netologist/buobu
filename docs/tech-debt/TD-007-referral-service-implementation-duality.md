# TD-007: Referral Service Implementation Duality

## Status

**Resolved / Canonicalized** — 2026-09-12 (Supabase RPC selected as canonical source; `useReferralCode` marked `@deprecated` in `src/lib/referral.ts`)

## Context

The referral and invite code workflow has two divergent implementations:

1. **Cloudflare Worker API:**
   - [`workers/referral/index.ts`](file:///Users/hozgan/devbox/personal/buobu-oss/workers/referral/index.ts) provides a `/use` endpoint to validate and mark referral code consumption.
   - [`src/lib/referral.ts`](file:///Users/hozgan/devbox/personal/buobu-oss/src/lib/referral.ts) exports `useReferralCode(code, userId)` which calls this worker endpoint.
2. **Direct Supabase RPC:**
   - In [`src/app/auth/register/page.tsx`](file:///Users/hozgan/devbox/personal/buobu-oss/src/app/auth/register/page.tsx), registration directly calls the Supabase RPC stored procedure `validate_referral_code`:
   ```ts
   const { data, error } = await supabase.rpc('validate_referral_code', { p_code: code });
   ```

### Problem Analysis

- The client-side library function `useReferralCode` and the worker's `/use` route are disconnected from the actual user registration flow.
- Maintaining business logic in both a Cloudflare Worker and a Supabase RPC creates synchronization overhead and security boundary divergence.

## Remediation Plan

1. Choose a single source of truth for referral validation:
   - **Option A (Supabase RPC):** If validation stays in Supabase, remove or deprecate the unused `/use` route from the Cloudflare Worker and remove `useReferralCode` from `src/lib/referral.ts`.
   - **Option B (Edge Worker):** If rate limiting and edge execution are required, route the register page validation through `useReferralCode` and the worker.

## Related

- Issue [#21](https://github.com/netologist/buobu/issues/21)
- [`src/lib/referral.ts`](file:///Users/hozgan/devbox/personal/buobu-oss/src/lib/referral.ts)
- [`workers/referral/index.ts`](file:///Users/hozgan/devbox/personal/buobu-oss/workers/referral/index.ts)
- [`src/app/auth/register/page.tsx`](file:///Users/hozgan/devbox/personal/buobu-oss/src/app/auth/register/page.tsx)
- [ADR-011: Referral Invite Code System](../adr/011-referral-invite-code-system.md)
