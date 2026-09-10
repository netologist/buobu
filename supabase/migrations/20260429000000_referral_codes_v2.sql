-- Migration: referral_codes_v2
-- Extends the existing referral_codes table with per-code limits and expiry,
-- adds a referral_code_uses audit table, an auto-generation trigger on signup,
-- and RPC functions for the application layer.
--
-- Decisions (see docs/adr/011-referral-invite-code-system.md):
--   • 1 code per user (auto-generated), max 5 uses, expires 3 months from generation
--   • All registered users get a code (not gated by Plus)
--   • v1 ships visibility only — reward hook columns are already present

-- ------------------------------------------------------------
-- 1. Extend referral_codes
-- ------------------------------------------------------------
ALTER TABLE public.referral_codes
  ADD COLUMN IF NOT EXISTS max_uses   INT         NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '3 months';

-- Back-fill expires_at for any rows that were inserted before this migration.
UPDATE public.referral_codes
SET expires_at = created_at + INTERVAL '3 months'
WHERE expires_at = NOW() + INTERVAL '3 months'; -- only rows just defaulted

-- ------------------------------------------------------------
-- 2. referral_code_uses — audit table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_code_uses (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_user_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A single user can only be a referee once across all referrers.
  CONSTRAINT referral_code_uses_referee_unique UNIQUE (referee_user_id),
  -- A referrer+referee pair can only exist once (defensive, covered by above).
  CONSTRAINT referral_code_uses_pair_unique    UNIQUE (referrer_user_id, referee_user_id)
);

ALTER TABLE public.referral_code_uses ENABLE ROW LEVEL SECURITY;

-- Referrers can read their own use rows; referees can read the row that mentions them.
DROP POLICY IF EXISTS referral_code_uses_read_own ON public.referral_code_uses;
CREATE POLICY referral_code_uses_read_own ON public.referral_code_uses
  FOR SELECT
  USING (auth.uid() = referrer_user_id OR auth.uid() = referee_user_id);

-- ------------------------------------------------------------
-- 3. Helper: generate a unique 8-char [A-Z0-9] code
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._generate_referral_code_string()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alphabet TEXT    := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I confusion
  v_code     TEXT    := '';
  v_len      INT     := 8;
  i          INT;
BEGIN
  FOR i IN 1..v_len LOOP
    v_code := v_code || substr(v_alphabet, (floor(random() * length(v_alphabet)) + 1)::INT, 1);
  END LOOP;
  RETURN v_code;
END;
$$;

-- ------------------------------------------------------------
-- 4. Trigger function: auto-generate referral code on user signup
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_user_created_generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code     TEXT;
  v_attempts INT := 0;
BEGIN
  LOOP
    v_code := public._generate_referral_code_string();

    -- Insert with a conflict guard; retry on collision
    BEGIN
      INSERT INTO public.referral_codes (user_id, code)
      VALUES (NEW.id, v_code);
      EXIT; -- success
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts > 20 THEN
        RAISE EXCEPTION 'referral: could not generate unique code after 20 attempts';
      END IF;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Drop and recreate to pick up any body changes
DROP TRIGGER IF EXISTS trg_user_created_referral_code ON auth.users;
CREATE TRIGGER trg_user_created_referral_code
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.on_user_created_generate_referral_code();

-- Back-fill codes for existing users who don't have one yet
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN
    SELECT id FROM auth.users
    WHERE id NOT IN (SELECT user_id FROM public.referral_codes)
  LOOP
    BEGIN
      INSERT INTO public.referral_codes (user_id, code, expires_at)
      VALUES (
        u.id,
        public._generate_referral_code_string(),
        NOW() + INTERVAL '3 months'
      );
    EXCEPTION WHEN unique_violation THEN
      -- Retry once more (extremely unlikely collision)
      INSERT INTO public.referral_codes (user_id, code, expires_at)
      VALUES (
        u.id,
        public._generate_referral_code_string(),
        NOW() + INTERVAL '3 months'
      );
    END;
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- 5. RPC: get_my_referral_info
--    Returns the caller's code, limits, expiry, and anonymised use list.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_referral_info()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      UUID := auth.uid();
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
    -- Should not happen after back-fill, but be defensive
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

GRANT EXECUTE ON FUNCTION public.get_my_referral_info() TO authenticated;

-- ------------------------------------------------------------
-- 6. RPC: use_referral_code(p_code TEXT)
--    Called when a user enters a referral code. Validates and records use.
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

  -- Normalise input
  p_code := upper(trim(p_code));

  -- Look up referrer
  SELECT user_id, max_uses, expires_at
  INTO v_referrer_id, v_max_uses, v_expires_at
  FROM public.referral_codes
  WHERE code = p_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- Must not be expired
  IF v_expires_at < NOW() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  -- Must not be self-referral
  IF v_referrer_id = v_uid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'self');
  END IF;

  -- Must not have already used any referral code
  IF EXISTS (
    SELECT 1 FROM public.referral_code_uses WHERE referee_user_id = v_uid
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_used');
  END IF;

  -- Check remaining uses
  SELECT COUNT(*)::INT INTO v_uses_count
  FROM public.referral_code_uses
  WHERE referrer_user_id = v_referrer_id;

  IF v_uses_count >= v_max_uses THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'exhausted');
  END IF;

  -- Record use
  INSERT INTO public.referral_code_uses (referrer_user_id, referee_user_id)
  VALUES (v_referrer_id, v_uid);

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.use_referral_code(TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 7. RPC: regenerate_referral_code
--    Allowed only after current code has expired.
--    Creates a new code row (deletes old), resets the 3-month window.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.regenerate_referral_code()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      UUID := auth.uid();
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

  -- Generate new unique code
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

  -- Update in place — keep months_earned and other history fields
  UPDATE public.referral_codes
  SET
    code       = v_new_code,
    created_at = NOW(),
    expires_at = NOW() + INTERVAL '3 months'
  WHERE user_id = v_uid;

  RETURN jsonb_build_object('ok', true, 'code', v_new_code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.regenerate_referral_code() TO authenticated;
