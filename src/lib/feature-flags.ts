/**
 * Feature flags derived from environment variables.
 *
 * The first decision is the operating mode, and it is opted into:
 *
 *   NEXT_PUBLIC_LOCAL_MODE=true — Local Mode. No account, no sync, no server.
 *   anything else, including unset — Cloud Mode. Accounts, sync, billing, MCP.
 *
 * Local Mode is asked for, never fallen into. Deriving it from the absence of
 * Supabase configuration made a missing or mistyped variable indistinguishable
 * from a deliberate choice, so a misconfigured deploy quietly served a
 * single-browser app with no accounts and no backup. Cloud Mode is what an
 * unconfigured build gets, and it fails loudly rather than silently degrading
 * (see `src/lib/supabase.ts`).
 *
 * The flag wins over leftover Supabase values: an env file holding both still
 * runs in Local Mode.
 *
 * Mode is resolved at build time (public environment values are inlined into the
 * static export), so a built artifact cannot switch modes — rebuild to change it.
 * See docs/domain/glossary.md for the vocabulary.
 */

/**
 * True when the app runs with no remote backend at all. Everything backend-facing
 * is gated on this.
 */
export const LOCAL_MODE = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';

/** True when the app runs against a remote backend. The complement of LOCAL_MODE. */
export const CLOUD_MODE = !LOCAL_MODE;

/**
 * NEXT_PUBLIC_BILLING_ENABLED=true  — Stripe billing active (production).
 *                                    Requires STRIPE_SECRET_KEY and related vars.
 * NEXT_PUBLIC_BILLING_ENABLED=false — Billing disabled (local dev / demos).
 * (not set)                         — Treated as false (billing disabled).
 *
 * When billing is disabled:
 *   - All users automatically receive Plus-tier access.
 *   - Stripe API routes return 503 with a clear error.
 *   - No Stripe environment variables are required.
 *   - Feature-limit guards are bypassed entirely.
 *   - The Plan & Billing tab is hidden in Account Settings.
 *
 * Forced off in Local Mode: billing is entirely backend-backed, and a stray
 * NEXT_PUBLIC_BILLING_ENABLED in the environment must not be able to point the
 * entitlements store at a backend that is not there.
 */
export const BILLING_ENABLED =
  CLOUD_MODE && process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true';

/** True when the local-storage usage indicator should be shown in the header. */
export const STORAGE_INDICATOR_ENABLED =
  process.env.NEXT_PUBLIC_STORAGE_INDICATOR_ENABLED !== 'false';

/**
 * True when the /home dashboard page and its nav link are visible.
 *
 * Off unless explicitly enabled: `NEXT_PUBLIC_HOME_PAGE_ENABLED=true`. The
 * dashboard is an optional surface, and the default experience lands straight
 * on Tasks.
 */
export const HOME_PAGE_ENABLED =
  process.env.NEXT_PUBLIC_HOME_PAGE_ENABLED === 'true';

/**
 * True when invite and referral codes are enabled.
 *
 * Forced off in Local Mode: codes are validated and consumed by Supabase RPCs, so
 * there is nothing to validate against.
 */
export const INVITE_CODES_ENABLED =
  CLOUD_MODE && process.env.NEXT_PUBLIC_INVITE_CODES_ENABLED !== 'false';
