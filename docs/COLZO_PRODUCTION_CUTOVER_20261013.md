# Colzo → Existing Business AI Production: blocked preflight

**Current decision: HOLD PRODUCTION.** User authorised progressing the Colzo frontend cutover on existing resources and explicitly prohibited any extra charge. No subscription, hosted database branch, production promotion, DNS change, live migration, customer edit, account reset or paid service was initiated.

## Actual deployment evidence

- **Live domain:** `https://app.getbusiness-ai.com`, Vercel project `business-ai-pilot` (`prj_GRPhAzaJnjlNv5KcQ16LhwdOX0kF`). Recorded active READY deployment: `dpl_6aTd232EYYZDRH1y3ypZuwaE97xS`; SHA `91b0d6efc9c68d8067e40bd1716aaa654237e226`, branch `pilot-free-starter-marketing-20261010`.
- **Colzo same-project release candidate:** `https://business-ai-pilot-ibbljrs4k-buisness-ai1.vercel.app` (preview deployment `dpl_B9CzwEzyBNkmgC3go2BVirYcA1zb`, READY, SHA `571606a1649cf8add0f68677779edcdab54a254c`, branch `feature/post-pilot-customer-experience-20261012`). The URL is a preview on the **existing** Vercel project; it was NOT promoted to production.
- Live project currently has 46 environment variables, including production-scoped `FRONTEND_AUTH_ENABLED`, `TENANCY_AUTH_ENABLED`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. Preview is not guaranteed production-equivalent and must not be given a live service-role key to make tests pass.
- Live account/customer backend: Supabase `mvwseobgkexzpmmkgcxe`, active/healthy. Despite the project display name `Business-AI-Dev`, it holds real Business AI user and customer data and is **NOT disposable**. No backup restoration has been verified.

## Live vs preview HTTP results (non-authenticated GET only)

| Non-mutating check | Original live app | Colzo same-project preview |
|---|---|---|
| `/` serves HTML | 200 | 200 |
| `/api/health` | 200, `ok` | **503, unavailable** |
| `/api/public-config` | 200, frontend auth config exists | **404, config unavailable** |
| `/api/colzo/projects` unauthenticated | 404, route not yet deployed | 403, access denied as expected |
| `/api/colzo/clients` unauthenticated | 404 | 403, access denied as expected |
| `/colzo/read-only` | 404 | 200 (preview-only verification) |

The `503` health response in preview is consistent with **missing preview environment configuration**; it is not proof that the new code would fail in Production, but it **prevents certification of original-account login, business membership and tenant-safe authenticated behaviour prior to promotion**. Production credentials must not be copied blindly to the preview.

## Release gate implemented

`npm run verify:colzo-release-gate -- --candidate https://business-ai-pilot-ibbljrs4k-buisness-ai1.vercel.app`

This is a strictly **GET-only**, allowlisted origin check. It verifies both HTML, health, browser-safe public auth configuration, unauthenticated project API isolation, Colzo UI presence and identical original Supabase Auth project **without logging public keys or user/customer details**.

**Gate result: BLOCKED** (candidate health, candidate auth configuration and same Supabase Auth project not verifiable). The old live release legitimately has no Colzo Projects route (404) and is not falsely marked unsafe for that reason.

## Remaining cutover conditions

1. **No-cost, isolated authentication QA** against the actual production-equivalent same-origin routing and intended tenant membership, with no production service-role secret exposed to a preview. If this cannot be established without a paid service, do not pay automatically.
2. **Verify an already-existing restorable database backup or non-production recovery mechanism**, and verify that it works; Vercel code rollback alone cannot undo database mutations. No backup, restore or database reset operation has been attempted.
3. Validate owner/staff role boundaries, AI receptionist, bookings, enquiries, marketing and billing read paths; verify new Projects/Clients/Quotes functionality separately before enabling any live writes.
4. Recheck live alias, production SHA, exact deployment ID, production env and rollback availability immediately before any promotion. A Vercel rollback capability is exposed through `request_rollback`, but its success has **not** been tested against the live application and must not be treated as a certified rollback until verified.
5. Once all above pass, promote only an explicitly reviewed frontend-safe release candidate on the **existing** Vercel project, monitor health/auth/customer entry flows and promptly roll back on a regression.

**No automatic production promotion while any essential preflight fails.** Do not create a new paid Supabase branch/project, alter billing, or reset existing accounts.
