-- ============================================================
-- M1: Subscriptions, Entitlements, Stripe event tables
-- ============================================================

-- ------------------------------------------------------------
-- 1. subscriptions table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id       TEXT UNIQUE,
  stripe_subscription_id   TEXT UNIQUE,
  stripe_price_id          TEXT,
  plan                     TEXT NOT NULL DEFAULT 'free'
                           CHECK (plan IN ('free', 'plus')),
  status                   TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN (
                             'active','trialing','past_due','canceled',
                             'incomplete','incomplete_expired','unpaid','paused'
                           )),
  sync_grandfathered_until TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  cancel_at_period_end     BOOLEAN NOT NULL DEFAULT FALSE,
  trial_end                TIMESTAMPTZ,
  -- Cohort fields (M6.5 — pre-created here so webhook can write atomically)
  cohort                   TEXT NOT NULL DEFAULT 'standard'
                           CHECK (cohort IN ('founder', 'early', 'standard')),
  cohort_assigned_at       TIMESTAMPTZ,
  wall_of_fame_opt_in      BOOLEAN NOT NULL DEFAULT FALSE,
  display_name             TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
  ON public.subscriptions (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub
  ON public.subscriptions (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription; writes are service_role only.
DROP POLICY IF EXISTS subs_read_own ON public.subscriptions;
CREATE POLICY subs_read_own ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Auto-update updated_at on writes.
CREATE OR REPLACE FUNCTION public.touch_subscriptions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_touch_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_touch_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_subscriptions_updated_at();

-- ------------------------------------------------------------
-- 2. Default free row — auto-created for every new auth user.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_subscription();

-- ------------------------------------------------------------
-- 3. entitlements view — derived, read-only.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.entitlements AS
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

-- Grant authenticated users SELECT on the view.
GRANT SELECT ON public.entitlements TO authenticated;

-- ------------------------------------------------------------
-- 4. Stripe event idempotency / failure tables
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_events_processed (
  event_id     TEXT PRIMARY KEY,
  event_type   TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stripe_events_failed (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  error       TEXT NOT NULL,
  raw_payload JSONB,
  failed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_failed_event
  ON public.stripe_events_failed (event_id);

-- Both tables are write-only for service_role; no authenticated access needed.

-- ------------------------------------------------------------
-- 5. enforce_plus_only_sync trigger function
--    Attached to every sync table in step 6 below.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_plus_only_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_sync_access BOOLEAN;
BEGIN
  SELECT has_sync_access
  INTO   v_has_sync_access
  FROM   public.entitlements
  WHERE  user_id = NEW.user_id;

  IF v_has_sync_access IS NULL OR NOT v_has_sync_access THEN
    RAISE EXCEPTION 'SYNC_ACCESS_REQUIRED';
  END IF;

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 6. Attach sync-access trigger to all 12 replicated tables.
--    Using DO block to avoid repetition.
-- ------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'boards', 'swimlanes', 'tasks', 'backlogs',
    'habits', 'habit_logs', 'vision_items', 'notes',
    'mindmaps', 'routines', 'routine_logs', 'bookmarks'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS enforce_sync_access ON public.%I;
       CREATE TRIGGER enforce_sync_access
         BEFORE INSERT OR UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.enforce_plus_only_sync();',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- 7. cohort_counters table (needed by checkout webhook)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cohort_counters (
  tier       TEXT PRIMARY KEY CHECK (tier IN ('founder', 'early')),
  max_slots  INT NOT NULL,
  used_slots INT NOT NULL DEFAULT 0,
  deadline   TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.cohort_counters ENABLE ROW LEVEL SECURITY;

-- Public read so the landing page can show live slot counts.
DROP POLICY IF EXISTS cohort_counters_public_read ON public.cohort_counters;
CREATE POLICY cohort_counters_public_read ON public.cohort_counters
  FOR SELECT USING (true);

INSERT INTO public.cohort_counters (tier, max_slots, deadline) VALUES
  ('founder', 100, '2026-06-30T23:59:59Z'),
  ('early',   400, '2026-09-30T23:59:59Z')
ON CONFLICT (tier) DO NOTHING;

-- Atomic slot-claim function — called from webhook on first paid invoice.
CREATE OR REPLACE FUNCTION public.claim_cohort_slot(p_tier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed INT;
BEGIN
  UPDATE public.cohort_counters
  SET    used_slots = used_slots + 1
  WHERE  tier       = p_tier
    AND  used_slots < max_slots
    AND  deadline   > NOW()
  RETURNING used_slots INTO v_claimed;

  RETURN v_claimed IS NOT NULL;
END;
$$;

-- ------------------------------------------------------------
-- 8. referral_codes table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code         TEXT UNIQUE NOT NULL CHECK (code ~ '^[A-Z0-9]{8}$'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  months_earned INT NOT NULL DEFAULT 0,
  months_earned_window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referral_codes_read_own ON public.referral_codes;
CREATE POLICY referral_codes_read_own ON public.referral_codes
  FOR SELECT USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 9. wall_of_fame — SECURITY DEFINER function (not a view).
--    A plain VIEW joining auth.users is inaccessible to anon/authenticated roles.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_wall_of_fame()
RETURNS TABLE (
  display_name       TEXT,
  cohort             TEXT,
  cohort_assigned_at TIMESTAMPTZ,
  avatar_url         TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql STABLE AS $$
  SELECT
    s.display_name,
    s.cohort,
    s.cohort_assigned_at,
    (u.raw_user_meta_data ->> 'avatar_url')::TEXT
  FROM public.subscriptions s
  JOIN auth.users u ON u.id = s.user_id
  WHERE s.wall_of_fame_opt_in = TRUE
    AND s.cohort IN ('founder', 'early')
  ORDER BY s.cohort_assigned_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_wall_of_fame() TO anon, authenticated;
