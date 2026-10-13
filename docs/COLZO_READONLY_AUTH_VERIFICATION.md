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

## Work and quotes stage (13 October 2026)

The browser-approved read-only Colzo preview now extends beyond enquiries:

- **Bookings**: a fixed, authenticated GET to the original `/api/bookings`, limited to `id`, linked lead ID, title, customer display name, status, start and end times. No phone/email, notes, business IDs, or mutations are returned.
- **Actions**: a fixed, authenticated GET to `/api/actions`, limited to id, linked lead, title, status, priority, type and due date. The original app determines the authenticated business membership.
- **Home and Projects**: presents real upcoming bookings and outstanding actions, labelled as such. Colzo Projects is **not** yet sourced from a validated project API, and revenue is **not** represented as actual income.
- **Clients**: an enquiry-contacts view deduplicated from the already-authorised enquiry names. This is **not** a dedicated CRM contact list and cannot add or edit customer records.
- **Quotes**: an in-memory draft text composer using an authorised enquiry, a human-supplied GBP amount and job notes. The user can explicitly copy the draft to their device. **No draft is stored in the database, emailed, sent for acceptance or billed**; quote terms, VAT and business identity require review.
- On API failure, affected sections show an unavailable state, not a fabricated zero or status. Login remains valid when optional bookings/actions requests fail.
- Ending verification clears the in-memory token, enquiries, bookings, actions, quote output and UI. No additional session persistence is enabled.

The dedicated server-side Projects/Clients/Quotes development handlers exist in the feature branch but have **not** been enabled against the live owner database; they still require a verified backup, staged environment and role-based browser acceptance. No cross-tenant live data was written.

## Mobile screenshot acceptance: navigation and Projects (13 October 2026)

The owner supplied additional iPhone screenshots showing fixed bottom navigation covering the last enquiry row, lower Settings entries, scheduled bookings and Home quick actions. An earlier CSS padding-only adjustment did not solve the overlay at the viewport level.

Latest development-only layout changes:

- Switched the authenticated preview to a full-viewport flex shell with non-scrolling header and **real non-overlapping footer dock**. Only the central `.colzo-explore-body` scrolls independently. The navigation is a flex sibling rather than a `position: fixed` overlay.
- Tab changes now reset the inner scroller, so the browser page does not jump underneath the host app's top controls.
- Reduced chart, Home metric and quick-action heights, and tightened Settings spacing while retaining minimum touch sizes.
- Placed true owner-authorised bookings/actions at the top of the Projects view, with the unconnected native Colzo Projects notice below the useful data. Removed inert All / Active / Completed project tabs to avoid implying unsupported filters.
- Added static layout and semantic regression checks. **656/656 tests passed locally**, including read-only source restrictions. Actual iOS in-app browser screenshot acceptance remains required; automated source tests alone cannot guarantee perfect visual layout on the user's phone.

No new live database connections, migrations, customer writes, account changes or customer emails were made for this adjustment.

## Safer refresh and unattended browser QA (13 October 2026)

- The owner can explicitly refresh enquiries, bookings and actions with a read-only button in the Colzo header. Nothing is posted to live business APIs.
- Refreshed data is accepted only if the in-memory authentication token and verification generation are still current. Ending verification increments the generation, clears local data and quote text, disables the refresh control and locally signs out of the ephemeral Supabase session.
- Read failures retain previously loaded records and show a notice instead of inventing empty results. An unauthorised enquiry response asks the owner to end verification and sign in again.
- Local Chromium/Playwright browser QA now covers 375×812, 390×844, 430×932, 1366×768 and 1440×900 using intercepted fake authentication/records. Tests include quote creation, Settings routes, navigation geometry, a manual data refresh and a deliberately delayed refresh that finishes after exit, verifying the screen remains cleared. All five viewports passed. See `docs/COLZO_BROWSER_QA.md`.
- This test is **not** a live-authentication acceptance certificate: the original customer's data was not used in the browser fixtures, and the protected Vercel preview remains a separate acceptance requirement.
