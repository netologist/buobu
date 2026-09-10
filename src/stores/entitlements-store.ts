'use client';

/**
 * Entitlements store — reads from the Supabase `entitlements` view
 * and caches the result in localStorage for offline access.
 *
 * Usage:
 *   const { isPlus, hasSyncAccess, isLoading } = useEntitlements();
 *
 * The store is refreshed:
 *   - On login (called from the auth context after session is confirmed).
 *   - On window focus (via a lightweight hook below).
 *   - After a successful Stripe checkout (call refreshEntitlements() manually).
 *
 * Offline behaviour:
 *   If fetch fails (offline / network error), the last known values from
 *   localStorage are used and `isOffline` is set to true.
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { STORAGE_KEYS } from '@/lib/constants';
import { BILLING_ENABLED } from '@/lib/feature-flags';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export type EntitlementsCache = {
  isPlus: boolean;
  hasSyncAccess: boolean;
  plan: 'free' | 'plus';
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  cohort: 'founder' | 'early' | 'standard';
};

interface EntitlementsState extends EntitlementsCache {
  isLoading: boolean;
  isOffline: boolean;
  /** Fetch from Supabase and update cache. */
  refreshEntitlements: () => Promise<void>;
  /** Clear all entitlements (on sign-out). */
  resetEntitlements: () => void;
}

// -----------------------------------------------------------------------
// Default / free-tier values
// -----------------------------------------------------------------------

const FREE_DEFAULTS: EntitlementsCache = {
  isPlus: false,
  hasSyncAccess: false,
  plan: 'free',
  status: 'active',
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  trialEnd: null,
  cohort: 'standard',
};

/**
 * When billing is disabled every user automatically gets Plus-tier access.
 * No Supabase fetch is performed — these values are used directly.
 */
const BILLING_DISABLED_DEFAULTS: EntitlementsCache = {
  isPlus: true,
  hasSyncAccess: true,
  plan: 'plus',
  status: 'active',
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  trialEnd: null,
  cohort: 'standard',
};

// -----------------------------------------------------------------------
// localStorage helpers
// -----------------------------------------------------------------------

function readCachedEntitlements(): EntitlementsCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ENTITLEMENTS);
    if (!raw) return null;
    return JSON.parse(raw) as EntitlementsCache;
  } catch {
    return null;
  }
}

function writeCachedEntitlements(data: EntitlementsCache): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.ENTITLEMENTS, JSON.stringify(data));
  } catch {
    // Storage quota exceeded — not fatal.
  }
}

function clearCachedEntitlements(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.ENTITLEMENTS);
}

// -----------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------

export const useEntitlementsStore = create<EntitlementsState>((set) => {
  // When billing is disabled, skip the cache and immediately grant Plus access.
  // Otherwise, initialise from cache so there's no flash of free-tier UI on reload.
  const initialEntitlements = BILLING_ENABLED
    ? (readCachedEntitlements() ?? FREE_DEFAULTS)
    : BILLING_DISABLED_DEFAULTS;

  return {
    ...initialEntitlements,
    isLoading: BILLING_ENABLED, // no async fetch needed when billing is disabled
    isOffline: false,

    refreshEntitlements: async () => {
      // When billing is disabled, always resolve immediately with Plus access.
      if (!BILLING_ENABLED) {
        set({ ...BILLING_DISABLED_DEFAULTS, isLoading: false, isOffline: false });
        return;
      }

      set({ isLoading: true });

      try {
        const { data, error } = await supabase
          .from('entitlements')
          .select(
            'is_plus, has_sync_access, plan, status, current_period_end, cancel_at_period_end, trial_end, cohort',
          )
          .single();

        if (error) throw error;

        const fresh: EntitlementsCache = {
          isPlus: data.is_plus ?? false,
          hasSyncAccess: data.has_sync_access ?? false,
          plan: (data.plan as 'free' | 'plus') ?? 'free',
          status: data.status ?? 'active',
          currentPeriodEnd: data.current_period_end ?? null,
          cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
          trialEnd: data.trial_end ?? null,
          cohort: (data.cohort as EntitlementsCache['cohort']) ?? 'standard',
        };

        writeCachedEntitlements(fresh);
        set({ ...fresh, isLoading: false, isOffline: false });
      } catch {
        // Network failure — fall back to cached values.
        const cached = readCachedEntitlements();
        if (cached) {
          set({ ...cached, isLoading: false, isOffline: true });
        } else {
          set({ ...FREE_DEFAULTS, isLoading: false, isOffline: true });
        }
      }
    },

    resetEntitlements: () => {
      if (!BILLING_ENABLED) {
        set({ ...BILLING_DISABLED_DEFAULTS, isLoading: false, isOffline: false });
        return;
      }
      clearCachedEntitlements();
      set({ ...FREE_DEFAULTS, isLoading: false, isOffline: false });
    },
  };
});

// -----------------------------------------------------------------------
// Convenience selector hook
// -----------------------------------------------------------------------

export function useEntitlements() {
  return useEntitlementsStore();
}
