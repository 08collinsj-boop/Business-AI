# Colzo — controlled verification of original owner authentication

**Status:** Development-only compatibility probe, never a production replacement.

## Verified facts

- The original application `https://app.getbusiness-ai.com` uses Supabase project `mvwseobgkexzpmmkgcxe` (despite the name `Business-AI-Dev`). Its current public `/api/public-config` returns that URL.
- A read-only query of that project confirmed 13 Auth users, 13 memberships, 13 businesses and 6 enquiries across all tenants. The owner account shown in the user's screenshot exists and has an Owner membership. No password or email needs to be placed in a test fixture.
- The Colzo preview's diagnostic correctly reported **different authentication project**. This explains why the original sign-in cannot work against the preview's separate Auth project.
- The original `/api/leads` returned **401** both without a bearer token and with a forged bearer token. This was checked without writing data.
- No Supabase development branches were listed on the live project. Its backup status could not be verified using the available integration; this remains a release blocker.
- The old live Vercel production deployment and Git commit remain pinned to the original Pilot. The separate Colzo feature branch is not deployed to the live app.

## What this verification page does

Go to `/colzo/read-only` on the latest Colzo **preview**. It is a separate, opt-in test page, not a replacement for the main Colzo login.

1. Obtain the public Supabase Auth URL and public publishable key by fetching the original application's public configuration through a fixed endpoint. Fail closed if the Auth hostname differs from the previously verified original.
2. Prompt the user to sign in manually to their original Auth project. Password is provided only inside the browser to Supabase Auth; the compatibility endpoint never receives it.
3. Hold the Auth session token only in memory (`persistSession:false`, no local or session storage, no auto refresh).
4. Make a single, authenticated GET request to the read-only compatibility endpoint to retrieve the user's enquiries. The server forwards the user's bearer token via GET to the fixed original `/api/leads` endpoint; the **original** app verifies the token and uses membership-scoped data access.
5. Return only minimal display fields (`id`, `name`, `job_type`, `status`, `created_at`) and omit email, phone, address, description and business identifiers. No POST/PATCH/DELETE is supported.
6. Hide the session from UI when the user ends the check. Closing/reloading the page clears the in-memory Supabase session. Signing in creates an ordinary Auth session, which is a normal sign-in operation, not a data edit.

## Safeguards

- Fixed HTTPS origin, fixed allowlisted paths, redirects blocked, request timeout and no caching.
- Reject missing or malformed bearer tokens, reject unauthorised responses, no service-role credentials in the preview, and no external arbitrary target.
- Disabled unless `VERCEL_ENV=preview`; deployment to Production returns 404 for the API.
- Public compatibility `config` is the same **public** Auth config the original site already serves; customer enquiries require a user bearer token.
- No customer account creation, no password reset, no billing action, no automatic emails, no live data migration.
- Source regression tests and preview build readiness are not equivalent to successful end-to-end authenticated testing. The user must sign in manually and report the result.

## Next release gates

- Confirm a restorable backup of the existing active Supabase project and a rollback candidate before reconfiguring Colzo or deploying to the live domain.
- Verify the browser can sign in to the original project and view only the intended business's authorised enquiries; do not assume an existing login automatically validates every Colzo API route.
- Once that succeeds, design a production-grade Colzo app migration that preserves all existing business data and workflows, and test it on isolated infrastructure before changing live integrations or domains.
