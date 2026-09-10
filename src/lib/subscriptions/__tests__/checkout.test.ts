import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { STORAGE_KEYS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { makeSupabaseSession } from '@/test/mocks/supabase';

// ---------------------------------------------------------------------------
// Module-level mocks — must be declared before the module under test is
// imported so that the "use client" module sees the mocked localStorage.
// ---------------------------------------------------------------------------

// Mock fetch globally.
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Capture location.href changes without navigating.
const locationHref = vi.hoisted(() => ({ value: '' }));
Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    get href() { return locationHref.value; },
    set href(v: string) { locationHref.value = v; },
  },
});

import { startCheckout } from '../checkout';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockCheckoutSuccess(url = 'https://checkout.stripe.com/session/abc') {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ url }),
  });
}

function mockCheckoutError(status = 400, error = 'Invalid price ID') {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error }),
  });
}

function mockCheckoutNetworkFailure() {
  mockFetch.mockRejectedValueOnce(new Error('Network failure'));
}

// ---------------------------------------------------------------------------
// Reset state before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  locationHref.value = '';
  mockFetch.mockReset();
  // Provide an authenticated session so startCheckout can read the token.
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: makeSupabaseSession() },
    error: null,
  } as never);
});

afterEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Success path
// ---------------------------------------------------------------------------

describe('startCheckout — success', () => {
  it('calls POST /api/stripe/checkout with the given priceId', async () => {
    mockCheckoutSuccess();
    await startCheckout('price_yearly_test');

    expect(mockFetch).toHaveBeenCalledWith('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-access-token' },
      body: JSON.stringify({ priceId: 'price_yearly_test' }),
    });
  });

  it('redirects to the returned Stripe checkout URL', async () => {
    const url = 'https://checkout.stripe.com/session/xyz';
    mockCheckoutSuccess(url);

    await startCheckout('price_monthly_test');

    expect(locationHref.value).toBe(url);
  });

  it('does not redirect when the API returns no URL', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await startCheckout('price_yearly_test');

    expect(locationHref.value).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Pending promo code
// ---------------------------------------------------------------------------

describe('startCheckout — pending promo code', () => {
  it('includes promotionCode in body when PENDING_PROMO is set in localStorage', async () => {
    localStorage.setItem(STORAGE_KEYS.PENDING_PROMO, 'LAUNCH2026');
    mockCheckoutSuccess();

    await startCheckout('price_yearly_test');

    expect(mockFetch).toHaveBeenCalledWith('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-access-token' },
      body: JSON.stringify({ priceId: 'price_yearly_test', promotionCode: 'LAUNCH2026' }),
    });
  });

  it('omits promotionCode when PENDING_PROMO is not set', async () => {
    mockCheckoutSuccess();

    await startCheckout('price_yearly_test');

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body).not.toHaveProperty('promotionCode');
  });

  it('omits promotionCode when PENDING_PROMO is an empty string', async () => {
    localStorage.setItem(STORAGE_KEYS.PENDING_PROMO, '');
    mockCheckoutSuccess();

    await startCheckout('price_yearly_test');

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    expect(body).not.toHaveProperty('promotionCode');
  });
});

// ---------------------------------------------------------------------------
// Error paths
// ---------------------------------------------------------------------------

describe('startCheckout — error handling', () => {
  it('throws with the server error message when response is not ok', async () => {
    mockCheckoutError(400, 'Invalid price ID');

    await expect(startCheckout('price_bad')).rejects.toThrow('Invalid price ID');
  });

  it('throws "Checkout failed" when error response has no error field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    await expect(startCheckout('price_bad')).rejects.toThrow('Checkout failed');
  });

  it('throws when fetch itself rejects (network failure)', async () => {
    mockCheckoutNetworkFailure();

    await expect(startCheckout('price_monthly_test')).rejects.toThrow('Network failure');
  });

  it('does not redirect when an error is thrown', async () => {
    mockCheckoutError();

    await startCheckout('price_bad').catch(() => {});

    expect(locationHref.value).toBe('');
  });
});
