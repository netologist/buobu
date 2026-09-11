/**
 * Unit tests for POST /api/stripe/webhook
 *
 * Mocks:
 *  - @/lib/stripe  — so constructEvent, customers.retrieve, subscriptions.retrieve
 *    are fully controlled without real Stripe credentials.
 *  - @/lib/supabase-admin — so DB mutations are verifiable without a live DB.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Environment stubs required by stripe.ts and supabase-admin.ts at import time.
// ---------------------------------------------------------------------------
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';

// ---------------------------------------------------------------------------
// Mock @/lib/stripe before the route is imported.
// ---------------------------------------------------------------------------

const mockConstructEvent = vi.fn();
const mockCustomersRetrieve = vi.fn();
const mockSubscriptionsRetrieve = vi.fn();

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: (...args: unknown[]) => mockConstructEvent(...args) },
    customers: { retrieve: (...args: unknown[]) => mockCustomersRetrieve(...args) },
    subscriptions: { retrieve: (...args: unknown[]) => mockSubscriptionsRetrieve(...args) },
  },
}));

// ---------------------------------------------------------------------------
// Mock @/lib/supabase-admin before the route is imported.
// ---------------------------------------------------------------------------

// fromResponses controls what supabaseAdmin.from(table) returns per-call.
// Each entry is consumed in order, like a queue.
const fromResponses: Array<Record<string, unknown>> = [];

const mockFrom = vi.fn().mockImplementation(() => {
  const r = fromResponses.shift() ?? {};
  // Build a fluent Supabase-style chain: from().insert(), from().select().eq().single(), etc.
  const eqChain = {
    eq: vi.fn().mockImplementation(() => ({
      single: vi.fn().mockResolvedValue(r),
      // Allow bare eq() to resolve (for update().eq())
      then: (resolve: (v: unknown) => void) => resolve(r),
    })),
    single: vi.fn().mockResolvedValue(r),
  };
  return {
    insert: vi.fn().mockResolvedValue(r),
    upsert: vi.fn().mockResolvedValue(r),
    select: vi.fn().mockReturnValue(eqChain),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(r),
    }),
    rpc: vi.fn().mockResolvedValue(r),
  };
});

const mockRpc = vi.fn();

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

// ---------------------------------------------------------------------------
// Import the route under test AFTER mocks are registered.
// ---------------------------------------------------------------------------

import { POST } from '../../stripe/webhook/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WEBHOOK_SECRET = 'whsec_mock';

/** Build a minimal Stripe event object. */
function makeEvent(
  type: string,
  dataObject: Record<string, unknown> = {},
  id = `evt_${type.replace(/\./g, '_')}`,
): Record<string, unknown> {
  return { id, type, data: { object: dataObject } };
}

/** Build a NextRequest with a valid stripe-signature header. */
function makeRequest(body: string, sig = 'valid-sig'): NextRequest {
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': sig,
    },
    body,
  });
}

/** Push response values for each supabaseAdmin.from() call. */
function queueFromResponses(...responses: Array<Record<string, unknown>>) {
  fromResponses.push(...responses);
}

/** The minimal subscription object returned by stripe.subscriptions.retrieve(). */
function makeSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub_test123',
    status: 'active',
    items: { data: [{ price: { id: 'price_monthly_test' } }] },
    current_period_end: 1800000000,
    trial_end: null,
    cancel_at_period_end: false,
    customer: 'cus_test123',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Reset state before each test.
// ---------------------------------------------------------------------------

beforeEach(() => {
  fromResponses.length = 0;
  mockFrom.mockClear();
  mockConstructEvent.mockReset();
  mockCustomersRetrieve.mockReset();
  mockSubscriptionsRetrieve.mockReset();
  mockRpc.mockReset();
});

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

describe('POST /api/stripe/webhook — signature verification', () => {
  it('returns 400 when the stripe-signature header is missing', async () => {
    const req = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      body: '{}',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/stripe-signature/i);
  });

  it('returns 400 when constructEvent throws (bad signature)', async () => {
    mockConstructEvent.mockImplementationOnce(() => {
      throw new Error('No signatures found matching the expected signature');
    });

    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/signature/i);
  });

  it('returns 500 when STRIPE_WEBHOOK_SECRET is not configured', async () => {
    const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    try {
      const res = await POST(makeRequest('{}'));
      expect(res.status).toBe(500);
      const json = await res.json() as { error: string };
      expect(json.error).toBe('Webhook configuration error');
    } finally {
      process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
    }
  });
});

// ---------------------------------------------------------------------------
// Idempotency — replayed events
// ---------------------------------------------------------------------------

describe('POST /api/stripe/webhook — idempotency', () => {
  it('returns 200 with replayed:true when event was already processed (unique violation)', async () => {
    const event = makeEvent('invoice.paid');
    mockConstructEvent.mockReturnValueOnce(event);

    // markProcessed insert returns unique_violation error (23505).
    queueFromResponses({ error: { code: '23505', message: 'duplicate' } });

    const res = await POST(makeRequest(JSON.stringify(event)));
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.replayed).toBe(true);
    expect(json.received).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// customer.subscription.deleted — downgrade
// ---------------------------------------------------------------------------

describe('POST /api/stripe/webhook — customer.subscription.deleted', () => {
  it('returns 200 and downgrades the subscription row', async () => {
    const event = makeEvent('customer.subscription.deleted', {
      id: 'sub_deleted',
      customer: 'cus_test',
    });
    mockConstructEvent.mockReturnValueOnce(event);

    // markProcessed insert → success
    // getUserIdByCustomer select().eq().single() → user found
    queueFromResponses(
      { error: null },                                      // markProcessed insert
      { data: { user_id: 'user-abc' }, error: null },      // getUserIdByCustomer
      { error: null },                                      // update subscriptions
    );

    const res = await POST(makeRequest(JSON.stringify(event)));
    expect(res.status).toBe(200);

    const json = await res.json() as Record<string, unknown>;
    expect(json.received).toBe(true);
  });

  it('returns 200 without error when customer is not found in subscriptions', async () => {
    const event = makeEvent('customer.subscription.deleted', {
      id: 'sub_unknown',
      customer: 'cus_unknown',
    });
    mockConstructEvent.mockReturnValueOnce(event);

    // markProcessed → success; getUserIdByCustomer → no user found
    queueFromResponses(
      { error: null },
      { data: null, error: null },
    );

    const res = await POST(makeRequest(JSON.stringify(event)));
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// invoice.payment_failed — past_due
// ---------------------------------------------------------------------------

describe('POST /api/stripe/webhook — invoice.payment_failed', () => {
  it('sets status=past_due on the subscription row', async () => {
    const event = makeEvent('invoice.payment_failed', {
      customer: 'cus_past_due',
      subscription: null, // payment_failed handler does not need subscription
    });
    mockConstructEvent.mockReturnValueOnce(event);

    queueFromResponses(
      { error: null },                                       // markProcessed
      { data: { user_id: 'user-xyz' }, error: null },       // getUserIdByCustomer
      { error: null },                                       // update subscriptions
    );

    const res = await POST(makeRequest(JSON.stringify(event)));
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.received).toBe(true);
  });

  it('returns 200 silently when invoice has no customer', async () => {
    const event = makeEvent('invoice.payment_failed', { customer: null });
    mockConstructEvent.mockReturnValueOnce(event);

    queueFromResponses({ error: null }); // markProcessed only

    const res = await POST(makeRequest(JSON.stringify(event)));
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// customer.subscription.trial_will_end — acknowledged, no DB mutation
// ---------------------------------------------------------------------------

describe('POST /api/stripe/webhook — customer.subscription.trial_will_end', () => {
  it('returns 200 and records the event without any DB update', async () => {
    const event = makeEvent('customer.subscription.trial_will_end', {
      id: 'sub_trialing',
      customer: 'cus_trialing',
    });
    mockConstructEvent.mockReturnValueOnce(event);

    // Only markProcessed is called — no getUserIdByCustomer or update.
    queueFromResponses({ error: null }); // markProcessed insert

    const res = await POST(makeRequest(JSON.stringify(event)));
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.received).toBe(true);

    // from() should have been called exactly once (for markProcessed), not more.
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Unknown event type — acknowledged without error
// ---------------------------------------------------------------------------

describe('POST /api/stripe/webhook — unknown event type', () => {
  it('returns 200 for an unhandled event type', async () => {
    const event = makeEvent('payment_intent.succeeded', { id: 'pi_test' });
    mockConstructEvent.mockReturnValueOnce(event);

    queueFromResponses({ error: null }); // markProcessed

    const res = await POST(makeRequest(JSON.stringify(event)));
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.received).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Handler error — 500 + failure logged
// ---------------------------------------------------------------------------

describe('POST /api/stripe/webhook — handler failure', () => {
  it('returns 500 when a handler throws and logs the failure', async () => {
    const event = makeEvent('invoice.payment_failed', {
      customer: 'cus_bad',
    });
    mockConstructEvent.mockReturnValueOnce(event);

    // markProcessed → success, then getUserIdByCustomer throws.
    queueFromResponses(
      { error: null },     // markProcessed
    );
    // Override from so getUserIdByCustomer throws on the second call.
    mockFrom.mockImplementationOnce(() => ({ insert: vi.fn().mockResolvedValue({ error: null }) }));
    mockFrom.mockImplementationOnce(() => {
      throw new Error('DB connection refused');
    });
    // logFailure uses from('stripe_events_failed').insert()
    mockFrom.mockImplementationOnce(() => ({ insert: vi.fn().mockResolvedValue({ error: null }) }));
    // unmarkProcessed clears the idempotency marker so Stripe's retry is not
    // mistaken for a replay.
    const unmarkEq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementationOnce(() => ({ delete: vi.fn().mockReturnValue({ eq: unmarkEq }) }));

    const res = await POST(makeRequest(JSON.stringify(event)));
    expect(res.status).toBe(500);
    const json = await res.json() as Record<string, unknown>;
    expect(json.error).toBeDefined();
    expect(unmarkEq).toHaveBeenCalledWith('event_id', event.id);
  });
});
