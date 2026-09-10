/**
 * Stripe customer helper — get-or-create a Stripe customer for a user.
 * Only called on the first upgrade attempt (never at signup).
 */

import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns the Stripe customer ID for the given user.
 * Creates one in Stripe and persists it to `subscriptions` if not yet present.
 *
 * @param supabaseAdmin - Service-role Supabase client (bypasses RLS).
 * @param stripe        - Initialized Stripe SDK instance.
 * @param userId        - Supabase auth user ID.
 * @param email         - User's email address (used for Stripe customer creation).
 */
export async function getOrCreateStripeCustomer(
  supabaseAdmin: SupabaseClient,
  stripe: Stripe,
  userId: string,
  email: string,
): Promise<string> {
  // 1. Check existing customer ID in our DB.
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = "no rows found" — expected if trigger hasn't run yet.
    throw new Error(`Failed to read subscription: ${error.message}`);
  }

  if (data?.stripe_customer_id) {
    return data.stripe_customer_id;
  }

  // 2. Create in Stripe.
  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  // 3. Persist — upsert in case the trigger-created row exists without a customer ID.
  const { error: upsertError } = await supabaseAdmin
    .from('subscriptions')
    .upsert(
      { user_id: userId, stripe_customer_id: customer.id },
      { onConflict: 'user_id' },
    );

  if (upsertError) {
    throw new Error(`Failed to persist Stripe customer: ${upsertError.message}`);
  }

  return customer.id;
}
