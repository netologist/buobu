-- ============================================================
-- Security fix: revoke PUBLIC EXECUTE on privileged RPCs,
-- and bind the campaign consume/benefit RPCs to auth.uid().
--
-- Problem
--   PostgreSQL grants EXECUTE on every newly created function to
--   PUBLIC. `GRANT ... TO service_role` is additive and does NOT
--   remove that default, and a comment saying "intentionally not
--   granted to anon/authenticated" restricts nothing. The
--   publishable (anon) key ships inside the browser bundle by
--   design, so every such function is callable by anyone on the
--   internet with no account:
--
--     * set_billing_enabled(BOOLEAN)
--         one anonymous POST switched the global paywall off by
--         setting app_config.billing_enabled = false.
--
--     * apply_campaign_benefit(TEXT, UUID)
--         trusted a caller-supplied user id, never verified that
--         the caller had consumed the code, and recomputed
--         trial_end from NOW() on every call -- so it granted
--         permanent, replayable Plus to any account.
--
--     * get_my_referral_info(UUID)
--     * use_referral_code(TEXT, UUID)
--     * regenerate_referral_code(UUID)
--         server-side overloads added for the referral Worker via
--         service_role. Because the GRANT was additive, anon and
--         authenticated kept EXECUTE, so anyone could read another
--         user's referral data, forge referrals against a victim,
--         or rotate a victim's code.
--
--     * claim_cohort_slot(TEXT)
--         no authorisation check and no privilege statement, so it
--         inherited the PUBLIC grant. 100 anonymous calls for
--         'founder' and 400 for 'early' exhaust both counters --
--         after which the webhook's claim fails on every genuine
--         first paid invoice and paying customers silently lose the
--         cohort price, with no release path in the product.
--
--     * consume_campaign_code(TEXT, TEXT, UUID)
--         granted to anon and trusted a caller-supplied user id, so
--         anyone could attribute a code use to any user -- burning a
--         victim's one-shot code and permanently blocking it for
--         them, and inflating current_uses to exhaust the campaign.
--
-- Scope
--   Additive and idempotent. It fixes databases where the earlier
--   migrations have already been applied, and it is a no-op on a
--   database that never had the vulnerable grants.
--
-- Note on the root cause
--   ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE ON FUNCTIONS FROM
--   PUBLIC would fix this class permanently, but it would silently
--   break every function that relies on the current default while
--   having no explicit grant. That is a separate, deliberate change.
-- ============================================================


-- ------------------------------------------------------------
-- 1. set_billing_enabled: service_role only
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.set_billing_enabled(BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_billing_enabled(BOOLEAN)
  TO service_role;


-- ------------------------------------------------------------
-- 2. apply_campaign_benefit: bind to auth.uid(), require that the
--    caller actually consumed the code, and apply at most once.
--
--    The (TEXT, UUID) signature is dropped rather than redefined:
--    keeping it would leave the vulnerable entry point reachable.
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.apply_campaign_benefit(TEXT, UUID);

CREATE OR REPLACE FUNCTION public.apply_campaign_benefit(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid                  UUID := auth.uid();
  v_benefit              JSONB;
  v_grant_days           INT;
  v_trial_end            TIMESTAMPTZ;
  v_stripe_promo_code_id TEXT;
  v_applied              BOOLEAN := FALSE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- The caller must have consumed this code. Joining campaign_code_usages
  -- both fetches the benefit and enforces the requirement: a code the caller
  -- never consumed leaves v_benefit NULL and grants nothing. There is no way
  -- to name another user here -- the row is selected by auth.uid().
  SELECT cc.benefit, cc.stripe_promotion_code_id
  INTO   v_benefit, v_stripe_promo_code_id
  FROM   public.campaign_codes cc
  JOIN   public.campaign_code_usages ccu
         ON ccu.campaign_code_id = cc.id
  WHERE  cc.code = upper(trim(p_code))
    AND  ccu.user_id = v_uid;

  IF v_benefit IS NULL THEN
    -- Not found, or the caller never consumed it: not an error.
    RETURN '{}'::jsonb;
  END IF;

  IF (v_benefit ->> 'grant_plus_until_days') ~ '^[0-9]+$' THEN
    v_grant_days := (v_benefit ->> 'grant_plus_until_days')::INT;
  END IF;

  IF v_grant_days IS NOT NULL AND v_grant_days > 0 THEN
    v_trial_end := NOW() + (v_grant_days || ' days')::INTERVAL;

    -- Single-shot. The WHERE clause is evaluated against the EXISTING row,
    -- so this only writes when the row is still free and not attached to a
    -- Stripe subscription. A second call finds plan='plus' and changes
    -- nothing -- trial_end is never extended, so the grant cannot be replayed
    -- into a permanent one. A real paid subscription is never clobbered.
    INSERT INTO public.subscriptions (user_id, plan, status, trial_end)
    VALUES (v_uid, 'plus', 'trialing', v_trial_end)
    ON CONFLICT (user_id) DO UPDATE
      SET plan       = 'plus',
          status     = 'trialing',
          trial_end  = v_trial_end,
          updated_at = NOW()
      WHERE public.subscriptions.stripe_subscription_id IS NULL
        AND public.subscriptions.plan = 'free';

    v_applied := FOUND;
  END IF;

  -- Return the stripe_promotion_code_id so the client can stash it locally.
  RETURN jsonb_build_object(
    'grant_applied',            v_applied,
    'trial_end',                CASE WHEN v_applied THEN v_trial_end END,
    'stripe_promotion_code_id', v_stripe_promo_code_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_campaign_benefit(TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_campaign_benefit(TEXT)
  TO authenticated, service_role;


-- ------------------------------------------------------------
-- 3. Referral Worker overloads: service_role only
--
--    The zero-argument variants in 20260429000000 stay granted to
--    authenticated -- they resolve auth.uid() internally and are the
--    browser-facing entry points. These overloads take an explicit
--    user id and exist only for the Worker, which calls them with the
--    service_role key.
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.get_my_referral_info(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_referral_info(UUID)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.use_referral_code(TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.use_referral_code(TEXT, UUID)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.regenerate_referral_code(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_referral_code(UUID)
  TO service_role;


-- ------------------------------------------------------------
-- 4. claim_cohort_slot: service_role only
--
--    Called from exactly one place -- the Stripe webhook, via
--    supabaseAdmin -- so no browser-facing caller needs it.
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.claim_cohort_slot(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_cohort_slot(TEXT)
  TO service_role;


-- ------------------------------------------------------------
-- 5. consume_campaign_code: bind to auth.uid()
--
--    The (TEXT, TEXT, UUID) signature is dropped rather than
--    redefined -- keeping it would leave the forgeable entry point
--    reachable. The caller can no longer name a user, so a code use
--    can only ever be attributed to the caller.
--
--    Note: this runs right after signUp(), so it depends on the
--    session being established by then -- exactly the assumption the
--    referral path (use_referral_code) already makes. Both raise
--    'Not authenticated' if it is not, which surfaces a
--    misconfigured email-confirmation setting instead of silently
--    dropping the invite gate.
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.consume_campaign_code(TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.consume_campaign_code(
  p_code TEXT,
  p_campaign_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_code_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_code_id FROM public.campaign_codes
  WHERE code = upper(trim(p_code))
    AND campaign_type = p_campaign_type
    AND is_active = true
    AND expires_at > NOW()
    AND current_uses < max_uses
  FOR UPDATE;

  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'Invalid, expired, or fully used campaign code';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.campaign_code_usages
    WHERE campaign_code_id = v_code_id AND user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'You have already used this campaign code';
  END IF;

  UPDATE public.campaign_codes
  SET current_uses = current_uses + 1
  WHERE id = v_code_id;

  INSERT INTO public.campaign_code_usages (campaign_code_id, user_id)
  VALUES (v_code_id, v_uid);
END;
$$;

-- validate_campaign_code stays anon-callable: the register form checks a code
-- before the account exists, and it only reads (it returns a boolean). It takes
-- an optional p_user_id, so it can still report whether a given user has already
-- used a code -- a narrow oracle worth tightening separately, not a write path.
REVOKE EXECUTE ON FUNCTION public.consume_campaign_code(TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_campaign_code(TEXT, TEXT)
  TO authenticated, service_role;
