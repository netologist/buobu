-- ============================================================
-- M1/M6: campaign_codes extensions + benefit application RPC
-- ============================================================

-- ------------------------------------------------------------
-- 1. Add benefit columns to campaign_codes
-- ------------------------------------------------------------
ALTER TABLE public.campaign_codes
  ADD COLUMN IF NOT EXISTS stripe_promotion_code_id TEXT,
  ADD COLUMN IF NOT EXISTS benefit JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ------------------------------------------------------------
-- 2. Add consumed flag to campaign_code_usages
--    Used for referral one-shot tracking: set to true after
--    the referee's first paid invoice is confirmed by webhook.
-- ------------------------------------------------------------
ALTER TABLE public.campaign_code_usages
  ADD COLUMN IF NOT EXISTS consumed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_campaign_code_usages_consumed
  ON public.campaign_code_usages (campaign_code_id, consumed);

-- ------------------------------------------------------------
-- 3. apply_campaign_benefit RPC (SECURITY DEFINER)
--    Called after consume_campaign_code to apply any
--    grant_plus_until_days benefit without requiring the client
--    to have write access to public.subscriptions.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_campaign_benefit(
  p_code    TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_benefit              JSONB;
  v_grant_days           INT;
  v_trial_end            TIMESTAMPTZ;
  v_stripe_promo_code_id TEXT;
BEGIN
  -- Read the benefit from the code that was already consumed.
  SELECT benefit, stripe_promotion_code_id
  INTO   v_benefit, v_stripe_promo_code_id
  FROM   public.campaign_codes
  WHERE  code = p_code;

  IF v_benefit IS NULL THEN
    -- Code not found or no benefit — not an error.
    RETURN '{}'::jsonb;
  END IF;

  v_grant_days := (v_benefit ->> 'grant_plus_until_days')::INT;

  IF v_grant_days IS NOT NULL AND v_grant_days > 0 THEN
    v_trial_end := NOW() + (v_grant_days || ' days')::INTERVAL;

    -- Upsert subscription row — trigger already created it, but use
    -- ON CONFLICT to be safe.
    INSERT INTO public.subscriptions (user_id, plan, status, trial_end)
    VALUES (p_user_id, 'plus', 'trialing', v_trial_end)
    ON CONFLICT (user_id) DO UPDATE
      SET plan      = 'plus',
          status    = 'trialing',
          trial_end = v_trial_end,
          updated_at = NOW();
  END IF;

  -- Return the stripe_promotion_code_id so the client can stash it locally.
  RETURN jsonb_build_object(
    'grant_applied',            (v_grant_days IS NOT NULL AND v_grant_days > 0),
    'trial_end',                v_trial_end,
    'stripe_promotion_code_id', v_stripe_promo_code_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_campaign_benefit(TEXT, UUID) TO authenticated;
