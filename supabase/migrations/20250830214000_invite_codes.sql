-- Invite code system for closed beta onboarding
-- Creates invite_codes table, strict RLS, and RPC helpers.

CREATE TABLE IF NOT EXISTS public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL CHECK (code ~ '^[A-Z0-9]{10}$'),
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_only" ON public.invite_codes;
CREATE POLICY "admin_only" ON public.invite_codes
  FOR ALL
  USING (false);

CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON public.invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_used_by ON public.invite_codes(used_by);

CREATE OR REPLACE FUNCTION public.validate_invite_code(code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.invite_codes i
    WHERE i.code = validate_invite_code.code
      AND i.used_by IS NULL
  )
  INTO code_exists;

  RETURN code_exists;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_invite_code(code TEXT, uid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.invite_codes
  SET used_by = uid, used_at = NOW()
  WHERE invite_codes.code = consume_invite_code.code
    AND used_by IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or already used invite code';
  END IF;
END;
$$;

REVOKE ALL ON TABLE public.invite_codes FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_invite_code(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_invite_code(TEXT, UUID) TO anon, authenticated;

-- Seed 100 invite codes (idempotent)
INSERT INTO public.invite_codes (code)
SELECT UPPER(SUBSTRING(MD5(('INVITE-' || gs)::TEXT), 1, 10))
FROM generate_series(1, 100) AS gs
ON CONFLICT (code) DO NOTHING;
