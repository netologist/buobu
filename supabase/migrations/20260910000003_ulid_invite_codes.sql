-- ============================================================
-- Generate invite/campaign codes as ULIDs.
--
-- A ULID is 26 Crockford-base32 characters: a 48-bit millisecond timestamp
-- followed by 80 bits of randomness. Two properties matter here:
--
--   * It sorts lexicographically by creation time, so codes can be listed and
--     paginated in the order they were issued.
--   * The alphabet omits I, L, O and U, so a code read off a screen or out of an
--     email cannot be misread as a different valid code.
--
-- This replaces the encode(gen_random_bytes(8), 'hex') example in
-- docs/setup/supabase.md, which produced 16 hex characters and did not sort.
--
-- The generator deliberately draws from gen_random_uuid() rather than
-- gen_random_bytes(): no migration in this project creates pgcrypto, and a
-- UUIDv4 already carries 122 random bits, comfortably more than the 80 the
-- format needs. 122 rather than 128 bits of entropy per code is irrelevant at
-- any realistic issuance volume.
--
-- Note on privileges: generate_ulid() takes no arguments, reads no data and
-- returns a fresh random string, so it keeps the default PUBLIC EXECUTE. That is
-- required, not merely tolerated -- a column DEFAULT is evaluated as the role
-- doing the insert, so revoking it would break the default below.
-- ============================================================


-- ------------------------------------------------------------
-- 1. The generator
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_ulid()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path = pg_catalog, public
AS $$
DECLARE
  -- Crockford base32: digits then A-Z minus I, L, O and U.
  alphabet CONSTANT TEXT := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  epoch_ms BIGINT;
  hex      TEXT;
  bits     TEXT := '';
  i        INT;
  value    INT;
  result   TEXT := '';
BEGIN
  epoch_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;

  -- 10 characters: the 48-bit timestamp, most significant first. The top
  -- character only ever carries 3 significant bits, which is why a ULID starts
  -- with a digit or a letter up to 7.
  FOR i IN REVERSE 9..0 LOOP
    value := ((epoch_ms >> (i * 5)) & 31)::INT;
    result := result || substr(alphabet, value + 1, 1);
  END LOOP;

  -- 16 characters: 80 bits of randomness, consumed 5 bits at a time. The UUID is
  -- flattened to a bit string first because it has no hex digit boundary that
  -- lines up with 5-bit groups.
  hex := replace(gen_random_uuid()::text, '-', '');
  FOR i IN 1..32 LOOP
    bits := bits || ('x' || substr(hex, i, 1))::bit(4)::text;
  END LOOP;
  FOR i IN 0..15 LOOP
    value := substr(bits, i * 5 + 1, 5)::bit(5)::int;
    result := result || substr(alphabet, value + 1, 1);
  END LOOP;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.generate_ulid() IS
  'Returns a new 26-character ULID (Crockford base32, time-sortable).';


-- ------------------------------------------------------------
-- 2. New rows get a ULID without the caller supplying one.
-- ------------------------------------------------------------
ALTER TABLE public.campaign_codes
  ALTER COLUMN code SET DEFAULT public.generate_ulid();


-- ------------------------------------------------------------
-- 3. Widen the length check: the inline constraint from the original migration
--    allowed 6-20 characters, which rejects a 26-character ULID.
--
--    The legacy shape stays accepted so existing rows keep validating -- BETA2026
--    and the codes issued before this change are 10 characters, and tightening
--    the constraint to ULIDs alone would fail on them. New codes are ULIDs
--    because the default generates them.
-- ------------------------------------------------------------
DO $$
DECLARE
  existing TEXT;
BEGIN
  SELECT c.conname INTO existing
  FROM pg_constraint c
  WHERE c.conrelid = 'public.campaign_codes'::regclass
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%A-Z0-9%'
  LIMIT 1;

  IF existing IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.campaign_codes DROP CONSTRAINT %I', existing);
  END IF;
END $$;

ALTER TABLE public.campaign_codes
  DROP CONSTRAINT IF EXISTS campaign_codes_code_check;

ALTER TABLE public.campaign_codes
  ADD CONSTRAINT campaign_codes_code_check
  CHECK (code ~ '^[0-9A-HJKMNP-TV-Z]{26}$' OR code ~ '^[A-Z0-9]{6,20}$');
