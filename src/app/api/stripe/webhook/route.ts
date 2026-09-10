/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events and keeps public.subscriptions in sync.
 *
 * Security:
 *   - Signature verified with STRIPE_WEBHOOK_SECRET before any processing.
 *   - Uses supabaseAdmin (service_role) — never the user-scoped client.
 *   - Idempotent: each event_id is recorded in stripe_events_processed;
 *     replayed events are short-circuited without mutating state.
 *
 * Supported events:
 *   checkout.session.completed
 *   customer.subscription.created
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *   invoice.paid
 *   invoice.payment_failed
 */

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { BILLING_ENABLED } from '@/lib/feature-flags';

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  return secret;
}

/** Mark an event as processed (idempotency). Returns false if already done. */
async function markProcessed(eventId: string, eventType: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from('stripe_events_processed').insert({
    event_id: eventId,
    event_type: eventType,
  });

  if (error) {
    // 23505 = unique_violation → event already processed
    if (error.code === '23505') return false;
    throw new Error(`Failed to mark event processed: ${error.message}`);
  }
  return true;
}

/**
 * Remove the idempotency marker, so Stripe's retry is not mistaken for a replay.
 *
 * The marker is written before the handler runs, which prevents two concurrent
 * deliveries of the same event from both processing it. The cost is that a
 * handler failure leaves it behind: the route returns 500 asking Stripe to
 * retry, the retry finds the marker, and it is acknowledged without ever
 * running. Clearing it on failure restores the retry.
 */
async function unmarkProcessed(eventId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('stripe_events_processed')
    .delete()
    .eq('event_id', eventId);

  if (error) {
    console.error('[webhook] failed to clear idempotency marker:', error);
  }
}

/** Log a handler failure for ops visibility. Non-throwing. */
async function logFailure(
  eventId: string,
  eventType: string,
  err: unknown,
  rawPayload?: string,
): Promise<void> {
  try {
    await supabaseAdmin.from('stripe_events_failed').insert({
      event_id: eventId,
      event_type: eventType,
      error: err instanceof Error ? err.message : String(err),
      raw_payload: rawPayload ? JSON.parse(rawPayload) : null,
    });
  } catch {
    // Best-effort logging — do not throw.
  }
}

/** Resolve user_id from stripe_customer_id via subscriptions table. */
async function getUserIdByCustomer(customerId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();
  return data?.user_id ?? null;
}

// -----------------------------------------------------------------------
// Event handlers
// -----------------------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== 'subscription' || !session.customer || !session.subscription) return;

  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer.id;

  let userId = await getUserIdByCustomer(customerId);

  // Fallback: retrieve user_id from customer metadata (set during customer creation).
  if (!userId) {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return;
    userId = (customer as Stripe.Customer).metadata?.supabase_user_id ?? null;
    if (!userId) return;
  }

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : (session.subscription as Stripe.Subscription).id;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const periodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;
  const trialEnd = (subscription as unknown as { trial_end?: number | null }).trial_end;

  await supabaseAdmin.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: subscription.items.data[0]?.price.id ?? null,
      plan: 'plus',
      status: subscription.status,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_end: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
    },
    { onConflict: 'user_id' },
  );
}

async function handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  const userId = await getUserIdByCustomer(customerId);
  if (!userId) return;

  const isActive = ['active', 'trialing'].includes(subscription.status);
  // billing_cycle_anchor is always present; current_period_end is derived from it in new API versions.
  const periodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;
  const trialEnd = (subscription as unknown as { trial_end?: number | null }).trial_end;

  await supabaseAdmin
    .from('subscriptions')
    .update({
      stripe_subscription_id: subscription.id,
      stripe_price_id: subscription.items.data[0]?.price.id ?? null,
      plan: isActive ? 'plus' : 'free',
      status: subscription.status,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_end: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
    })
    .eq('user_id', userId);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  const userId = await getUserIdByCustomer(customerId);
  if (!userId) return;

  // Downgrade immediately: plan='free', status='canceled'.
  // Cohort discount is removed — but slot stays burned (no decrement of used_slots).
  await supabaseAdmin
    .from('subscriptions')
    .update({
      plan: 'free',
      status: 'canceled',
      cancel_at_period_end: false,
      cohort: 'standard',
      cohort_assigned_at: null,
    })
    .eq('user_id', userId);
}

// Stripe Invoice shape has changed — subscription/customer can be string IDs.
type InvoiceLike = {
  subscription?: string | null;
  customer?: string | null;
};

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const inv = invoice as unknown as InvoiceLike;
  if (!inv.subscription || !inv.customer) return;

  const customerId = inv.customer;
  const userId = await getUserIdByCustomer(customerId);
  if (!userId) return;

  const subscription = await stripe.subscriptions.retrieve(inv.subscription);
  const periodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;

  // Keep plan/status in sync with the refreshed subscription.
  await supabaseAdmin
    .from('subscriptions')
    .update({
      plan: 'plus',
      status: subscription.status,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    })
    .eq('user_id', userId);

  // Cohort slot claim: only on the very first paid invoice.
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('cohort, cohort_assigned_at')
    .eq('user_id', userId)
    .single();

  if (sub?.cohort === 'standard' && !sub.cohort_assigned_at) {
    for (const tier of ['founder', 'early'] as const) {
      const { data: claimed } = await supabaseAdmin.rpc('claim_cohort_slot', { p_tier: tier });
      if (claimed) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ cohort: tier, cohort_assigned_at: new Date().toISOString() })
          .eq('user_id', userId);
        break;
      }
    }
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const inv = invoice as unknown as InvoiceLike;
  if (!inv.customer) return;

  const userId = await getUserIdByCustomer(inv.customer);
  if (!userId) return;

  // Mark past_due; Stripe will retry. Only downgrade on subscription.deleted.
  await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('user_id', userId);
}

// -----------------------------------------------------------------------
// Route handler
// -----------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!BILLING_ENABLED) {
    return NextResponse.json({ error: 'Billing is not enabled' }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, getWebhookSecret());
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 400 },
    );
  }

  // Idempotency check — short-circuit replays.
  let isNew: boolean;
  try {
    isNew = await markProcessed(event.id, event.type);
  } catch (err) {
    console.error('[webhook] markProcessed failed:', err);
    await logFailure(event.id, event.type, err, body);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  if (!isNew) {
    // Already processed — acknowledge without re-processing.
    return NextResponse.json({ received: true, replayed: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.trial_will_end':
        // Stripe fires this ~3 days before trial_end.
        // The subscription row (and trial_end field) is already current from
        // customer.subscription.updated events — no DB mutation needed here.
        // This case exists so the event is acknowledged (not retried) and
        // recorded in stripe_events_processed for observability, and to serve
        // as the hook point for a future email/notification pipeline.
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        // Unhandled event type — acknowledge to avoid Stripe retries.
        break;
    }
  } catch (err) {
    console.error('[webhook] event handler failed:', err);
    await logFailure(event.id, event.type, err, body);
    // Clear the marker first: returning 500 tells Stripe to retry, and without
    // this the retry would be short-circuited as a replay — silently and
    // permanently dropping the paid-state transition.
    await unmarkProcessed(event.id);
    // Return 500 so Stripe retries the event.
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
