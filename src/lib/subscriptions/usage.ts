/**
 * Usage counters — computed client-side from local RxDB collections.
 *
 * All counts apply the same rule:
 *   _deleted = false AND (archived IS NULL OR archived = false)
 * Archived items do not count against Free quotas.
 *
 * tasks and notes are NOT counted here — they have no Free-tier cap.
 * swimlanesPerBoard is handled separately via getSwimlanesForBoard().
 *
 * Note on RxDB count API (v15+):
 *   collection.count({ selector }).exec()  →  Promise<number>
 *   Do NOT use .find().exec().then(r => r.length) — loads full documents.
 */

import type { Database } from '@/lib/rxdb';
import type { CappedFeature } from './limits';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

/**
 * Current usage for every globally-capped feature.
 * swimlanesPerBoard is excluded — it's per-board (see getSwimlanesForBoard).
 */
export type Usage = Readonly<Record<Exclude<CappedFeature, 'swimlanesPerBoard'>, number>>;

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

const ACTIVE_SELECTOR = { _deleted: false } as const;
const ACTIVE_NOT_ARCHIVED_SELECTOR = { _deleted: false, archived: { $ne: true } } as const;

/**
 * Fetch current usage counts for all globally-capped features.
 * Call this once per "create" action so counts are always fresh.
 */
export async function getUsage(db: Database): Promise<Usage> {
  const [boards, routines, habits, bookmarks, whiteboards, mindmaps] = await Promise.all([
    db.boards.count({ selector: ACTIVE_NOT_ARCHIVED_SELECTOR }).exec(),
    db.routines.count({ selector: ACTIVE_NOT_ARCHIVED_SELECTOR }).exec(),
    db.habits.count({ selector: ACTIVE_NOT_ARCHIVED_SELECTOR }).exec(),
    db.bookmarks.count({ selector: ACTIVE_SELECTOR }).exec(),
    db.visionItems.count({ selector: ACTIVE_NOT_ARCHIVED_SELECTOR }).exec(),
    db.mindmaps.count({ selector: ACTIVE_NOT_ARCHIVED_SELECTOR }).exec(),
  ]);

  return { boards, routines, habits, bookmarks, whiteboards, mindmaps };
}

/**
 * Count active (non-deleted, non-archived) swimlanes for one specific board.
 * Used to enforce the per-board swimlane limit.
 */
export async function getSwimlanesForBoard(db: Database, boardId: string): Promise<number> {
  return db.swimlanes
    .count({ selector: { boardId, _deleted: false, archived: { $ne: true } } })
    .exec();
}
