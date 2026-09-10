-- Migration: app_config — single-row application config table
--
-- Problem:
--   enforce_plus_only_sync() reads from public.entitlements, which derives
--   has_sync_access from the subscriptions table.  When NEXT_PUBLIC_BILLING_ENABLED
--   is set to false in the app layer, all users are granted Plus access client-side,
--   but the DB trigger still sees plan='free' rows and raises SYNC_ACCESS_REQUIRED.
--   PostgreSQL triggers cannot read Next.js environment variables, so we need a
--   DB-level flag that mirrors the billing toggle.
--
-- Solution:
--   1. Create public.app_config with a billing_enabled column (default true).
--   2. Update enforce_plus_only_sync() to bypass the check when billing_enabled=false.
--   3. In staging/dev: UPDATE public.app_config SET billing_enabled = false.
--      In production:  billing_enabled stays true (the default).
--
-- This makes the DB instance itself the single source of truth for the billing
-- flag, which is the only approach that works reliably inside a trigger.

-- ------------------------------------------------------------
-- 1. app_config table (single row, no PK — enforced by constraint)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_config (
  id              BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),  -- enforces single row
  billing_enabled BOOLEAN NOT NULL DEFAULT true
);

-- Insert the default row if it doesn't exist yet.
INSERT INTO public.app_config (billing_enabled)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

-- No authenticated access — service_role only, read via SECURITY DEFINER functions.
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_access" ON public.app_config USING (false);

-- ------------------------------------------------------------
-- 2. Update enforce_plus_only_sync to respect billing_enabled
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_plus_only_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing_enabled BOOLEAN;
  v_has_sync_access BOOLEAN;
BEGIN
  -- Fast-path: if billing is disabled at the DB level, all writes are allowed.
  SELECT billing_enabled INTO v_billing_enabled FROM public.app_config;
  IF NOT COALESCE(v_billing_enabled, true) THEN
    RETURN NEW;
  END IF;

  SELECT has_sync_access
  INTO   v_has_sync_access
  FROM   public.entitlements
  WHERE  user_id = NEW.user_id;

  IF v_has_sync_access IS NULL OR NOT v_has_sync_access THEN
    RAISE EXCEPTION 'SYNC_ACCESS_REQUIRED';
  END IF;

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 3. Helper RPC: set_billing_enabled(p_enabled BOOLEAN)
--    Called by deployment scripts / CI to toggle billing.
--    service_role only (not granted to authenticated).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_billing_enabled(p_enabled BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.app_config SET billing_enabled = p_enabled;
END;
$$;

-- Intentionally NOT granting this to anon/authenticated.
-- Only callable via service_role or direct SQL.
