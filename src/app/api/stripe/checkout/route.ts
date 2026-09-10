/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout Session for the authenticated user.
 *
 * Body: { priceId: string, promotionCode?: string }
 * Returns: { url: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getOrCreateStripeCustomer } from '@/lib/subscriptions/stripe-customer';
import { BILLING_ENABLED } from '@/lib/feature-flags';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const ALLOWED_PRICE_IDS = new Set([
  process.env.NEXT_PUBLIC_STRIPE_PRICE_PLUS_MONTHLY,
  process.env.NEXT_PUBLIC_STRIPE_PRICE_PLUS_YEARLY,
].filter(Boolean));

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!BILLING_ENABLED) {
    return NextResponse.json({ error: 'Billing is not enabled' }, { status: 503 });
  }

  // Authenticate via Bearer token from Authorization header.
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let priceId: string;
  let promotionCode: string | undefined;

  try {
    const body = await req.json() as { priceId?: unknown; promotionCode?: unknown };
    priceId = typeof body.priceId === 'string' ? body.priceId : '';
    promotionCode = typeof body.promotionCode === 'string' ? body.promotionCode : undefined;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Validate price ID against known set — prevents checkout with arbitrary prices.
  if (!priceId || !ALLOWED_PRICE_IDS.has(priceId)) {
    return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
  }

  const customerId = await getOrCreateStripeCustomer(
    supabaseAdmin,
    stripe,
    user.id,
    user.email ?? '',
  );

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/account?upgrade=success`,
    cancel_url: `${APP_URL}/account?upgrade=cancel`,
    payment_method_collection: 'always', // card required even for trials
    allow_promotion_codes: !promotionCode, // allow user to type code at checkout
    discounts: promotionCode ? [{ promotion_code: promotionCode }] : undefined,
    subscription_data: { trial_period_days: 7 },
    metadata: { supabase_user_id: user.id },
  });

  return NextResponse.json({ url: session.url });
}
