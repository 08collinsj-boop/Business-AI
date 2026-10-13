# Colzo — gradual replacement on the existing Business AI backend

**Decision:** Keep the public brand **Colzo**, keep all active Business AI backend services, and do not provision a new database/project or incur an additional charge. This document covers release preparation only; the live application has **not** been replaced by these source changes.

## Live environment / rollback baseline verified (13 October 2026)

- The live owner app (`app.getbusiness-ai.com`) runs on the existing Vercel project `business-ai-pilot` (`prj_GRPhAzaJnjlNv5KcQ16LhwdOX0kF`). Recorded READY production deployment: `dpl_6aTd232EYYZDRH1y3ypZuwaE97xS`, commit `91b0d6efc9c68d8067e40bd1716aaa654237e226`. Validate this baseline again immediately before any release; don't assume an earlier deployment is still production.
- The live app uses the existing Supabase project `mvwseobgkexzpmmkgcxe`, which holds original accounts and records despite the display name `Business-AI-Dev`. **Never treat it as disposable.**
- The live Pilot Vercel project's authentication and database variables (`FRONTEND_AUTH_ENABLED`, `TENANCY_AUTH_ENABLED`, `SUPABASE_URL`, publishable and service-role keys) are scoped **only to Production** in the existing project. A non-production preview does **not** have equivalent credentials.
- Colzo's separate `business-ai` Vercel preview project uses a different Supabase authentication environment. That does not mean owner data has been deleted. A separate, read-only Colzo verification page has already demonstrated that the original owner's account authenticates and can read its own enquiries.
- Existing `colzo_projects`, `colzo_clients`, and `colzo_quotes` tables were confirmed present with RLS enabled on the original Supabase project, but actual production-grade editing has **not** been certified.

## How one backend works

The redesigned frontend in `index.html` and `assets/colzo-workspace.js` makes same-origin requests to **existing application APIs**. Those APIs still use the existing Vercel environment configuration, Supabase Auth, business memberships, tenant-scoped records, AI/knowledge, scheduling, marketing and Stripe. There is no second Colzo customer/account datastore to merge and no transfer of passwords or customer records.

- **Colzo Home and Enquiries** → existing `/api/leads`, booking/action loader and reporting routes.
- **Bookings / Calendar and Actions** → existing authenticated booking/action screens and APIs; not a new booking system.
- **AI receptionist and Business Knowledge** → existing assistant, handover, business settings and approved fact workflows.
- **Marketing** → existing `/api/marketing` plus its publication, schedule, integration, automation and approval routes, with current entitlements and controls unchanged.
- **Billing** → existing Stripe-connected `/api/billing` and subscription/account views; no new price or billing event initiated by the rebrand.
- **Colzo Projects, Clients and Quotes** → tenant-scoped `/api/colzo/projects`, `/api/colzo/clients`, `/api/colzo/quotes`, using existing business membership and lead references. They are not live-write certified yet.
- **Customer portal, referrals, privacy, legal and security** → retain original APIs, permissions and screens until their Colzo equivalents are fully tested.

The **More → Your existing business tools** panel provides immediate navigation to AI receptionist, Bookings, Actions, Marketing, Knowledge and Billing without cloning services. Opening advanced settings now expands collapsed panels, opens the Settings view and rejects unavailable/role-hidden content rather than appearing to do nothing.

## Safe release stages and stop conditions

1. **Development only (COMPLETE for current code):** original backend routes preserved; Colzo navigation/owner forms regression tests run with mocked local API/browser fixtures; no external network requests or customer writes. `npm run verify`, `npm run verify:colzo-browser`, `npm run verify:colzo-owner`, `npm run verify:colzo-backend-nav`, `npm run verify:colzo-sql` (optional Playwright/PGlite packages installed locally only).
2. **No-cost staging if available:** use only an already authorised, isolated test tenant and staging environment, not a new paid Supabase branch or database. The `business-ai-pilot` project's current preview environment lacks the production auth configuration; don't copy production secrets into publicly accessible test environments or point a disposable test app at live data.
3. **Backup gate:** independently verify an existing recoverable database backup and test a restore somewhere isolated before enabling new write workflows. If this cannot be completed without extra cost, **pause live-edit release** instead of charging the user or assuming backups exist.
4. **Authentication and tenant gate:** test original owner and a non-owner/staff role with authenticated real backend responses; check tenant cross-access, MFA/AAL2, missing membership, legal/DPA gates, Customer Portal, AI/marketing/billing entitlements. Do not create new customer accounts or run destructive trials against real records.
5. **Controlled brand-only or dual-interface cutover:** deploy only an explicitly reviewed frontend revision to the **existing** `business-ai-pilot` Vercel project; keep existing APIs and domain aliases unchanged. Verify all owner features and customer enquiry flows immediately. Do not deploy the entire development branch just because the standalone Colzo preview is READY.
6. **Reversible production release:** record the exact active deployment ID, rollback SHA, environment settings and sign-off before a controlled promotion. On any auth, enquiry, legal or billing regression, restore the previous deployment and validate the original app. No account/database resets or rollback migrations without a reviewed recovery plan.

## Current release status

**NOT YET APPROVED FOR PRODUCTION REPLACEMENT.** Backend sharing is implemented in the source architecture and the new navigation; controlled production auth/write QA and backup remain outstanding. The isolated Colzo read-only preview is a verification tool, **not** a replacement for full Business AI.

## 13 October 2026 — same-project candidate preview and release gate

A preview of Colzo SHA `571606a1649cf8add0f68677779edcdab54a254c` was built **inside the original** `business-ai-pilot` Vercel project, READY (deployment `dpl_B9CzwEzyBNkmgC3go2BVirYcA1zb`) without changing the live alias. The environment is not auth-equivalent to Production: `/api/health` returns 503, `/api/public-config` returns 404, while live returns 200 for both. Therefore the preflight remains **BLOCKED**, and the live deployment was preserved. See `docs/COLZO_PRODUCTION_CUTOVER_20261013.md` and the GET-only `npm run verify:colzo-release-gate` command.
