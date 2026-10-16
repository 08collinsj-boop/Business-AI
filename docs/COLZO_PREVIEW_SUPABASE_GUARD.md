# Colzo isolated Preview Supabase guard

This safeguard is deliberately **opt-in**. It prevents a Colzo integration preview from looking ready for account creation while its API is connected to an unexpected Supabase database.

## Branch-only configuration

In Vercel, add the following **non-secret** environment variable with:
- Target: **Preview only**
- Git branch: `integration/colzo-v1-prelaunch-20261015`
- Key: `COLZO_EXPECTED_SUPABASE_PROJECT_REF`
- Value: `mvwseobgkexzpmmkgcxe`

Do not add it to shared Preview, Production, or unrelated Pilot branches. No new infrastructure, paid plans or production changes are needed.

The standard development Supabase variables must also be available **in exactly that branch scope** for the application to become functional:
`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
Those values are sensitive; only an authorised operator or dedicated secrets workflow should provision them. **Never** paste secrets into GitHub, chat, source files, documentation or screenshots. Never copy Production keys into a Preview.

## Vercel application timing

Branch-scoped environment variables only apply to deployments **created after** the variable is saved. An already-READY Preview cannot be used to judge whether the guard works. Create a fresh deployment of this isolated integration branch, verify the exact commit and check that its public auth config rejects the known mismatched project with HTTP 503. Do not submit any real user sign-up or enquiry to the mismatched preview.

## Behaviour

- When the optional environment variable is absent, existing Pilot/Production behaviour remains unchanged.
- When present, the public Auth config endpoint checks the exact HTTPS origin `https://<expected-ref>.supabase.co/`. A mismatch causes HTTP 503 and does not reveal any browser key.
- Direct public POST `/api/enquiry` also returns HTTP 503 instead of accepting a customer message into the wrong environment. The original `lib/auth.js` remains byte-for-byte unchanged by design.
- This is a **defence-in-depth staging preflight**, not a substitute for verifying every API route or tenant authorization. Never treat it as proof that a new user can safely register until end-to-end acceptance is complete.

## Acceptance steps

1. Check the expected-ref variable is scoped to exactly the integration Preview branch. No unintentional changes to existing environments.
2. Redeploy **only the integration Preview** after the change. Deployment READY by itself proves nothing.
3. While the branch still points at the wrong DB, verify `GET /api/public-config` returns 503. Do not sign in, register, or submit enquiries.
4. Once the three approved **Business-AI-Dev** variables have been provisioned by an authorised secret-safe workflow, redeploy and verify `/api/public-config` returns HTTP 200 with the correct Dev Supabase URL.
5. Confirm `/api/health`, anonymous-protected API 401, owner-created business, email confirmation, MFA, and public enquiry/booking workflow using synthetic data only.
6. Re-run `npm run verify`, all 12 synthetic browser scripts and exact-SHA GitHub CI before considering a commercial launch.

**Do not remove this guard simply to make login work**, and do not expose service-role credentials to the browser.
