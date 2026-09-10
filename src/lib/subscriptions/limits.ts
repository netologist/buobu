/**
 * Subscription plan limits — source of truth for Free-tier caps.
 *
 * Rules:
 * - tasks and notes have NO count cap on Free; they are NOT listed here.
 * - null-check: if PLAN_LIMITS[feature] is undefined, it means unlimited.
 * - swimlanesPerBoard is per-board, not global (see usage.ts / guards.ts).
 */

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

/**
 * Every feature that has a numeric create-cap on the Free tier.
 * tasks and notes are intentionally excluded — conversion for those
 * is driven by sync/API gating, not by a count limit.
 */
export type CappedFeature =
  | 'boards'
  | 'swimlanesPerBoard'
  | 'routines'
  | 'habits'
  | 'bookmarks'
  | 'whiteboards'
  | 'mindmaps';

/** Plus-only boolean gates — no count, just enabled/disabled. */
export type PlusOnlyFeature = 'cloud_sync' | 'api_keys' | 'mcp';

// -----------------------------------------------------------------------
// Free-tier limits
// -----------------------------------------------------------------------

/**
 * Numeric limits for the Free tier.
 * Plus tier = unlimited for all (null / not checked).
 */
export const PLAN_LIMITS: Readonly<Record<CappedFeature, number>> = {
  boards: 2,
  swimlanesPerBoard: 3,
  routines: 10,
  habits: 10,
  bookmarks: 100,
  whiteboards: 10,
  mindmaps: 10,
} as const;

// -----------------------------------------------------------------------
// Plus-only features
// -----------------------------------------------------------------------

export const PLUS_ONLY_FEATURES = [
  'cloud_sync',
  'api_keys',
  'mcp',
] as const satisfies readonly PlusOnlyFeature[];
