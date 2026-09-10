/**
 * Client-side helpers for the referral code system.
 *
 * All fetches call the Referral Cloudflare Worker (NEXT_PUBLIC_REFERRAL_API_URL).
 * The caller is responsible for passing the user's access token (Bearer auth).
 */

const REFERRAL_API_BASE = process.env.NEXT_PUBLIC_REFERRAL_API_URL ?? '';

export interface ReferralUse {
  ordinal: number;
  used_at: string; // ISO 8601
}

export interface ReferralInfo {
  ok: true;
  code: string;
  max_uses: number;
  uses_count: number;
  expires_at: string; // ISO 8601
  expired: boolean;
  uses: ReferralUse[];
}

export interface ReferralError {
  ok: false;
  reason: 'no_code' | 'not_found' | 'expired' | 'exhausted' | 'self' | 'already_used' | 'not_expired';
}

export type ReferralResult = ReferralInfo | ReferralError;

export async function fetchReferralInfo(token: string): Promise<ReferralInfo> {
  const res = await fetch(`${REFERRAL_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch referral info');
  return res.json() as Promise<ReferralInfo>;
}

export async function regenerateReferralCode(token: string): Promise<{ ok: boolean; code?: string; reason?: string }> {
  const res = await fetch(`${REFERRAL_API_BASE}/regenerate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to regenerate referral code');
  return res.json();
}

export async function useReferralCode(token: string, code: string): Promise<ReferralResult> {
  const res = await fetch(`${REFERRAL_API_BASE}/use`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error('Failed to use referral code');
  return res.json() as Promise<ReferralResult>;
}
