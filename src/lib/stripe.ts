/**
 * Shared Stripe SDK singleton.
 * Import this in server-only route handlers — never in client components.
 */

import Stripe from 'stripe';
import { BILLING_ENABLED } from './feature-flags';

if (BILLING_ENABLED && !process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set');
}

/**
 * Stripe SDK instance. Only initialised when BILLING_ENABLED is true.
 * API routes guard against billing being disabled with an early 503 before
 * any stripe method is called, so the null cast is safe at runtime.
 */
export const stripe = BILLING_ENABLED
  ? new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-08-26.dahlia',
      typescript: true,
    })
  : (null as unknown as Stripe);
