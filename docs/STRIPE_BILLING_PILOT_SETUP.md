# Stripe billing: Pilot/Test setup

Applies only to `business-ai-pilot` + Business-AI-Dev. Production must remain unchanged.

## Base Prices in Stripe Test mode

| Plan | Price | Stripe type | AI enquiries |
| --- | ---: | --- | ---: |
| 7-day Trial | £3.99 | one-time | 100 |
| Starter | £29/month | recurring | 250 |
| Pro | £69/month | recurring | 1,000 |
| Business | £149/month | recurring | 3,000 |

The Trial never silently converts into a subscription.

## AI Marketing add-on

The approved price is £19.99/month. Create or identify the matching active GBP monthly recurring Stripe Test Price and configure only:

`STRIPE_PRICE_ADDON_AI_MARKETING=price_...`

Checkout can then include the base recurring plan plus this server-owned add-on Price. Existing recurring customers use Stripe subscription items for add/remove. Verified webhooks are the authority that activates/deactivates the tenant entitlement.

## Pilot server variables

Use the variable inventory in `.env.example`. Stripe secrets and Price IDs are server-only.

Webhook endpoint:

`https://business-ai-pilot.vercel.app/api/stripe-webhook`

Minimum events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

The endpoint verifies the original signed body, records each event ID for idempotency, maps Stripe customer/subscription references to the tenant and rejects metadata conflicts. Subscription state updates carry Stripe event creation time so older events cannot overwrite newer billing state.

## Required Test-mode checks

- trial purchase and duplicate-trial refusal;
- Starter/Pro/Business checkout;
- renewal and period reset;
- portal/cancel-at-period-end;
- past_due/payment failure and entitlement denial;
- repeated webhook event;
- deliberately out-of-order subscription events;
- subscription containing a base-plan item plus Marketing item still resolves the correct base plan;
- ambiguous/multiple base-plan items fail closed;
- Marketing purchase/cancel activates/deactivates only after verified webhook;
- another tenant's metadata/reference combination is rejected;
- expiry/failure never deletes the business's stored leads/data.

Keep `BILLING_ENABLED` false until the Pilot migration/configuration is ready, then enable only on the isolated Pilot.

## Approved Pilot Marketing terms

AI Marketing is £19.99/month, explicitly optional with Starter, Pro or Business. The £3.99 paid seven-day Trial includes 10 successful generations with no recurring Marketing subscription. Paid Marketing includes 100 successful generations per Stripe billing period, never a calendar-month reset. Pending reservations prevent concurrent overspending; failed generations release allowance while remaining in short-term abuse counters. Deleting successful drafts does not refund usage.

The server and database require current base-plan access. Marketing item removal revokes access when confirmed by Stripe. Scheduling cancellation of the whole base subscription preserves access while that subscription remains active, until its paid period ends. Active Stripe-managed Marketing rows have no separate expiry; base-period expiry is always enforced. Initial add-on purchases require successful immediate payment. Stripe event-version guards prevent delayed updates from overwriting newer entitlement state.
