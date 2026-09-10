-- Migration: validate_referral_code_anon
-- Adds a lightweight pre-signup validation function for per-user referral codes.
-- This is the missing piece: validate_campaign_code only looks in campaign_codes;
-- user referral codes live in the separate referral_codes table.
-- Granted to anon so it can be called before the new user is signed up.

CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_uses   INT;
  v_uses_count INT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  p_code := upper(trim(p_code));

  SELECT max_uses, expires_at
  INTO v_max_uses, v_expires_at
  FROM public.referral_codes
  WHERE code = p_code;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_expires_at < NOW() THEN
    RETURN false;
  END IF;

  SELECT COUNT(*)::INT INTO v_uses_count
  FROM public.referral_code_uses
  WHERE referrer_user_id = (
    SELECT user_id FROM public.referral_codes WHERE code = p_code
  );

  RETURN v_uses_count < v_max_uses;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_referral_code(TEXT) TO anon, authenticated;
