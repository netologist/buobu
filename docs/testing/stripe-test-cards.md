# Stripe Test Cards

Card numbers to type into Stripe Checkout while testing the Plus subscription locally. Every number here is Stripe's; the authoritative list, including non-card payment methods and per-country cards, is <https://docs.stripe.com/testing>.

## Before you start

- Use **test keys** — `STRIPE_SECRET_KEY` starting `sk_test_`. A live key with a test card fails, and Stripe's terms prohibit testing in live mode with real card details.
- Billing has to be on: `NEXT_PUBLIC_BILLING_ENABLED=true`, otherwise the checkout route answers `503` and the Plan & Billing tab is hidden.
- `stripe listen --forward-to localhost:3000/api/stripe/webhook` must be running. The checkout redirect alone does not change a plan — the webhook writes `subscriptions`. See [`../setup/billing.md`](../setup/billing.md).
- The app uses **Stripe-hosted Checkout**, so the card is entered on Stripe's page, not inside buobu. The app only creates the session and consumes the webhook.

## Values to use

Any card below works with:

| Field | Value |
|---|---|
| Expiry date | any future date, e.g. `12/34` |
| CVC | any 3 digits — 4 for American Express |
| Name | any value, e.g. `Test User` |
| Postal code | any valid code for the card's country, e.g. `12345` |

## Scenarios

| Scenario | Card number | Behaviour |
|---|---|---|
| Successful payment | `4242 4242 4242 4242` | Visa, charges immediately |
| 3D Secure — always authenticate | `4000 0027 6000 3184` | Authentication required on every transaction, however the card is set up |
| 3D Secure — unless set up | `4000 0025 0000 3155` | On-session payments always require authentication; off-session payments do too until the card is set up for reuse |
| 3D Secure — required, succeeds | `4000 0000 0000 3220` | Radar requests 3DS; the payment succeeds once authentication completes |
| Insufficient funds | `4000 0000 0000 9995` | Declined, `insufficient_funds` |
| Generic decline | `4000 0000 0000 0002` | Declined, `generic_decline` |
| Blocked as fraudulent | `4100 0000 0000 0019` | Radar always blocks it; risk level "highest" |
| Highest risk | `4000 0000 0000 4954` | Risk level "highest" |
| Expired card | `4000 0000 0000 0069` | Always returns `expired_card`, whatever date you enter |
| Incorrect CVC | `4000 0000 0000 0127` | `incorrect_cvc` |
| Incorrect number | `4242 4242 4242 4241` | `incorrect_number` |
| Lost card | `4000 0000 0000 9987` | `lost_card` |
| Stolen card | `4000 0000 0000 9979` | `stolen_card` |
| Processing error | `4000 0000 0000 0119` | `processing_error` |
| Velocity limit exceeded | `4000 0000 0000 6975` | `card_velocity_exceeded` |

## Successful payments by brand

| Brand | Number | CVC |
|---|---|---|
| Visa | `4242 4242 4242 4242` | any 3 digits |
| Visa (debit) | `4000 0566 5566 5556` | any 3 digits |
| Mastercard | `5555 5555 5555 4444` | any 3 digits |
| Mastercard (2-series) | `2223 0031 2200 3222` | any 3 digits |
| Mastercard (debit) | `5200 8282 8282 8210` | any 3 digits |
| American Express | `3782 8224 6310 005` | any 4 digits |
| Discover | `6011 1111 1111 1117` | any 3 digits |
| Diners Club | `3056 9300 0902 0004` | any 3 digits |
| JCB | `3566 0020 2036 0505` | any 3 digits |
| UnionPay | `6200 0000 0000 0005` | any 3 digits |

Regional cards exist for most countries — United Kingdom `4000 0082 6000 0000`, Germany `4000 0027 6000 0016`, France `4000 0025 0000 0003`, and so on. See the source list.

## A worked example

```
Card number : 4242 4242 4242 4242
Expiry date : 12/34
CVC         : 123
Name        : Test User
Postal code : 12345
```

Checkout completes, Stripe fires `checkout.session.completed`, the webhook writes the `subscriptions` row, and the entitlements store picks it up — the Plan & Billing tab should switch to Plus and sync should ungate.

## Testing the webhook without the browser

Faster than filling in a checkout form, and it needs no card at all:

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
stripe events list --limit 10
```

The handler is at [`src/app/api/stripe/webhook/route.ts`](../../src/app/api/stripe/webhook/route.ts) and also handles `customer.subscription.created`, `customer.subscription.updated` and `customer.subscription.trial_will_end`.

## Where this does not apply

The routes under `src/app/api/stripe/**` are a **dev-only** surface. `next.config.ts` sets `output: "export"`, so a deployed artifact has no server and no webhook endpoint — a real deployment has to host that work elsewhere. See [`../setup/billing.md`](../setup/billing.md).

## Source

<https://docs.stripe.com/testing> — Stripe owns this list and changes it. When a number here stops behaving as described, that page is the authority.
