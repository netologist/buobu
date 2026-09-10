import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/lib/supabase';
import { STORAGE_KEYS } from '@/lib/constants';
import { useEntitlementsStore } from '../entitlements-store';

// The global supabase mock is configured in src/test/setup.ts.
// We override `.from()` per-test to control the `entitlements` view response.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type EntitlementsRow = {
  is_plus?: boolean;
  has_sync_access?: boolean;
  plan?: string;
  status?: string;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  trial_end?: string | null;
  cohort?: string;
};

function mockEntitlementsRow(row: EntitlementsRow, error?: { message: string } | null) {
  const singleResult = { data: error ? null : row, error: error ?? null };
  const singleMock = vi.fn().mockResolvedValue(singleResult);
  const selectMock = vi.fn().mockReturnValue({ single: singleMock });
  vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);
  return { selectMock, singleMock };
}

const PLUS_ROW: EntitlementsRow = {
  is_plus: true,
  has_sync_access: true,
  plan: 'plus',
  status: 'active',
  current_period_end: '2027-01-01T00:00:00Z',
  cancel_at_period_end: false,
  trial_end: null,
  cohort: 'standard',
};

const FREE_ROW: EntitlementsRow = {
  is_plus: false,
  has_sync_access: false,
  plan: 'free',
  status: 'active',
  current_period_end: null,
  cancel_at_period_end: false,
  trial_end: null,
  cohort: 'standard',
};

// ---------------------------------------------------------------------------
// Reset store to known initial state before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  useEntitlementsStore.setState({
    isPlus: false,
    hasSyncAccess: false,
    plan: 'free',
    status: 'active',
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    trialEnd: null,
    cohort: 'standard',
    isLoading: false,
    isOffline: false,
  });
});

// ---------------------------------------------------------------------------
// refreshEntitlements — success path
// ---------------------------------------------------------------------------

describe('refreshEntitlements — success', () => {
  it('sets isPlus=true for a plus user', async () => {
    mockEntitlementsRow(PLUS_ROW);
    await useEntitlementsStore.getState().refreshEntitlements();
    expect(useEntitlementsStore.getState().isPlus).toBe(true);
  });

  it('sets hasSyncAccess=true for a plus user', async () => {
    mockEntitlementsRow(PLUS_ROW);
    await useEntitlementsStore.getState().refreshEntitlements();
    expect(useEntitlementsStore.getState().hasSyncAccess).toBe(true);
  });

  it('sets plan="plus"', async () => {
    mockEntitlementsRow(PLUS_ROW);
    await useEntitlementsStore.getState().refreshEntitlements();
    expect(useEntitlementsStore.getState().plan).toBe('plus');
  });

  it('sets currentPeriodEnd from response', async () => {
    mockEntitlementsRow(PLUS_ROW);
    await useEntitlementsStore.getState().refreshEntitlements();
    expect(useEntitlementsStore.getState().currentPeriodEnd).toBe('2027-01-01T00:00:00Z');
  });

  it('sets cohort from response', async () => {
    mockEntitlementsRow({ ...PLUS_ROW, cohort: 'founder' });
    await useEntitlementsStore.getState().refreshEntitlements();
    expect(useEntitlementsStore.getState().cohort).toBe('founder');
  });

  it('sets isLoading=false after fetch', async () => {
    mockEntitlementsRow(FREE_ROW);
    await useEntitlementsStore.getState().refreshEntitlements();
    expect(useEntitlementsStore.getState().isLoading).toBe(false);
  });

  it('sets isOffline=false on success', async () => {
    useEntitlementsStore.setState({ isOffline: true });
    mockEntitlementsRow(FREE_ROW);
    await useEntitlementsStore.getState().refreshEntitlements();
    expect(useEntitlementsStore.getState().isOffline).toBe(false);
  });

  it('persists fresh values to localStorage', async () => {
    mockEntitlementsRow(PLUS_ROW);
    await useEntitlementsStore.getState().refreshEntitlements();
    const raw = localStorage.getItem(STORAGE_KEYS.ENTITLEMENTS);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.isPlus).toBe(true);
  });

  it('queries the entitlements view', async () => {
    mockEntitlementsRow(FREE_ROW);
    await useEntitlementsStore.getState().refreshEntitlements();
    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('entitlements');
  });

  it('handles trialing status with trialEnd date', async () => {
    mockEntitlementsRow({ ...PLUS_ROW, status: 'trialing', trial_end: '2026-05-01T00:00:00Z' });
    await useEntitlementsStore.getState().refreshEntitlements();
    expect(useEntitlementsStore.getState().status).toBe('trialing');
    expect(useEntitlementsStore.getState().trialEnd).toBe('2026-05-01T00:00:00Z');
  });

  it('handles cancelAtPeriodEnd=true', async () => {
    mockEntitlementsRow({ ...PLUS_ROW, cancel_at_period_end: true });
    await useEntitlementsStore.getState().refreshEntitlements();
    expect(useEntitlementsStore.getState().cancelAtPeriodEnd).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// refreshEntitlements — network failure (offline fallback)
// ---------------------------------------------------------------------------

describe('refreshEntitlements — network failure', () => {
  it('falls back to cached values when request fails', async () => {
    // Seed cache with plus data.
    localStorage.setItem(
      STORAGE_KEYS.ENTITLEMENTS,
      JSON.stringify({ ...PLUS_ROW, isPlus: true, hasSyncAccess: true, plan: 'plus', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false, trialEnd: null, cohort: 'standard' }),
    );
    mockEntitlementsRow({}, { message: 'Network error' });

    await useEntitlementsStore.getState().refreshEntitlements();

    expect(useEntitlementsStore.getState().isOffline).toBe(true);
    expect(useEntitlementsStore.getState().isLoading).toBe(false);
  });

  it('falls back to FREE_DEFAULTS when no cache and request fails', async () => {
    localStorage.clear();
    mockEntitlementsRow({}, { message: 'Network error' });

    await useEntitlementsStore.getState().refreshEntitlements();

    expect(useEntitlementsStore.getState().isPlus).toBe(false);
    expect(useEntitlementsStore.getState().isOffline).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// resetEntitlements
// ---------------------------------------------------------------------------

describe('resetEntitlements', () => {
  it('resets isPlus to false', () => {
    useEntitlementsStore.setState({ isPlus: true });
    useEntitlementsStore.getState().resetEntitlements();
    expect(useEntitlementsStore.getState().isPlus).toBe(false);
  });

  it('resets hasSyncAccess to false', () => {
    useEntitlementsStore.setState({ hasSyncAccess: true });
    useEntitlementsStore.getState().resetEntitlements();
    expect(useEntitlementsStore.getState().hasSyncAccess).toBe(false);
  });

  it('resets plan to "free"', () => {
    useEntitlementsStore.setState({ plan: 'plus' });
    useEntitlementsStore.getState().resetEntitlements();
    expect(useEntitlementsStore.getState().plan).toBe('free');
  });

  it('resets cohort to "standard"', () => {
    useEntitlementsStore.setState({ cohort: 'founder' });
    useEntitlementsStore.getState().resetEntitlements();
    expect(useEntitlementsStore.getState().cohort).toBe('standard');
  });

  it('sets isLoading=false', () => {
    useEntitlementsStore.setState({ isLoading: true });
    useEntitlementsStore.getState().resetEntitlements();
    expect(useEntitlementsStore.getState().isLoading).toBe(false);
  });

  it('sets isOffline=false', () => {
    useEntitlementsStore.setState({ isOffline: true });
    useEntitlementsStore.getState().resetEntitlements();
    expect(useEntitlementsStore.getState().isOffline).toBe(false);
  });

  it('clears localStorage cache', () => {
    localStorage.setItem(STORAGE_KEYS.ENTITLEMENTS, JSON.stringify({ isPlus: true }));
    useEntitlementsStore.getState().resetEntitlements();
    expect(localStorage.getItem(STORAGE_KEYS.ENTITLEMENTS)).toBeNull();
  });
});
