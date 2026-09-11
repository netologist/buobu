-- ============================================================
-- Security hardening v2
--
-- Addresses open database findings prior to open-sourcing:
--   - M-07: Drop broad public SELECT policy on storage.objects (avatars bucket)
--           to prevent listing all user UUIDs.
--   - I-01: Attach enforce_sync_access trigger to public.timeblocks and
--           optimize timeblocks_user_isolation RLS policy with stable init-plan.
--   - L-07: Pin search_path on SECURITY DEFINER triggers:
--           restrict_google_to_existing_users, cleanup_google_identity_on_email_change.
--   - L-08: Revoke SELECT (key_hash) on public.api_keys from authenticated.
--   - L-09: Restrict direct SELECT on public.referral_code_uses to prevent
--           counterparty UUID disclosure (reads go through get_my_referral_info RPC).
--   - L-10: Add FOR UPDATE lock to use_referral_code to prevent concurrent
--           overuse race condition.
--   - M-01: Normalize p_code in validate_campaign_code and remove unused
--           p_user_id oracle parameter.
-- ============================================================

-- ------------------------------------------------------------
-- 1. M-07: Storage Avatars Bucket — Drop Public Listing Policy
-- ------------------------------------------------------------
-- Public downloads still succeed via /storage/v1/object/public/avatars/...
-- because the bucket has public = true. Dropping this policy prevents
-- unauthenticated callers from listing /storage/v1/object/list/avatars
-- to enumerate user account UUIDs.
DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;


-- ------------------------------------------------------------
-- 2. I-01: timeblocks — enforce_sync_access trigger & init-plan
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS enforce_sync_access ON public.timeblocks;
CREATE TRIGGER enforce_sync_access
  BEFORE INSERT OR UPDATE ON public.timeblocks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plus_only_sync();

DROP POLICY IF EXISTS timeblocks_user_isolation ON public.timeblocks;
CREATE POLICY timeblocks_user_isolation ON public.timeblocks
  FOR ALL
  USING      ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);


-- ------------------------------------------------------------
-- 3. L-07: Pin search_path on SECURITY DEFINER trigger functions
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restrict_google_to_existing_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NEW.raw_app_meta_data->>'provider' = 'google' THEN
    IF NOT EXISTS (
      SELECT 1 FROM auth.identities
      WHERE provider = 'google'
        AND identity_data->>'email' = NEW.email
    ) AND NOT EXISTS (
      SELECT 1 FROM auth.users
      WHERE email = NEW.email
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Google sign-in is only available for existing accounts. Please register with an invite code first.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_google_identity_on_email_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    DELETE FROM auth.identities
    WHERE user_id = NEW.id
      AND provider = 'google'
      AND identity_data->>'email' = OLD.email;
  END IF;
  RETURN NEW;
END;
$$;


-- ------------------------------------------------------------
-- 4. L-08: Revoke SELECT on api_keys.key_hash from authenticated
-- ------------------------------------------------------------
REVOKE SELECT (key_hash) ON public.api_keys FROM authenticated;


-- ------------------------------------------------------------
-- 5. L-09: Restrict direct SELECT on referral_code_uses
-- ------------------------------------------------------------
-- Client reads stats through get_my_referral_info() which sanitizes
-- data and never exposes counterparty UUIDs. Direct SELECT on the
-- audit table is blocked.
DROP POLICY IF EXISTS referral_code_uses_read_own ON public.referral_code_uses;
CREATE POLICY referral_code_uses_admin_only ON public.referral_code_uses
  FOR ALL USING (false);


-- ------------------------------------------------------------
-- 6. L-10: Lock code row FOR UPDATE in use_referral_code
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.use_referral_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         UUID := auth.uid();
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
  WHERE code = p_code
  FOR UPDATE;

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
  WHERE code = p_code
  FOR UPDATE;

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

REVOKE EXECUTE ON FUNCTION public.use_referral_code(TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.use_referral_code(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.use_referral_code(TEXT) TO authenticated, service_role;


-- ------------------------------------------------------------
-- 7. M-01: validate_campaign_code normalization & drop p_user_id
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.validate_campaign_code(TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.validate_campaign_code(
  p_code TEXT,
  p_campaign_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.campaign_codes cc
    WHERE cc.code = upper(trim(p_code))
      AND cc.campaign_type = p_campaign_type
      AND cc.is_active = true
      AND cc.expires_at > NOW()
      AND cc.current_uses < cc.max_uses
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_campaign_code(TEXT, TEXT) TO anon, authenticated, service_role;
