# Billing (Stripe)

Optional, Cloud Mode only. Billing controls whether a user has Plus — which is what gates sync. With billing disabled, every user is treated as Plus, Stripe routes return `503`, the Plan & Billing tab is hidden and no Stripe variable is required.

## 1. Enable it

```bash
NEXT_PUBLIC_BILLING_ENABLED=true
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PRICE_PLUS_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_PLUS_YEARLY=price_...
```

| Variable | Read by | Notes |
|---|---|---|
| `NEXT_PUBLIC_BILLING_ENABLED` | `src/lib/feature-flags.ts` | Only the literal `true` enables it. |
| `STRIPE_SECRET_KEY` | `src/lib/stripe.ts` | The SDK throws at import time if billing is on and this is unset. |
| `STRIPE_WEBHOOK_SECRET` | `src/app/api/stripe/webhook/route.ts` | Signature verification. |
| `NEXT_PUBLIC_APP_URL` | `src/app/api/stripe/{checkout,portal}/route.ts` | Return URL. Defaults to `http://localhost:3000`. |
| `NEXT_PUBLIC_STRIPE_PRICE_PLUS_MONTHLY`, `_YEARLY` | `src/app/api/stripe/checkout/route.ts` | The checkout route accepts only these two price IDs. If both are missing the allow-list is empty and every checkout fails. |

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` appears in older documentation but is not read by any source file — the client never talks to Stripe directly.

## 2. Stripe dashboard

1. **Products → Add product**: a "Plus" product with two recurring prices — monthly and yearly. Their IDs go into the two `NEXT_PUBLIC_STRIPE_PRICE_*` variables.
2. **Settings → Billing → Customer portal**: enable it, so the "Manage subscription" button works.
3. **Settings → Tax**: enable Stripe Tax if you need to collect VAT.
4. **Developers → Webhooks → Add endpoint**: point it at your deployed webhook URL and subscribe to the events below, then copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

The handler at [`src/app/api/stripe/webhook/route.ts`](../../src/app/api/stripe/webhook/route.ts) handles:

`checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
`customer.subscription.deleted`, `customer.subscription.trial_will_end`, `invoice.paid`, `invoice.payment_failed`.

It is idempotent: processed event IDs are recorded in `stripe_events_processed`, and handler failures in `stripe_events_failed`. Those two tables are created by `20260427000000_subscriptions.sql`. The SDK is pinned to API version `2026-08-26.dahlia` in `src/lib/stripe.ts`; changing it is a deliberate act, not a routine upgrade.

## 3. Local development

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

`stripe listen` prints a signing secret — use the one it prints, not the dashboard's; they differ in test mode.

Card numbers for the Checkout form, including declines and 3D Secure, are in [`docs/testing/stripe-test-cards.md`](../testing/stripe-test-cards.md).

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
```

Promotion codes: a campaign code row can carry a `stripe_promotion_code_id` (added by `20260427000001_campaign_codes_ext.sql`). At registration the app calls the `consume_campaign_code` and `apply_campaign_benefit` RPCs and stashes the promotion code in `localStorage` under `buobu_pending_promo`, which checkout then applies.

## A limitation you will hit

`next.config.ts` sets `output: "export"`, so `src/app/api/stripe/**` is a **dev-only** surface. Those routes validate a request, talk to Stripe and write to Supabase, and none of it exists in a deployed artifact. If you deploy billing, either run the routes on a platform that supports server code or move the work into a Worker — deploying this repository as a static export gives you a checkout button that calls a route which is not there.

## Troubleshooting

**`STRIPE_SECRET_KEY environment variable is not set`.** The SDK throws at import. Check `.env.local` and restart the dev server.

**Webhook signature verification fails.** `stripe listen` is not running, or the secret is the dashboard's rather than the CLI's. It must start with `whsec_`.

**Checkout fails with an invalid price.** `NEXT_PUBLIC_STRIPE_PRICE_PLUS_MONTHLY` and `_YEARLY` are not both set, so the allow-list is empty.

**Plan does not change after checkout.** Check `stripe listen` output, then `stripe_events_failed` for a handler error. The webhook is what writes `subscriptions`; the checkout redirect alone does not.
