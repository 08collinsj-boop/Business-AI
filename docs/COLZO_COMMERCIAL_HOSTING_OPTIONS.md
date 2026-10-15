# Colzo v1 commercial hosting decision - internal, no-cost research

**Status:** OPEN / NOT AUTHORISED TO DEPLOY OR PURCHASE. Owner requires no new charges or paid infrastructure without approval. This document compares only the hosting paths; it does not claim application compatibility, create a service account, change DNS, upload code or authorise public launch.

## Current blocker

The connected Vercel team is on Hobby. Vercel states its **Hobby plan is for non-commercial personal use only**; deploying a customer-facing SaaS for financial gain on that plan would not comply with Vercel's stated policy.

Official sources:
- https://vercel.com/docs/plans/hobby
- https://vercel.com/docs/limits/fair-use-guidelines
- https://vercel.com/legal/terms

## Launch hosting choices

| Path | Up-front cost before approval | Commercial use | Technical implications | Launch risk |
| --- | --- | --- | --- | --- |
| A. Keep Vercel and later approve **Pro** | **Do not purchase now** | Pro supports commercial use | Existing `api/` functions, routing, build and environment model stay closer to tested code. Billing and overage controls need owner review | Lowest engineering migration risk, **owner must approve paid plan** |
| B. Investigate **Netlify Free** | Research / local adapter prototype only, $0 plan | Netlify support confirmed its Free plan can host commercial projects; confirm applicable current terms before launching | Netlify Free advertises a **300 credit monthly hard limit**. Vercel API handlers and webhook/network semantics must be adapted, and every authenticated route retested before moving real users | Potential zero-monthly-price option, but usage cap and migration risk; exhausting credits may interrupt the service |
| C. Investigate **Cloudflare Workers Free** | Research only, no account created | Confirm official terms and intended workload | Free Workers document **100,000 requests/day and 10 ms CPU per request**; Vercel Node APIs, secrets, request streaming, Stripe/webhook handlers, network clients, Supabase libraries and image generation may require a major rewrite | Higher migration and compatibility risk, not a shortcut to launch |

References for B and C:
- https://www.netlify.com/pricing/
- https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/
- https://answers.netlify.com/t/can-we-use-netlify-free-plan-for-commercial-purposes/41545
- https://developers.cloudflare.com/workers/platform/limits/

## Safest engineering recommendation

**Do not move Colzo's backend to a new provider just because its base plan is free.** First finish the correctly configured `Business-AI-Dev` staging acceptance and owner legal onboarding. Keep existing Vercel Hobby previews for non-commercial development only.

If the owner continues to require **£0/month** at first commercial launch, investigate Netlify Free as a separate, isolated compatibility spike (not connected to Production):
1. Inventory the `api/` handlers, Vercel-specific runtime imports, deployment routing, body parsing, cookies and middleware.
2. Port **only** `/api/health` and one read-only authenticated-fixture API first. Prove correct HTTP status/headers, CORS/cookies, error handling and tenant auth guards with no real data.
3. Test Supabase JWT verification, RLS, secure configuration, incident controls and all relevant secret handling **in test mode only**; do not copy Production service-role keys.
4. Confirm supported Stripe TEST-only webhooks, billing entitlements, SMTP/password recovery redirects, log retention and error alarms, plus local encrypted backup/restore procedures.
5. Verify hard credit exhaustion policy, support availability and how to prevent a commercial outage when limits are reached. Do not imply 24/7 SLA on a free tier.
6. Only then select a provider, cost ceiling, customer support plan, data processing terms, rollback route and explicit owner approval.

## Required decision, not yet made

- [ ] Owner chooses approved commercial hosting/provider and any maximum recurring or usage charges.
- [ ] Colzo's supported API handlers are certified on that chosen provider with the same authenticated tests.
- [ ] Secrets and domain/callback URLs are explicitly scoped and independently verified in the selected staging and Production environments.
- [ ] Failure budget/usage alerts, recovery and rollback are verified.
- [ ] Final legal/privacy/suprocessor disclosures include the chosen hosting provider where appropriate.

**Never enable billing/Production or promise uninterrupted commercial service while any of the above is unresolved.**
