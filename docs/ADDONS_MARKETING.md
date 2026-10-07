# Add-ons and AI Marketing

Status: AI Marketing is live in the Pilot. The £19.99/month add-on, Facebook connection/publishing, owner-uploaded photos, automation and scheduling foundations are implemented. Public Meta access for unrelated businesses still depends on Meta approval.

## Add-on model

`lib/addons.js` is the server-owned catalogue. `business_feature_entitlements` stores tenant entitlement state and provenance (`manual` or `stripe`). Browser roles cannot activate features. AI Phone Calls remains `coming_soon` and cannot be activated.

AI Marketing pricing is approved at £19.99/month. If `STRIPE_PRICE_ADDON_AI_MARKETING` is absent or does not resolve to an active GBP monthly recurring Stripe Price, purchase stays unavailable. The browser never supplies a Price ID.

For a recurring base subscription, owner purchase/cancel requests modify the Stripe subscription using the server mapping. Access changes only after the verified webhook synchronises the Stripe subscription items into the tenant entitlement.

Manual Pilot entitlements are not overwritten merely because a Stripe add-on item is absent.

## Marketing workspace

The workspace supports seven content types, Facebook/Instagram/LinkedIn/general targets and four tones. It uses bounded business profile data plus relevant approved Business Knowledge.

Generated output contains main copy, a shorter alternative, CTA, hashtags and missing-information guidance. The user can edit, save, copy, regenerate, reopen history and soft-delete drafts.

Editing resets approval. In approval-required mode, only the owner can approve a completed draft for publishing. Admins/members cannot turn an AI draft into externally approved copy.

Fully automated mode is owner-controlled and protected by the stronger owner/AAL2 path. When deliberately enabled, it can generate, approve and publish within the configured platform and safety limits.

## Publishing

See `MARKETING_META_INTEGRATION.md` for the OAuth/token/account/scheduler design and current live Pilot state.

Facebook Page text and photo publishing are live in the Pilot and have been smoke-tested on the connected Business.AI Page. Native Facebook scheduling is implemented. Instagram account discovery is supported for future publishing, but Instagram publishing remains blocked until a separate media workflow is implemented and certified.

## Operational limits

Business AI defaults automated Marketing to one post per day. Facebook publishing and scheduling have a hard server-side cap of three posts per business per UTC calendar day.

AI draft generation keeps burst and hourly protection, with plan-aware 24-hour limits: Trial 10, Starter 10, Pro 25 and Business 50. These are separate from the 10-generation Trial and 100-generation paid billing-period allowances.

Live AI image generation is also plan-aware over a rolling 24-hour window: Trial 3, Starter 3, Pro 10 and Business 20 image attempts. Simulation does not consume image usage. The server reserves image usage before making a live provider request so repeated regenerations cannot bypass the limit.

Marketing never writes generated claims back into trusted Business Knowledge.

## Approved Pilot Marketing terms

AI Marketing is £19.99/month, explicitly optional with Starter, Pro or Business. The £3.99 paid seven-day Trial includes 10 successful generations with no recurring Marketing subscription. Paid Marketing includes 100 successful generations per Stripe billing period, never a calendar-month reset. Pending reservations prevent concurrent overspending; failed generations release allowance while remaining in short-term abuse counters. Deleting successful drafts does not refund usage.

The server and database require current base-plan access. Marketing item removal revokes access when confirmed by Stripe. Scheduling cancellation of the whole base subscription preserves access while that subscription remains active, until its paid period ends. Active Stripe-managed Marketing rows have no separate expiry; base-period expiry is always enforced. Initial add-on purchases require successful immediate payment. Stripe event-version guards prevent delayed updates from overwriting newer entitlement state.

## Owner-uploaded Marketing photos

Marketing drafts support private owner-uploaded JPG, PNG and WebP photos up to 10 MB. The Create flow exposes `Add photo`, while an existing saved draft exposes `Upload / replace photo`.

The browser uploads directly to the private `marketing-images` Supabase bucket using a short-lived signed upload token, so image bytes do not pass through the public application API.

After upload, Business AI validates the stored file, may create a cautious non-sensitive visual description for copy generation, resets owner approval, and can refresh the existing draft using that photo context plus approved Business Knowledge. Photo context is never treated as a trusted business fact. The owner must review and approve the resulting post again unless a separately authorised fully automated workflow is being used.

Automation also has owner-controlled post-photo and inspiration-photo libraries. Publishable media can be attached to automated Facebook posts; inspiration media is style reference only and is not published directly.

Uploaded photos use the same private signed-preview and Facebook photo-publishing path as generated images. Owners/admins can replace or remove the image before publishing. Owner uploads do not consume the AI-image generation allowance.
