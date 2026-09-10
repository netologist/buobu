-- Drop old invite system
DROP FUNCTION IF EXISTS public.consume_invite_code(TEXT, UUID);
DROP FUNCTION IF EXISTS public.validate_invite_code(TEXT);
DROP TABLE IF EXISTS public.invite_codes;

-- Campaign codes (multi-use, limited by count and expiry)
CREATE TABLE public.campaign_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL CHECK (code ~ '^[A-Z0-9]{6,20}$'),
  campaign_type TEXT NOT NULL DEFAULT 'invite' CHECK (campaign_type IN ('invite', 'voucher', 'promo', 'referral')),
  max_uses INT NOT NULL CHECK (max_uses > 0),
  current_uses INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Track which user used which code
CREATE TABLE public.campaign_code_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_code_id UUID NOT NULL REFERENCES public.campaign_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_code_id, user_id)
);

ALTER TABLE public.campaign_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_code_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_only" ON public.campaign_codes
  FOR ALL USING (false);

CREATE POLICY "admin_only" ON public.campaign_code_usages
  FOR ALL USING (false);

CREATE INDEX idx_campaign_codes_code ON public.campaign_codes(code);
CREATE INDEX idx_campaign_codes_type ON public.campaign_codes(campaign_type);
CREATE INDEX idx_campaign_code_usages_code ON public.campaign_code_usages(campaign_code_id);
CREATE INDEX idx_campaign_code_usages_user ON public.campaign_code_usages(user_id);

-- Validate: code exists, type matches, active, not expired, has remaining uses
CREATE OR REPLACE FUNCTION public.validate_campaign_code(
  p_code TEXT,
  p_campaign_type TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.campaign_codes cc
    WHERE cc.code = p_code
      AND cc.campaign_type = p_campaign_type
      AND cc.is_active = true
      AND cc.expires_at > NOW()
      AND cc.current_uses < cc.max_uses
      AND (
        p_user_id IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.campaign_code_usages ccu
          WHERE ccu.campaign_code_id = cc.id AND ccu.user_id = p_user_id
        )
      )
  );
END;
$$;

-- Consume: increment counter and record usage
CREATE OR REPLACE FUNCTION public.consume_campaign_code(
  p_code TEXT,
  p_campaign_type TEXT,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_id UUID;
BEGIN
  SELECT id INTO v_code_id FROM public.campaign_codes
  WHERE code = p_code
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
    WHERE campaign_code_id = v_code_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'You have already used this campaign code';
  END IF;

  UPDATE public.campaign_codes
  SET current_uses = current_uses + 1
  WHERE id = v_code_id;

  INSERT INTO public.campaign_code_usages (campaign_code_id, user_id)
  VALUES (v_code_id, p_user_id);
END;
$$;

REVOKE ALL ON TABLE public.campaign_codes FROM anon, authenticated;
REVOKE ALL ON TABLE public.campaign_code_usages FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_campaign_code(TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_campaign_code(TEXT, TEXT, UUID) TO anon, authenticated;

-- Example: Invite campaign with 500 uses, expires in 1 month
INSERT INTO public.campaign_codes (code, campaign_type, max_uses, expires_at)
VALUES ('BETA2026', 'invite', 500, NOW() + INTERVAL '1 month');

-- Example: Voucher campaign for early adopters
INSERT INTO public.campaign_codes (code, campaign_type, max_uses, expires_at)
VALUES ('EARLY100', 'voucher', 100, NOW() + INTERVAL '2 weeks');

-- Example: Promo code for marketing campaign
INSERT INTO public.campaign_codes (code, campaign_type, max_uses, expires_at)
VALUES ('PROMO50', 'promo', 50, NOW() + INTERVAL '3 months');

-- Example: Generate 100 invite codes (idempotent)
INSERT INTO public.campaign_codes (code, campaign_type, max_uses, expires_at)
SELECT UPPER(SUBSTRING(MD5(('INVITE-' || gs)::TEXT), 1, 10)), 'invite', 1, NOW() + INTERVAL '1 year'
FROM generate_series(1, 100) AS gs
ON CONFLICT (code) DO NOTHING;
