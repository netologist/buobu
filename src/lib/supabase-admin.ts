/**
 * Server-side Supabase admin client (service_role).
 * Use ONLY in server-side route handlers and webhook processors.
 * Never import this in client components — it bypasses RLS.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { LOCAL_MODE } from '@/lib/feature-flags';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Cloud Mode needs both values. Checked here rather than left to the library,
 * whose `supabaseUrl is required.` says nothing about the fix.
 */
function adminCredentials(): [string, string] {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Cloud Mode requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. ' +
        'Set both, or set NEXT_PUBLIC_LOCAL_MODE=true to run in Local Mode.',
    );
  }

  return [supabaseUrl, supabaseServiceKey];
}

/**
 * Local Mode has no Supabase project to talk to, so there is nothing to
 * construct. Any property access or call throws an error naming the access
 * path: a route that should have been gated identifies itself.
 *
 * It has to exist rather than throw here, because `next build` evaluates every
 * route module while collecting page data — `output: "export"` included — and a
 * module-scope throw makes a Local Mode build fail on routes the exported
 * artifact cannot serve anyway. Same reasoning as `src/lib/supabase.ts`.
 */
function localModeStub(path = 'supabaseAdmin'): unknown {
  const fail = (): never => {
    throw new Error(`Supabase admin is not available in Local Mode (accessed ${path})`);
  };

  return new Proxy(fail, {
    get: (_target, prop) => localModeStub(`${path}.${String(prop)}`),
    apply: () => fail(),
  });
}

export const supabaseAdmin: SupabaseClient = LOCAL_MODE
  ? (localModeStub() as SupabaseClient)
  : createClient(...adminCredentials(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
