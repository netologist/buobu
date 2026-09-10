-- ============================================================
-- Deactivate every invite/campaign code that an earlier migration
-- seeded into the repository.
--
-- Why
--   Two migrations shipped literal codes, and one of them generated 100 codes
--   with a derivation that is itself in the repository:
--
--     INSERT ... SELECT UPPER(SUBSTRING(MD5(('INVITE-' || gs)::TEXT), 1, 10))
--     FROM generate_series(1, 100) AS gs;
--
--   Anyone who reads the migrations can recompute all 100, and 'BETA2026'
--   granted 500 uses. Combined with the anon-callable validate RPC, they were
--   also enumerable. A code that is published is not a credential.
--
--   The seeds have been removed from those migrations, so a fresh deployment no
--   longer creates them. This migration cleans up databases that already ran
--   them -- where the codes are live right now.
--
-- Effect
--   Codes stop working immediately. Anyone mid-onboarding must be issued a new
--   one. Create them out of band (see docs/setup/supabase.md):
--
--     INSERT INTO public.campaign_codes (campaign_type, max_uses, expires_at)
--     VALUES ('invite', 1, NOW() + INTERVAL '30 days');   -- code defaults to a ULID
--
-- Idempotent: safe to run repeatedly. Each statement derives the seeded set
-- with a CTE rather than a temporary table, so it behaves the same whether the
-- file is run inside a transaction or statement by statement.
-- ============================================================


-- ------------------------------------------------------------
-- 1. campaign_codes -- deactivate, keeping usage history intact.
-- ------------------------------------------------------------
WITH seeded(code) AS (
  SELECT UPPER(SUBSTRING(MD5(('INVITE-' || gs)::TEXT), 1, 10))
  FROM generate_series(1, 100) AS gs
)
UPDATE public.campaign_codes
SET is_active = false
WHERE is_active
  AND (
    code IN ('BETA2026', 'EARLY100', 'PROMO50')
    OR code IN (SELECT code FROM seeded)
  );


-- ------------------------------------------------------------
-- 2. invite_codes -- the older table campaign_codes replaced. Nothing in the
--    application reads it any more, and it has no is_active column, so unused
--    seeded rows are deleted. Rows that were actually consumed are left alone so
--    the audit trail survives; they are already spent.
-- ------------------------------------------------------------
WITH seeded(code) AS (
  SELECT UPPER(SUBSTRING(MD5(('INVITE-' || gs)::TEXT), 1, 10))
  FROM generate_series(1, 100) AS gs
)
DELETE FROM public.invite_codes
WHERE used_by IS NULL
  AND code IN (SELECT code FROM seeded);
