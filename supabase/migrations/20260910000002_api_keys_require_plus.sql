-- ============================================================
-- MCP API keys require a Plus subscription.
--
-- Why
--   The MCP panel is hidden from free users in the app, but that was the only
--   gate. The RLS policy on api_keys was FOR ALL ... USING (auth.uid() = user_id),
--   so any authenticated account could insert its own key directly through
--   PostgREST, and the MCP Worker authorised on key hash + scopes alone with no
--   entitlement lookup. A free user could therefore mint a key and use MCP
--   without paying. (The Worker half is enforced in workers/mcp/index.ts.)
--
-- Note on policy shape
--   Permissive policies combine with OR, so adding an INSERT policy alongside
--   the existing FOR ALL policy would not have restricted anything. The FOR ALL
--   policy is dropped and replaced by one policy per command.
-- ============================================================

DROP POLICY IF EXISTS "users manage own keys" ON public.api_keys;

CREATE POLICY "users read own keys" ON public.api_keys
  FOR SELECT USING (auth.uid() = user_id);

-- The gate. entitlements is readable here because it is a security_invoker view
-- over the caller's own subscriptions row, which subs_read_own already exposes.
CREATE POLICY "users insert own keys when plus" ON public.api_keys
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.entitlements e
      WHERE e.user_id = auth.uid()
        AND e.is_plus
    )
  );

CREATE POLICY "users update own keys" ON public.api_keys
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own keys" ON public.api_keys
  FOR DELETE USING (auth.uid() = user_id);
