/**
 * activate-sync.ts
 *
 * One-time migration helper: push all local RxDB data to Supabase
 * when a Free user upgrades to Plus.
 *
 * Flow:
 *   1. Called after the webhook confirms plan='plus'.
 *   2. Iterates every replicated RxDB collection.
 *   3. Pushes all non-deleted documents to Supabase via upsert.
 *   4. Then starts the normal replication pipeline.
 *
 * This file is intentionally thin — actual replication start is
 * delegated to startSupabaseReplication() in supabase-replication.ts.
 */

import type { Database } from '@/lib/rxdb';
import { supabase } from '@/lib/supabase';

const SYNC_TABLES: Array<{ collection: keyof Database['collections']; table: string }> = [
  { collection: 'boards',      table: 'boards' },
  { collection: 'swimlanes',   table: 'swimlanes' },
  { collection: 'tasks',       table: 'tasks' },
  { collection: 'backlogs',    table: 'backlogs' },
  { collection: 'habits',      table: 'habits' },
  { collection: 'habitLogs',   table: 'habit_logs' },
  { collection: 'visionItems', table: 'vision_items' },
  { collection: 'notes',       table: 'notes' },
  { collection: 'mindmaps',    table: 'mindmaps' },
  { collection: 'routines',    table: 'routines' },
  { collection: 'routineLogs', table: 'routine_logs' },
  { collection: 'bookmarks',   table: 'bookmarks' },
];

const UPSERT_BATCH_SIZE = 50;

/**
 * Push all local RxDB documents to Supabase in batches.
 * Called once when a Free → Plus upgrade is confirmed.
 */
export async function activateSync(db: Database, userId: string): Promise<void> {
  for (const { collection, table } of SYNC_TABLES) {
    const col = db.collections[collection];
    if (!col) continue;

    // Fetch all non-deleted documents.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const docs = await (col as any).find({ selector: { _deleted: false } }).exec();

    // Attach user_id and push in batches.
    for (let i = 0; i < docs.length; i += UPSERT_BATCH_SIZE) {
      const batch = docs
        .slice(i, i + UPSERT_BATCH_SIZE)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((doc: any) => ({ ...doc.toJSON(), user_id: userId }));

      const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' });

      if (error) {
        throw new Error(`activateSync: failed to push ${table} batch ${i}: ${error.message}`);
      }
    }
  }
}
