/**
 * Subscription guard helpers — enforce Free-tier create limits.
 *
 * Usage pattern:
 *
 *   // Global feature (boards, habits, etc.)
 *   const usage = await getUsage(db);
 *   const result = canCreateFromUsage('boards', usage, isPlus);
 *   if (!result.ok) { openUpgradeDialog(result); return; }
 *
 *   // Per-board swimlane limit
 *   const current = await getSwimlanesForBoard(db, boardId);
 *   const result = canCreate('swimlanesPerBoard', current, isPlus);
 *   if (!result.ok) { openUpgradeDialog(result); return; }
 */

import { PLAN_LIMITS, type CappedFeature } from './limits';
import type { Usage } from './usage';

// -----------------------------------------------------------------------
// Result types
// -----------------------------------------------------------------------

export type GuardOk = { ok: true };

export type GuardBlock = {
  ok: false;
  reason: 'FREE_LIMIT';
  feature: CappedFeature;
  limit: number;
  current: number;
};

export type GuardResult = GuardOk | GuardBlock;

// -----------------------------------------------------------------------
// Core guard
// -----------------------------------------------------------------------

/**
 * Check whether a new item of `kind` can be created given `current` count.
 *
 * For swimlanesPerBoard: pass the result of getSwimlanesForBoard() as `current`.
 * For all other features: prefer canCreateFromUsage() for convenience.
 *
 * Plus users always pass — no count checks.
 */
export function canCreate(
  kind: CappedFeature,
  current: number,
  isPlus: boolean,
): GuardResult {
  if (isPlus) return { ok: true };

  const limit = PLAN_LIMITS[kind];
  if (current >= limit) {
    return { ok: false, reason: 'FREE_LIMIT', feature: kind, limit, current };
  }

  return { ok: true };
}

// -----------------------------------------------------------------------
// Convenience: check using pre-fetched Usage map
// -----------------------------------------------------------------------

/**
 * Convenience wrapper for non-per-board features.
 * swimlanesPerBoard is intentionally excluded — use canCreate() directly
 * with a getSwimlanesForBoard() result for that case.
 */
export function canCreateFromUsage(
  kind: Exclude<CappedFeature, 'swimlanesPerBoard'>,
  usage: Usage,
  isPlus: boolean,
): GuardResult {
  return canCreate(kind, usage[kind], isPlus);
}
