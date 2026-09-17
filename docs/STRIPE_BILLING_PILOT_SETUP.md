# Stripe billing: Pilot/Test setup

This guide applies only to the isolated `business-ai-pilot` Vercel project and
Business-AI-Dev (`mvwseobgkexzpmmkgcxe`). It must not be copied to the existing
Business AI Production project.

## Prices in Stripe Sandbox

Create these four Prices in Stripe **Test mode**:

| Plan | Price | Type |
| --- | --- | --- |
| Trial | £3.99 | one-time |
| Starter | £29 | recurring monthly |
| Pro | £69 | recurring monthly |
| Business | £149 | recurring monthly |

The trial is a one-time payment. Do not configure it as a recurring Price or
with an automatic subscription conversion.

## Pilot-only Vercel variables

Add these only to the `business-ai-pilot` project environment used for the
isolated Pilot. Values are server-only except none are browser public:

```
BILLING_ENABLED=true
STRIPE_SECRET_KEY=...             # Stripe Test secret key
STRIPE_WEBHOOK_SECRET=...         # Stripe Test webhook signing secret
STRIPE_PRICE_TRIAL=price_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...
BILLING_APP_URL=https://business-ai-pilot.vercel.app
```

Do not use `NEXT_PUBLIC_` names. Never put these values in source, browser
configuration, browser logs, or this document.

## Stripe Test webhook

Create an endpoint in Stripe Test mode at:

```
https://business-ai-pilot.vercel.app/api/stripe-webhook
```

Subscribe at minimum to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Configure Stripe's Customer Portal in Test mode before exposing **Manage
billing**. The application verifies the signature before using the event and
keeps a database idempotency record for each Stripe event id.

## Controlled test sequence

1. Confirm both billing migrations are applied to Business-AI-Dev only.
2. Redeploy only `business-ai-pilot` after configuring its Test variables.
3. As a test business owner, choose Trial and complete Test Checkout.
4. Confirm the webhook activates one seven-day trial with 100 enquiries and
   one total business seat.
5. Confirm a second trial checkout is refused for that business.
6. Test each recurring plan with Stripe Test cards, failed payment, portal
   cancellation, webhook replay, and usage exhaustion.
7. Confirm existing leads/data remain present after expiry or failed payment.

`BILLING_ENABLED` must remain absent or not exactly `true` until all of the
above pass. Production billing remains disabled.
