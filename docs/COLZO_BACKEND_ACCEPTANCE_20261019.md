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

## Authentication and real Dev acceptance

Authorised connector read of base Preview `/api/public-config`: HTTP 200, `frontendAuthEnabled=true`, exact Dev Supabase URL and browser key present. Key values are intentionally omitted. Cloud browser renders the approved Colzo sign-in form without the temporary authentication error. The browser has no authenticated session; current-session owner sign-in, MFA, refresh, logout, live CRUD and mobile/desktop acceptance remain **UNVERIFIED** until the owner signs in securely. Existing owner account, business and MFA were not changed.

## Acceptance limits and next priorities

| Area | Evidence | Status / remaining work |
|---|---|---|
| Actions / Bookings | New handler regression tests | PASS in mocks; live Dev persistence pending |
| Customers / Projects / Quotes | Existing two-business matrix and full suite | Mock coverage passes; real isolated-tenant acceptance pending |
| Enquiries / Knowledge / Marketing / Receptionist | Existing suite preserved | Full suite passes; feature-level live acceptance pending; paid providers must stay mocked |
| Account / MFA / recovery / portal | Sign-in screen only this session | UNVERIFIED authenticated journeys |
| Deployment | Base Preview configuration / rendered login | Source fixes require a new exact-SHA Preview verification |
| Security advisors / backup / legal / commercial hosting | Historical documentation only | Recheck current provider evidence; do not treat old findings as a current PASS |

**PUBLIC LAUNCH: NO-GO.** P0: authenticated persistence, server-side tenant/role acceptance and release/restore evidence remain incomplete. P1: investigate concurrent writes, duplicate submission/idempotency, provider failures and current security advisories. P2: remaining noncritical features after core acceptance. Legal operator identity, commercial hosting eligibility and launch authorisation require owner decisions; paid services remain blocked by cost.

## Data and cost safety

No Dev database records were created or modified in this fix group. The existing synthetic booking “Unsaved motion check” and all earlier fixtures remain untouched. No accounts or memberships created. No external messages, chargeable provider calls, subscriptions, Production changes or merges. Additional spending: **£0**.
