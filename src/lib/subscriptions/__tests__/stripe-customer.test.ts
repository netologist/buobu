import { describe, it, expect, vi } from 'vitest';
import { getOrCreateStripeCustomer } from '../stripe-customer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSupabaseAdmin(overrides: {
  selectData?: { stripe_customer_id: string | null } | null;
  selectError?: { code: string; message: string } | null;
  upsertError?: { message: string } | null;
} = {}) {
  const { selectData = null, selectError = null, upsertError = null } = overrides;

  const upsertMock = vi.fn().mockResolvedValue({ error: upsertError });
  const singleMock = vi.fn().mockResolvedValue({ data: selectData, error: selectError });
  const eqMock = vi.fn().mockReturnValue({ single: singleMock });
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

  const fromMock = vi.fn().mockImplementation(() => ({
    select: selectMock,
    upsert: upsertMock,
  }));

  return { from: fromMock, _upsertMock: upsertMock, _singleMock: singleMock };
}

function makeStripe(customerId = 'cus_new123') {
  const createMock = vi.fn().mockResolvedValue({ id: customerId });
  return {
    customers: { create: createMock },
    _createMock: createMock,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getOrCreateStripeCustomer', () => {
  const userId = 'user-uuid-123';
  const email = 'test@example.com';

  describe('existing customer ID in DB', () => {
    it('returns the existing stripe_customer_id without calling Stripe', async () => {
      const supabaseAdmin = makeSupabaseAdmin({
        selectData: { stripe_customer_id: 'cus_existing' },
      });
      const stripe = makeStripe();

      const result = await getOrCreateStripeCustomer(
        supabaseAdmin as any,
        stripe as any,
        userId,
        email,
      );

      expect(result).toBe('cus_existing');
      expect(stripe._createMock).not.toHaveBeenCalled();
    });
  });

  describe('no existing row (PGRST116 "no rows" error)', () => {
    it('creates a Stripe customer and persists it', async () => {
      const supabaseAdmin = makeSupabaseAdmin({
        selectData: null,
        selectError: { code: 'PGRST116', message: 'no rows' },
      });
      const stripe = makeStripe('cus_brand_new');

      const result = await getOrCreateStripeCustomer(
        supabaseAdmin as any,
        stripe as any,
        userId,
        email,
      );

      expect(result).toBe('cus_brand_new');
      expect(stripe._createMock).toHaveBeenCalledWith({
        email,
        metadata: { supabase_user_id: userId },
      });
    });

    it('calls upsert with correct payload after creating customer', async () => {
      const supabaseAdmin = makeSupabaseAdmin({
        selectData: null,
        selectError: { code: 'PGRST116', message: 'no rows' },
      });
      const stripe = makeStripe('cus_brand_new');

      await getOrCreateStripeCustomer(supabaseAdmin as any, stripe as any, userId, email);

      expect(supabaseAdmin._upsertMock).toHaveBeenCalledWith(
        { user_id: userId, stripe_customer_id: 'cus_brand_new' },
        { onConflict: 'user_id' },
      );
    });
  });

  describe('row exists but stripe_customer_id is null', () => {
    it('creates a Stripe customer when stripe_customer_id is null', async () => {
      const supabaseAdmin = makeSupabaseAdmin({
        selectData: { stripe_customer_id: null },
        selectError: null,
      });
      const stripe = makeStripe('cus_null_case');

      const result = await getOrCreateStripeCustomer(
        supabaseAdmin as any,
        stripe as any,
        userId,
        email,
      );

      expect(result).toBe('cus_null_case');
      expect(stripe._createMock).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('throws on unexpected DB read error (non-PGRST116)', async () => {
      const supabaseAdmin = makeSupabaseAdmin({
        selectData: null,
        selectError: { code: 'PGRST500', message: 'Internal server error' },
      });
      const stripe = makeStripe();

      await expect(
        getOrCreateStripeCustomer(supabaseAdmin as any, stripe as any, userId, email),
      ).rejects.toThrow('Failed to read subscription');
    });

    it('throws when upsert fails after customer creation', async () => {
      const supabaseAdmin = makeSupabaseAdmin({
        selectData: null,
        selectError: { code: 'PGRST116', message: 'no rows' },
        upsertError: { message: 'unique violation' },
      });
      const stripe = makeStripe('cus_upsert_fail');

      await expect(
        getOrCreateStripeCustomer(supabaseAdmin as any, stripe as any, userId, email),
      ).rejects.toThrow('Failed to persist Stripe customer');
    });
  });
});
