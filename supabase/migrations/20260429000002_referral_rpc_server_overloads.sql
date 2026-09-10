-- ============================================================
-- Referral RPC: add p_user_id overloads for server-side callers
--
-- Context: The referral Cloudflare Worker verifies the user's
-- JWT via supabaseAdmin.auth.getUser() and then calls these RPCs
-- using the service_role key. In that context auth.uid() returns
-- NULL, so we add overloads that accept an explicit user ID.
--
-- The original zero-argument signatures are preserved for
-- authenticated browser clients that call via the anon key.
-- ============================================================

-- ------------------------------------------------------------
-- 1. get_my_referral_info(p_user_id UUID)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_referral_info(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      UUID := p_user_id;
  v_row      public.referral_codes%ROWTYPE;
  v_uses     JSONB;
  v_count    INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row
  FROM public.referral_codes
  WHERE user_id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_code');
  END IF;

  SELECT COUNT(*)::INT INTO v_count
  FROM public.referral_code_uses
  WHERE referrer_user_id = v_uid;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'ordinal',  rn,
        'used_at',  used_at
      )
      ORDER BY rn
    ),
    '[]'::JSONB
  ) INTO v_uses
  FROM (
    SELECT
      ROW_NUMBER() OVER (ORDER BY used_at ASC) AS rn,
      used_at
    FROM public.referral_code_uses
    WHERE referrer_user_id = v_uid
  ) sub;

  RETURN jsonb_build_object(
    'ok',         true,
    'code',       v_row.code,
    'max_uses',   v_row.max_uses,
    'uses_count', v_count,
    'expires_at', v_row.expires_at,
    'expired',    (v_row.expires_at < NOW()),
    'uses',       v_uses
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_referral_info(UUID) TO service_role;

-- ------------------------------------------------------------
-- 2. use_referral_code(p_code TEXT, p_user_id UUID)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.use_referral_code(p_code TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         UUID := p_user_id;
  v_referrer_id UUID;
  v_max_uses    INT;
  v_uses_count  INT;
  v_expires_at  TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  p_code := upper(trim(p_code));

  SELECT user_id, max_uses, expires_at
  INTO v_referrer_id, v_max_uses, v_expires_at
  FROM public.referral_codes
  WHERE code = p_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF v_expires_at < NOW() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  IF v_referrer_id = v_uid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'self');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.referral_code_uses WHERE referee_user_id = v_uid
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_used');
  END IF;

  SELECT COUNT(*)::INT INTO v_uses_count
  FROM public.referral_code_uses
  WHERE referrer_user_id = v_referrer_id;

  IF v_uses_count >= v_max_uses THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'exhausted');
  END IF;

  INSERT INTO public.referral_code_uses (referrer_user_id, referee_user_id)
  VALUES (v_referrer_id, v_uid);

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.use_referral_code(TEXT, UUID) TO service_role;

-- ------------------------------------------------------------
-- 3. regenerate_referral_code(p_user_id UUID)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.regenerate_referral_code(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      UUID := p_user_id;
  v_expires  TIMESTAMPTZ;
  v_new_code TEXT;
  v_attempts INT := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT expires_at INTO v_expires
  FROM public.referral_codes
  WHERE user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No referral code found';
  END IF;

  IF v_expires >= NOW() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_expired');
  END IF;

  LOOP
    v_new_code := public._generate_referral_code_string();
    IF NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = v_new_code) THEN
      EXIT;
    END IF;
    v_attempts := v_attempts + 1;
    IF v_attempts > 20 THEN
      RAISE EXCEPTION 'referral: could not generate unique code after 20 attempts';
    END IF;
  END LOOP;

  UPDATE public.referral_codes
  SET
    code       = v_new_code,
    created_at = NOW(),
    expires_at = NOW() + INTERVAL '3 months'
  WHERE user_id = v_uid;

  RETURN jsonb_build_object('ok', true, 'code', v_new_code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.regenerate_referral_code(UUID) TO service_role;
