# Colzo backend acceptance — 19 October 2026

## Verified baseline and scope

Remote branch `feature/colzo-complete-ui-motion-20261017`, draft PR #26, base `526c9a133c2ee9b7fb37254059e7846180f49e85`. Its READY app Preview is https://business-ds1mstq74-buisness-ai1.vercel.app/. Repository baseline: `npm run verify` completed with **846 passing tests, zero failures**.

An isolated local worktree preserves the earlier unrelated timeout experiment. Changes are limited to Actions/Bookings, their regression coverage and this handoff; the approved UI and immutable legacy modules are unchanged.

## Fix group 1: IDs and save confirmations

- Actions rejects unsafe numeric action, enquiry and booking IDs on GET, POST and PATCH before business-data operations. GET checks all ID filters before related lookups and applies a tenant-scoped action ID filter.
- Actions and Bookings POST require exactly one returned record with a valid safe ID and the authenticated business ID before returning 201.
- PATCH additionally requires the expected record ID. An empty update returns 409; malformed, missing or inconsistent confirmations fail safely with 500.
- Unconfirmed writes emit no success history, audit event or booking-completion review action, and are never automatically retried. A database write may have committed despite an unconfirmed response: reload before deciding whether to submit again.
- Existing tenant predicates remain intact. This change does not add optimistic concurrency tokens to Actions/Bookings; concurrent overwrites still need separate investigation.

Regression evidence: before correction, 38 of the first 42 new cases failed. Final focused set: **53 passed, zero failed**. Full `npm run verify`: **890 passed, zero failed**; 254 JavaScript files checked. Includes build and historical release safeguards. All write tests use mocked fetch responses and synthetic identities, not the Dev database. No tests were removed or weakened.

## Fix group 2: Marketing confirmations and tenant acceptance

Marketing edit, owner approval and soft deletion previously returned locally fabricated success after `return=minimal` writes. New regressions reproduced the defect (15/15 initial cases failed; a second test caught unchanged saved states). These three paths now request `return=representation`, enforce exactly one matching record/business, verify the saved fields (timestamp comparisons allow equivalent database formatting), and return the saved state. Empty matches return 409; missing/mismatched states return 503. Success audit entries occur only after confirmation. Queries retain business/record scope and exclude soft-deleted drafts. Approval roles, preview fingerprints and paid-provider behaviour are unchanged. This does not fix or certify the separate provider generation completion path or concurrent edits.

Two positive-path historical mocks were updated to return persisted representations instead of HTTP204/unchanged pre-write data. Existing assertions remain. New Marketing cases: **18 passed**; focused Marketing suites: **44 passed**.

New two-business Actions/Bookings matrix: **27 passed**. Independent synthetic sessions are resolved through the existing Auth and membership lookups; collections and updates retain tenant predicates, foreign IDs and enquiry/booking links fail safely, forged body business IDs fail, and missing/expired authentication prevents business data access. Owner/admin/member own-tenant writes preserve the existing policy. These tests do not prove physical database RLS or a real second-account session.

Final `npm run verify` completed successfully: **935 tests passed, 0 failed/skipped/cancelled**, React build and **256 JavaScript files** checked. `git diff --check` passed. All new application write tests used mocks; no paid provider calls or database writes.

## Current read-only Dev security evidence

Provider checks on 19 October confirm eight INFO `rls_enabled_no_policy` findings and one WARN leaked-password protection finding. The three Colzo record tables have RLS enabled, zero policies and no anon/authenticated SELECT or authenticated write grants: the server-only design is intentional, not a reason to add permissive policies. Actions, Bookings, Enquiries, Knowledge items and Marketing generations have RLS SELECT policies using an actual membership business/user match; Marketing also requires an active entitlement. All eight inspected tables deny anonymous SELECT and authenticated direct writes. This is a bounded metadata check, not live two-user isolation certification.

Database SSL enforcement remains **false**. IPv4/IPv6 allowlists remain **0.0.0.0/0** and **::/0**, with network restriction entitlement reported `allowed`. No settings changed: an impact review is required before restricting database clients. Leaked-password protection remains disabled; current official Supabase documentation states it requires Pro or above, so enabling it without an existing eligible plan is **BLOCKED BY COST**. No upgrade was attempted. References: https://supabase.com/docs/guides/auth/password-security and https://vercel.com/docs/limits/fair-use-guidelines. Vercel Hobby remains restricted to non-commercial use; commercial launch requires compliant hosting/owner decision, not a silent paid upgrade. Current account plan and recoverability are not certified here.

## Published first fix Preview

Commit `d30d538947a4fd7afccddab41674fcdec41e24f7` is published to the existing feature branch and draft PR #26. Preview https://business-cuz8spidq-buisness-ai1.vercel.app/ is READY, Preview-only, matches that SHA, and returns **200** for `/api/health` and `/api/public-config`; auth is enabled, exact Dev project verified and browser-safe key present. A later source commit needs its own Preview verification.

## Authentication and real Dev acceptance

Runtime source `d3fa1b4224e42571eda5a2293324d56009650593`, Preview https://business-p2vkdzl65-buisness-ai1.vercel.app/, deployment `dpl_E2BqTA4BYtePiQxy84hDTxmdyRq3`: READY, Preview-only, correct SHA. Health and public-config returned HTTP200; frontend auth enabled, exact Dev project and browser-safe key present (values omitted).

Owner used the secure browserAuth prompt; it returned submitted. Fresh visible evidence shows the authenticated Colzo owner workspace, and the session survives a new document. **The dashboard fails** with “Unable to load your business records.” Its underlying DOM-rendered error says “The application rejected a valid sign-in. Please retry or contact support.” This is a **P0 FAIL**, not an authentication acceptance pass. The client verifies Supabase identity after an application401, so do not reset the account or assume password expiry. The exact failing one of the initial Leads/Pipeline/Settings requests is not established; no speculative auth fix was made.

Customers loaded independently. Through the actual browser UI, created then edited one clearly labelled synthetic Dev profile with no contact details:

- Name: `COLZO QA 20261019 Synthetic Customer`
- ID: `fe3e8e3c-38fd-4a85-aff3-6228ded43967`
- Created: 19 October 11:17:28 UTC; edited: 11:17:59 UTC.
- Updated notes contain the fixture marker `EDIT AND RELOAD VERIFIED 20261019` (a test marker, not a certification of the browser reload).

A subsequent bounded read-only Dev query matching that exact synthetic name returned the same ID and edited notes: actual database persistence **PASS**. Browser reload was initiated, but the browser's credential protection then blocked further interaction. **Browser reload readback, MFA, logout/returning-session lifecycle, other live CRUD, mobile/desktop acceptance remain UNVERIFIED.** No MFA prompt was separately observed. Existing account/business/MFA were not recreated, reset or altered.

Browser developer-log access was restricted after secure credential delivery. One explicit canonical navigation and a fresh-document check did not restore all diagnostic capabilities; no tokens, storage or hidden session data were inspected. Composio's runtime-log stream yielded no result and was stopped; the authorised Vercel connector fallback returned only a slow legal200 event and Node deprecation warnings, without the failing dashboard request. An empty error log is not proof that the request passed. Secure owner browser handoff is needed to continue diagnosing this exact live failure. Screenshots could not be completed under the credential-observation restriction; no UI appearance changed.

## Acceptance limits and next priorities

| Area | Evidence | Status / remaining work |
|---|---|---|
| Actions / Bookings | New handler regressions and 27 two-business cases | PASS in mocks; live Dev persistence pending |
| Customers | Existing matrix plus actual synthetic UI creation/edit and read-only Dev readback | Persistence PASS; browser reload/second tenant pending |
| Projects / Quotes | Existing two-business matrix and full suite | Mock coverage passes; live acceptance pending |
| Marketing | 18 new save-confirmation cases and preserved safety suite | PASS in mocks; generation, scheduling and live acceptance remain pending |
| Enquiries / Knowledge / Receptionist | Existing suite preserved | Full suite passes; feature-level live acceptance pending; paid providers must stay mocked |
| Account / MFA / recovery / portal | Sign-in reached owner workspace; fresh document retained session | Basic sign-in observed; MFA/lifecycle/recovery/portal UNVERIFIED |
| Deployment | d3fa1b4 READY + health/config200 | Source Preview verified; dashboard workflow FAIL |
| Security advisors / backup / legal / commercial hosting | Historical documentation only | Recheck current provider evidence; do not treat old findings as a current PASS |

**PUBLIC LAUNCH: NO-GO.** P0: authenticated dashboard fails; complete persistence, server-side tenant/role acceptance and release/restore evidence remain incomplete. P1: investigate concurrent writes, duplicate submission/idempotency, provider failures and current security advisories. P2: remaining noncritical features after core acceptance. Legal operator identity, commercial hosting eligibility and launch authorisation require owner decisions; paid services remain blocked by cost.

## Data and cost safety

One synthetic Dev customer was created and edited through the authorised UI as recorded above; cleanup is pending. No real customer records changed. The existing synthetic booking “Unsaved motion check” and all earlier fixtures remain untouched. No accounts or memberships created. No external messages, chargeable provider calls, subscriptions, Production changes or merges. Additional spending: **£0**.
