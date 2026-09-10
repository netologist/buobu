/**
 * POST /api/stripe/portal
 *
 * Creates a Stripe Customer Portal session for the authenticated user.
 * The portal allows plan management, payment method updates, invoice history, etc.
 *
 * Returns: { url: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { BILLING_ENABLED } from '@/lib/feature-flags';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

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

  // Fetch Stripe customer ID.
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No active subscription found' },
      { status: 404 },
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${APP_URL}/account`,
  });

  return NextResponse.json({ url: session.url });
}
