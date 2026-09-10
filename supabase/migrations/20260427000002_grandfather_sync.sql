-- ============================================================
-- M3: One-time grandfather migration
-- ============================================================
-- Grants a 90-day sync window to every existing user who
-- already has at least one row in any sync table.
-- This ensures that users who were already syncing before
-- the billing launch are not immediately cut off.
--
-- Safe to run multiple times (only updates rows where
-- sync_grandfathered_until IS NULL to avoid shrinking
-- an already-granted window).
-- ============================================================

DO $$
DECLARE
  sync_tables TEXT[] := ARRAY[
    'boards', 'swimlanes', 'tasks', 'backlogs',
    'habits', 'habit_logs', 'vision_items', 'notes',
    'mindmaps', 'routines', 'routine_logs', 'bookmarks'
  ];
  tbl TEXT;
  affected BIGINT := 0;
BEGIN
  -- Build a temporary set of user_ids that have data in any sync table.
  CREATE TEMP TABLE IF NOT EXISTS _grandfathered_users (user_id UUID PRIMARY KEY);

  FOREACH tbl IN ARRAY sync_tables LOOP
    EXECUTE format(
      'INSERT INTO _grandfathered_users (user_id)
         SELECT DISTINCT user_id FROM public.%I
        WHERE user_id IS NOT NULL
       ON CONFLICT DO NOTHING',
      tbl
    );
  END LOOP;

  -- Update subscriptions: only rows that have never been grandfathered.
  UPDATE public.subscriptions s
     SET sync_grandfathered_until = NOW() + INTERVAL '90 days'
    FROM _grandfathered_users g
   WHERE s.user_id = g.user_id
     AND s.sync_grandfathered_until IS NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RAISE NOTICE 'grandfather migration: granted 90-day window to % users', affected;

  DROP TABLE _grandfathered_users;
END $$;
