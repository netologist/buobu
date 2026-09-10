import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { LOCAL_MODE } from '@/lib/feature-flags';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseApiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

/**
 * Cloud Mode needs both values. Checked here rather than left to the library,
 * whose `supabaseUrl is required.` says nothing about the fix — and an unset
 * NEXT_PUBLIC_LOCAL_MODE, which lands a local run in Cloud Mode, is the likeliest
 * reason the values are missing at all.
 */
function cloudCredentials(): [string, string] {
  if (!supabaseUrl || !supabaseApiKey) {
    throw new Error(
      'Cloud Mode requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
        'Set both, or set NEXT_PUBLIC_LOCAL_MODE=true to run in Local Mode.'
    );
  }

  return [supabaseUrl, supabaseApiKey];
}

/**
 * Local Mode has no Supabase project to talk to, so there is nothing to
 * construct. Any property access or call throws an error naming the access
 * path: a gate we forgot identifies itself instead of surfacing as an
 * inscrutable network failure, and it fails loudly rather than silently
 * returning empty data.
 */
function localModeStub(path = 'supabase'): unknown {
  const fail = (): never => {
    throw new Error(`Supabase is not available in Local Mode (accessed ${path})`);
  };

  return new Proxy(fail, {
    get: (_target, prop) => localModeStub(`${path}.${String(prop)}`),
    apply: () => fail(),
  });
}

export const supabase: SupabaseClient = LOCAL_MODE
  ? (localModeStub() as SupabaseClient)
  : createClient(...cloudCredentials(), {
      auth: {
        flowType: 'pkce',        // SEC-02: PKCE instead of implicit
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });

// Type aliases kept for backward compatibility across the codebase
export type SupabaseUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type?: string;
  user: SupabaseUser;
};
