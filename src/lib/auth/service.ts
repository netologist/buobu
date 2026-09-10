/**
 * Authentication service for client-side user management
 * Uses Supabase Auth for email/password and OAuth flows.
 */

import { supabase, type SupabaseSession } from '@/lib/supabase';
import { STORAGE_KEYS } from '@/lib/constants';
import { INVITE_CODES_ENABLED, LOCAL_MODE } from '@/lib/feature-flags';

type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'INITIAL_SESSION' | 'SESSION_EXPIRED';
type CachedUser = {
  id: string;
  avatarUrl?: string;
};

// Tracks whether the current sign-out was initiated intentionally by the user.
// Used to distinguish explicit logout from session expiry in onAuthStateChange.
let _intentionalSignOut = false;

export interface User {
  id: string;
  email?: string;
  avatarUrl?: string;
}

/**
 * The single synthetic identity that owns everything in Local Mode. It is not an
 * account: it has no credentials, cannot sign in, and cannot sign out. Its id is
 * the literal "local", which yields the database name "buobu-db-local" — a name
 * a Supabase account id (a UUID) can never collide with.
 */
export const LOCAL_USER: User = { id: 'local' };

function mapUser(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): User {
  return {
    id: user.id,
    email: user.email ?? undefined,
    avatarUrl: typeof user.user_metadata?.avatar_url === 'string'
      ? user.user_metadata.avatar_url
      : undefined,
  };
}

function toCachedUser(user: User): CachedUser {
  return user.avatarUrl ? { id: user.id, avatarUrl: user.avatarUrl } : { id: user.id };
}

function parseCachedUser(userData: string): User | null {
  try {
    const parsed = JSON.parse(userData) as Partial<User> | null;
    if (!parsed || typeof parsed.id !== 'string' || parsed.id.length === 0) {
      return null;
    }

    return {
      id: parsed.id,
      avatarUrl: typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : undefined,
    };
  } catch {
    return null;
  }
}

function setCachedUser(user: User | null): void {
  if (typeof window === 'undefined') return;

  if (!user) {
    localStorage.removeItem(STORAGE_KEYS.USER);
    return;
  }

  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(toCachedUser(user)));
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;

  const userData = localStorage.getItem(STORAGE_KEYS.USER);
  if (!userData) {
    return null;
  }

  const cachedUser = parseCachedUser(userData);
  if (!cachedUser) {
    localStorage.removeItem(STORAGE_KEYS.USER);
    return null;
  }

  const sanitizedCache = JSON.stringify(toCachedUser(cachedUser));
  if (userData !== sanitizedCache) {
    localStorage.setItem(STORAGE_KEYS.USER, sanitizedCache);
  }

  return cachedUser;
}

export function isAuthenticated(): boolean {
  return !!getUser();
}

export function hasPersistedSession(): boolean {
  if (LOCAL_MODE) return false;
  if (typeof window === 'undefined') return false;
  try {
    const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname.split('.')[0];
    return !!localStorage.getItem(STORAGE_KEYS.supabaseAuthToken(ref));
  } catch {
    return false;
  }
}

export async function getSessionUser(): Promise<User | null> {
  if (LOCAL_MODE) {
    // db.ts getUserId() throws without a cached user, so this cache is load-bearing.
    setCachedUser(LOCAL_USER);
    return LOCAL_USER;
  }

  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    setCachedUser(null);
    return null;
  }

  const user = mapUser(data.user);
  setCachedUser(user);
  return user;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: SupabaseSession | null, user: User | null) => void
): { unsubscribe: () => void } {
  // Local Mode has no auth state to change: the Local User is always present.
  if (LOCAL_MODE) {
    return { unsubscribe: () => {} };
  }

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    let mappedEvent: AuthChangeEvent = event as AuthChangeEvent;

    if (event === 'SIGNED_OUT' && !_intentionalSignOut) {
      mappedEvent = 'SESSION_EXPIRED';
    }
    _intentionalSignOut = false;

    const mappedUser = session?.user?.id ? mapUser(session.user) : null;
    setCachedUser(mappedUser);
    callback(mappedEvent, session as unknown as SupabaseSession | null, mappedUser);
  });

  return {
    unsubscribe: () => data.subscription.unsubscribe(),
  };
}

export async function register(email: string, password: string, campaignCode?: string, captchaToken?: string): Promise<User> {
  let codeType: 'campaign' | 'referral' = 'campaign';
  const normalizedCode = campaignCode?.trim().toUpperCase();

  if (INVITE_CODES_ENABLED) {
    if (!normalizedCode) {
      throw new Error('Invite code is required');
    }
    if (!/^[A-Z0-9]{6,20}$/.test(normalizedCode)) {
      throw new Error('Invite code must be 6-20 characters (A-Z, 0-9)');
    }

    const { data: isValidCampaignCode } = await supabase.rpc('validate_campaign_code', {
      p_code: normalizedCode,
      p_campaign_type: 'invite',
    });

    if (!isValidCampaignCode) {
      const { data: isValidReferralCode } = await supabase.rpc('validate_referral_code', {
        p_code: normalizedCode,
      });
      if (!isValidReferralCode) {
        throw new Error('Invalid or expired invite code');
      }
      codeType = 'referral';
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { captchaToken },
  });

  if (error) throw error;
  if (!data.user) {
    throw new Error('Registration succeeded but user was not returned');
  }

  if (INVITE_CODES_ENABLED) {
    if (codeType === 'campaign') {
      // consume_campaign_code resolves auth.uid() internally and attributes the
      // use to the caller; it cannot be pointed at another user.
      await supabase.rpc('consume_campaign_code', {
        p_code: normalizedCode,
        p_campaign_type: 'invite',
      });
    } else {
      // Referral code: use_referral_code resolves auth.uid() internally;
      // the user is now signed-up and the session is active.
      await supabase.rpc('use_referral_code', { p_code: normalizedCode });
    }

    // Apply any campaign benefit (grant_plus_until_days, stripe_promotion_code_id).
    // This is a SECURITY DEFINER RPC bound to auth.uid() — it applies the grant
    // to the signed-in user only, requires that the code was consumed, and is
    // single-shot. The client cannot write to subscriptions directly.
    const { data: benefit } = await supabase.rpc('apply_campaign_benefit', {
      p_code: normalizedCode,
    });

    // If the code carries a Stripe promotion code, stash it for use at checkout.
    const promoCodeId = (benefit as Record<string, unknown> | null)?.stripe_promotion_code_id;
    if (typeof promoCodeId === 'string' && promoCodeId) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.PENDING_PROMO, promoCodeId);
      }
    }
  }

  const user = mapUser(data.user);
  setCachedUser(user);
  return user;
}

export async function login(email: string, password: string, captchaToken?: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken },
  });

  if (error) throw error;
  if (!data.user) throw new Error('Login failed');

  const user = mapUser(data.user);
  setCachedUser(user);
  return user;
}

export async function loginWithOAuth(provider: 'google' | 'github'): Promise<void> {
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });

  if (error) throw error;
}

export async function sendPasswordResetEmail(email: string, captchaToken?: string): Promise<void> {
  const redirectTo = globalThis.window === undefined
    ? undefined
    : `${globalThis.location.origin}/auth/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
    captchaToken,
  });

  if (error) throw error;
}

export async function logout(): Promise<void> {
  // There is no account to sign out of. Clearing the cached Local User would also
  // strand the app, because db.ts getUserId() throws without it.
  if (LOCAL_MODE) return;

  _intentionalSignOut = true;
  await supabase.auth.signOut();
  setCachedUser(null);
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEYS.LAST_VISITED_PATH);
  }
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function updateEmail(newEmail: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw error;
}

export async function getLinkedIdentities(): Promise<{ provider: string; identityId: string; email?: string }[]> {
  // Local Mode has no linked identities, and no Supabase client to ask.
  if (LOCAL_MODE) return [];

  const { data, error } = await supabase.auth.getUserIdentities();
  if (error || !data) return [];
  return data.identities.map((i) => ({
    provider: i.provider,
    identityId: i.identity_id,
    email: typeof i.identity_data?.email === 'string' ? i.identity_data.email : undefined,
  }));
}

export async function linkGoogleAccount(): Promise<void> {
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
  const { error } = await supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo } });
  if (error) throw error;
}

export async function unlinkGoogleAccount(identityId: string): Promise<void> {
  const { data, error } = await supabase.auth.getUserIdentities();
  if (error || !data) throw new Error('Could not fetch identities');
  const identity = data.identities.find((i) => i.identity_id === identityId);
  if (!identity) throw new Error('Google identity not found');
  const { error: unlinkError } = await supabase.auth.unlinkIdentity(identity);
  if (unlinkError) throw unlinkError;
}

const ALLOWED_AVATAR_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  if (!ALLOWED_AVATAR_EXTENSIONS.has(ext)) {
    throw new Error('Only JPG, PNG, and WebP images are allowed.');
  }
  const path = `${userId}/avatar.${ext}`;
  const { data, error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error || !data) throw error ?? new Error('Avatar upload failed');
  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
  const avatarUrl = urlData.publicUrl;
  await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
  return avatarUrl;
}

export async function removeAvatar(userId: string): Promise<void> {
  const { data: files } = await supabase.storage.from('avatars').list(userId);
  if (files && files.length > 0) {
    const paths = files.map((f) => `${userId}/${f.name}`);
    await supabase.storage.from('avatars').remove(paths);
  }
  await supabase.auth.updateUser({ data: { avatar_url: null } });
}
