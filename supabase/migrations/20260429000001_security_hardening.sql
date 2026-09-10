-- ============================================================
-- Security hardening — fixes Supabase Advisor CRITICAL issues
-- ============================================================

-- ------------------------------------------------------------
-- 1. Enable RLS on Stripe event tables
--    These tables are written by the service_role webhook handler
--    only. No authenticated access is needed or allowed.
--    service_role bypasses RLS, so no policies are required.
-- ------------------------------------------------------------
ALTER TABLE public.stripe_events_processed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events_failed    ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 2. Recreate entitlements view with security_invoker = true
--    The default (security_definer) lets the view run as the
--    definer and bypass RLS on the underlying subscriptions
--    table. With security_invoker the view executes with the
--    caller's permissions, so RLS on subscriptions is respected
--    and each user only ever sees their own row.
--
--    SECURITY DEFINER functions (e.g. enforce_plus_only_sync)
--    that query this view are unaffected because they already
--    run as the superuser/definer role.
-- ------------------------------------------------------------
DROP VIEW IF EXISTS public.entitlements;

CREATE OR REPLACE VIEW public.entitlements
  WITH (security_invoker = true)
AS
SELECT
  s.user_id,
  s.plan,
  s.status,
  (s.plan = 'plus' AND s.status IN ('active', 'trialing'))                                 AS is_plus,
  (
    (s.plan = 'plus' AND s.status IN ('active', 'trialing'))
    OR (s.sync_grandfathered_until IS NOT NULL AND s.sync_grandfathered_until > NOW())
  )                                                                                         AS has_sync_access,
  s.current_period_end,
  s.cancel_at_period_end,
  s.trial_end,
  s.cohort,
  s.cohort_assigned_at,
  s.wall_of_fame_opt_in,
  s.display_name
FROM public.subscriptions s;

-- Re-grant SELECT since DROP VIEW removes all grants.
GRANT SELECT ON public.entitlements TO authenticated;

-- ------------------------------------------------------------
-- 3. Fix Auth RLS Initialization Plan on all sync tables
--    auth.uid() used directly in a policy USING/WITH CHECK
--    expression is re-evaluated for every row. Wrapping it in
--    (SELECT auth.uid()) marks it as a stable init-plan so
--    PostgreSQL evaluates it once per statement.
-- ------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'tasks', 'backlogs', 'habits', 'habit_logs',
    'vision_items', 'notes', 'mindmaps', 'boards', 'swimlanes',
    'routines', 'routine_logs', 'bookmarks'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I;
       CREATE POLICY %I ON public.%I
         FOR ALL
         USING      ((SELECT auth.uid()) = user_id)
         WITH CHECK ((SELECT auth.uid()) = user_id);',
      tbl || '_user_isolation', tbl,
      tbl || '_user_isolation', tbl
    );
  END LOOP;
END;
$$;
