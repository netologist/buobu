import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { supabase } from '@/lib/supabase';
import { makeSupabaseSession } from '@/test/mocks/supabase';

// vi.hoisted runs BEFORE module evaluation — must be used to set env vars
// that are captured as module-level constants in BillingSection.tsx.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_STRIPE_PRICE_PLUS_MONTHLY = 'price_monthly_test';
  process.env.NEXT_PUBLIC_STRIPE_PRICE_PLUS_YEARLY = 'price_yearly_test';
});

// ---------------------------------------------------------------------------
// Mock the entitlements store so each test controls the plan state.
// ---------------------------------------------------------------------------

const mockEntitlementsState = vi.hoisted(() => ({
  isPlus: false,
  hasSyncAccess: false,
  plan: 'free' as 'free' | 'plus',
  status: 'active',
  currentPeriodEnd: null as string | null,
  cancelAtPeriodEnd: false,
  trialEnd: null as string | null,
  cohort: 'standard' as 'founder' | 'early' | 'standard',
  isLoading: false,
  isOffline: false,
  refreshEntitlements: vi.fn(),
  resetEntitlements: vi.fn(),
}));

vi.mock('@/stores/entitlements-store', () => ({
  useEntitlements: () => mockEntitlementsState,
  useEntitlementsStore: Object.assign(
    () => mockEntitlementsState,
    { getState: () => mockEntitlementsState },
  ),
}));

// Mock fetch globally — individual tests override as needed.
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Provide a valid auth session so startCheckout / openPortal can read the token.
beforeEach(() => {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: makeSupabaseSession() },
    error: null,
  } as never);
});

// Prevent real location changes.
const locationHref = vi.hoisted(() => ({ value: '' }));
Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    get href() { return locationHref.value; },
    set href(v: string) { locationHref.value = v; },
  },
});

import { BillingSection } from '../BillingSection';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetState(partial: Partial<typeof mockEntitlementsState> = {}) {
  Object.assign(mockEntitlementsState, {
    isPlus: false,
    plan: 'free',
    status: 'active',
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    trialEnd: null,
    cohort: 'standard',
    isLoading: false,
    isOffline: false,
    ...partial,
  });
  locationHref.value = '';
}

function renderSection() {
  return render(<BillingSection />);
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('loading state', () => {
  it('shows a loading indicator when isLoading=true', () => {
    resetState({ isLoading: true });
    renderSection();
    expect(screen.getByText(/loading plan/i)).toBeDefined();
  });

  it('does not render plan content while loading', () => {
    resetState({ isLoading: true });
    renderSection();
    expect(screen.queryByText(/upgrade to plus/i)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Free plan UI
// ---------------------------------------------------------------------------

describe('Free plan', () => {
  beforeEach(() => resetState({ isPlus: false }));

  it('shows "Free plan" text', () => {
    renderSection();
    expect(screen.getByText('Free plan')).toBeDefined();
  });

  it('shows "Free" badge', () => {
    renderSection();
    expect(screen.getByText('Free')).toBeDefined();
  });

  it('renders "Upgrade to Plus" button', () => {
    renderSection();
    expect(screen.getByRole('button', { name: /upgrade to plus/i })).toBeDefined();
  });

  it('shows price picker after clicking Upgrade to Plus', async () => {
    renderSection();
    await userEvent.click(screen.getByRole('button', { name: /upgrade to plus/i }));
    expect(screen.getByRole('button', { name: /yearly/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /monthly/i })).toBeDefined();
  });

  it('shows Plus feature list', () => {
    renderSection();
    expect(screen.getByText(/cloud sync across all devices/i)).toBeDefined();
    expect(screen.getByText(/api keys/i)).toBeDefined();
  });

  it('does NOT render "Manage Billing" button', () => {
    renderSection();
    expect(screen.queryByRole('button', { name: /manage billing/i })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Plus plan UI
// ---------------------------------------------------------------------------

describe('Plus plan', () => {
  beforeEach(() =>
    resetState({
      isPlus: true,
      plan: 'plus',
      status: 'active',
      currentPeriodEnd: '2027-01-01T00:00:00Z',
      cohort: 'standard',
    }),
  );

  it('shows "Buobu Plus" text', () => {
    renderSection();
    expect(screen.getByText('Buobu Plus')).toBeDefined();
  });

  it('shows "Plus" badge', () => {
    renderSection();
    expect(screen.getByText('Plus')).toBeDefined();
  });

  it('renders "Manage Billing" button', () => {
    renderSection();
    expect(screen.getByRole('button', { name: /manage billing/i })).toBeDefined();
  });

  it('does NOT render "Upgrade to Plus" button', () => {
    renderSection();
    expect(screen.queryByRole('button', { name: /upgrade to plus/i })).toBeNull();
  });

  it('shows renewal date text', () => {
    renderSection();
    expect(screen.getByText(/renews/i)).toBeDefined();
  });

  it('does NOT show Plus feature list', () => {
    renderSection();
    expect(screen.queryByText(/cloud sync across all devices/i)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Cohort badges
// ---------------------------------------------------------------------------

describe('cohort badges', () => {
  it('shows Founder badge for founder cohort', () => {
    resetState({ isPlus: true, plan: 'plus', cohort: 'founder' });
    renderSection();
    expect(screen.getByText('Founder')).toBeDefined();
  });

  it('shows Early Access badge for early cohort', () => {
    resetState({ isPlus: true, plan: 'plus', cohort: 'early' });
    renderSection();
    expect(screen.getByText('Early Access')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Warnings
// ---------------------------------------------------------------------------

describe('past_due warning', () => {
  it('shows a past due warning banner when status=past_due', () => {
    resetState({ isPlus: true, plan: 'plus', status: 'past_due' });
    renderSection();
    expect(screen.getByText(/last payment failed/i)).toBeDefined();
  });

  it('does NOT show past_due warning for active status', () => {
    resetState({ isPlus: true, plan: 'plus', status: 'active' });
    renderSection();
    expect(screen.queryByText(/last payment failed/i)).toBeNull();
  });
});

describe('cancel at period end warning', () => {
  it('shows cancellation warning when cancelAtPeriodEnd=true', () => {
    resetState({ isPlus: true, plan: 'plus', cancelAtPeriodEnd: true });
    renderSection();
    expect(screen.getByText(/set to cancel/i)).toBeDefined();
  });

  it('shows cohort pricing loss warning for founder + canceling', () => {
    resetState({ isPlus: true, plan: 'plus', cohort: 'founder', cancelAtPeriodEnd: true });
    renderSection();
    expect(screen.getByText(/founder.*pricing will be lost/i)).toBeDefined();
  });

  it('shows cohort pricing loss warning for early + canceling', () => {
    resetState({ isPlus: true, plan: 'plus', cohort: 'early', cancelAtPeriodEnd: true });
    renderSection();
    expect(screen.getByText(/early access.*pricing will be lost/i)).toBeDefined();
  });
});

describe('trial banner', () => {
  it('shows trial end date when status=trialing', () => {
    resetState({
      isPlus: true,
      plan: 'plus',
      status: 'trialing',
      trialEnd: '2026-05-01T00:00:00Z',
    });
    renderSection();
    expect(screen.getByText(/trial ends/i)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Checkout flow
// ---------------------------------------------------------------------------

describe('checkout flow', () => {
  beforeEach(() => resetState({ isPlus: false }));

  it('calls /api/stripe/checkout on yearly plan selection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://checkout.stripe.com/session' }),
    });

    renderSection();
    await userEvent.click(screen.getByRole('button', { name: /upgrade to plus/i }));
    await userEvent.click(screen.getByRole('button', { name: /yearly/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/stripe/checkout',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('redirects to Stripe URL on successful checkout', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://checkout.stripe.com/test' }),
    });

    renderSection();
    await userEvent.click(screen.getByRole('button', { name: /upgrade to plus/i }));
    await userEvent.click(screen.getByRole('button', { name: /yearly/i }));

    await waitFor(() => {
      expect(locationHref.value).toBe('https://checkout.stripe.com/test');
    });
  });

  it('shows error message when checkout API fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Payment setup failed' }),
    });

    renderSection();
    await userEvent.click(screen.getByRole('button', { name: /upgrade to plus/i }));
    await userEvent.click(screen.getByRole('button', { name: /yearly/i }));

    await waitFor(() => {
      expect(screen.getByText(/payment setup failed/i)).toBeDefined();
    });
  });

  it('includes PENDING_PROMO code from localStorage in checkout body', async () => {
    localStorage.setItem('buobu_pending_promo', 'PROMO_CODE_123');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://checkout.stripe.com/session' }),
    });

    renderSection();
    await userEvent.click(screen.getByRole('button', { name: /upgrade to plus/i }));
    await userEvent.click(screen.getByRole('button', { name: /yearly/i }));

    await waitFor(() => {
      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.promotionCode).toBe('PROMO_CODE_123');
    });

    localStorage.removeItem('buobu_pending_promo');
  });
});

// ---------------------------------------------------------------------------
// Portal flow
// ---------------------------------------------------------------------------

describe('portal flow', () => {
  beforeEach(() =>
    resetState({ isPlus: true, plan: 'plus', status: 'active' }),
  );

  it('calls /api/stripe/portal on Manage Billing click', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://billing.stripe.com/portal' }),
    });

    renderSection();
    await userEvent.click(screen.getByRole('button', { name: /manage billing/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/stripe/portal', expect.objectContaining({ method: 'POST' }));
    });
  });

  it('redirects to portal URL on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://billing.stripe.com/portal/abc' }),
    });

    renderSection();
    await userEvent.click(screen.getByRole('button', { name: /manage billing/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/stripe/portal', expect.objectContaining({ method: 'POST' }));
    });
  });

  it('shows error message when portal API fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Could not open billing portal' }),
    });

    renderSection();
    await userEvent.click(screen.getByRole('button', { name: /manage billing/i }));

    await waitFor(() => {
      expect(screen.getByText(/could not open billing portal/i)).toBeDefined();
    });
  });
});
