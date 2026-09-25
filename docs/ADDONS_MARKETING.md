# Add-ons and AI Marketing

Status: Pilot-ready source architecture; no live add-on price or Meta credentials are included.

## Add-on model

`lib/addons.js` is the server-owned catalogue. `business_feature_entitlements` stores tenant entitlement state and provenance (`manual` or `stripe`). Browser roles cannot activate features. AI Phone Calls remains `coming_soon` and cannot be activated.

AI Marketing pricing is approved at £19.99/month. If `STRIPE_PRICE_ADDON_AI_MARKETING` is absent or does not resolve to an active GBP monthly recurring Stripe Price, purchase stays unavailable. The browser never supplies a Price ID.

For a recurring base subscription, owner purchase/cancel requests modify the Stripe subscription using the server mapping. Access changes only after the verified webhook synchronises the Stripe subscription items into the tenant entitlement.

Manual Pilot entitlements are not overwritten merely because a Stripe add-on item is absent.

## Marketing workspace

The workspace supports seven content types, Facebook/Instagram/LinkedIn/general targets and four tones. It uses bounded business profile data plus relevant approved Business Knowledge.

Generated output contains main copy, a shorter alternative, CTA, hashtags and missing-information guidance. The user can edit, save, copy, regenerate, reopen history and soft-delete drafts.

Editing resets approval. Only the owner can approve a completed draft for publishing. Admins/members can never silently turn an AI draft into externally approved copy.

## Publishing

See `MARKETING_META_INTEGRATION.md` for the OAuth/token/account/scheduler design.

Facebook Page text publishing is implemented but disabled until live Meta Pilot setup passes. Instagram account discovery is supported for future publishing, but text-only Instagram posts are deliberately blocked until a real media publishing flow exists.

## Operational limits

Marketing generation keeps existing server-side input/output bounds, duplicate/burst protection and per-business hourly/day attempt limits. These protect cost/abuse and are separate from the 10-generation Trial and 100-generation paid billing-period allowances.

Marketing never writes generated claims back into trusted Business Knowledge.

## Approved Pilot Marketing terms

AI Marketing is £19.99/month, explicitly optional with Starter, Pro or Business. The £3.99 paid seven-day Trial includes 10 successful generations with no recurring Marketing subscription. Paid Marketing includes 100 successful generations per Stripe billing period, never a calendar-month reset. Pending reservations prevent concurrent overspending; failed generations release allowance while remaining in short-term abuse counters. Deleting successful drafts does not refund usage.

The server and database require current base-plan access. Marketing item removal revokes access when confirmed by Stripe. Scheduling cancellation of the whole base subscription preserves access while that subscription remains active, until its paid period ends. Active Stripe-managed Marketing rows have no separate expiry; base-period expiry is always enforced. Initial add-on purchases require successful immediate payment. Stripe event-version guards prevent delayed updates from overwriting newer entitlement state.
