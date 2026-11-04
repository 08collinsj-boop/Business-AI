# Fictional demonstration preparation and release path

Status: isolated preparation PASSED; managed demonstration BLOCKED awaiting release,
account and configuration approvals. Controlled real Pilot remains NO-GO.

## Reusable fictional data and isolated execution

FICTIONAL_DEMO_RECORDS_20261026.json contains two explicitly fictional businesses,
reserved example.invalid contacts, hours/services/areas, internal projects, quote
requests and human-review facts. No phone number, real address, qualification or
real price is invented. The quote's required numeric amount is zero, explicitly
labelled an unpriced example, not an offer. No actual Auth identity is specified.

Repeatable local acceptance:

    node --test tests/colzo-fictional-demo-persistence.test.mjs
    node --test tests/colzo-preview-environment-plan.test.mjs

The first runner creates a new private /tmp/colzo-demo-* PGlite directory. It has
no Supabase SDK, network target, password, JWT or Auth session. It replaces only
its own minimal fixture tables with the actual recorded booking/action/knowledge/
client/project/quote schema definitions, installs the unchanged proposed pilot SQL
locally, populates two businesses and removes only its own directory on close.
It cannot be pointed at shared Development. Schema provenance is the recorded
ledger; minimal Auth scaffolding is not a running Supabase Auth service.

| Feature | Current isolated evidence | Managed/UI status |
| --- | --- | --- |
| Login/MFA/recovery | No sessions fabricated; minimal Auth fixture only | NOT TESTED; needs approved Dev identities/Preview |
| Business profile/settings | Fictional contact/services/hours persist through reopen | NOT TESTED |
| Receptionist configuration | Balanced mode and service area persist | NOT TESTED |
| Enquiry/lead dashboard data | Two tenant-owned fictional leads persist | NOT TESTED |
| Owner actions | Two review-enquiry actions persist | NOT TESTED |
| Booking requests | One pending request per tenant; actual SQL retry reuses row | NOT TESTED through HTTP/browser |
| Clients/projects/draft quotes | Two records each persist; cross-tenant lead references rejected | NOT TESTED through accepted API/UI |
| Manual knowledge | Fictional approved fact per tenant; SQL state/filter and source/business FK checked | Managed owner approval workflow NOT TESTED |
| Tenant isolation/expiry | Database-role simulation reads only its own allowed rows; expired A denied while B remains usable | Managed Auth/API two-account acceptance NOT TESTED |
| Permissions | Direct authenticated quote mutation denied; server-only record grants preserved | Comprehensive deployed role acceptance NOT TESTED |
| Navigation/responsiveness/iPhone | Existing static/unit evidence only | Exact Preview/browser/device acceptance NOT TESTED |

These tests close a real persistence-fixture gap but are not a working accepted
live account, end-to-end HTTP journey or genuine-source recovery. Direct SQL state
changes are not evidence that the UI approval process ran. Server-side tenant
resolution and quote lifecycle tests remain separately covered by existing suites.
No external provider, payment, uploaded object, email, invitation or confirmation
is demonstrated as operational. No seed has run on shared Development.

## Preview preparation

PREVIEW_ENVIRONMENT_PLAN_20261026.json names the exact app project/branch, Development
ref, auth/scoped/billing flags, durable enquiry-quota configuration, private key
sources and explicit branch-only empty provider/scheduler overrides. Existing
Development service-role and publishable key sources were confirmed available.
No credential values were printed, committed or saved as deliverables. Existing
global Preview sensitive env values could not be read using the individual-env
operation; their project mapping remains UNVERIFIED, not a demonstrated mismatch.
There are no exact-candidate overrides. No settings were changed.

scripts/lib/colzo-preview-environment-plan.mjs is an offline policy checker. It
requires privately verified Development-key inputs, exact approved SHA/branch/
project/Preview metadata, retained SSO protection, no crons/provider keys, both
auth flags, scoped access, disabled billing and a durable-quota secret. It blocks
literal service-key aliases and emits only check statuses. It does not itself
retrieve/attest live metadata, change env, deploy or approve release.

After explicit environment/deployment approval, resolve private values from the
exact Development Management API, generate the rate-limit salt securely, set only
branch-specific overrides, verify them privately and deploy only the approved SHA.
Recheck actual host/environment metadata. A successful offline plan check does not
stand in for that post-deployment validation. Keep all paid provider calls excluded.

## Controlled Pilot gates still needed

1. Explicit approval and verified application of the exact unchanged Development
   SQL payload. Post-commit verify owners, search paths, RLS/grants, operator
   isolation, booking RPC/index and zero activations. On discrepancies stop.
2. Separate exact Preview/environment approval and accepted deployed SHA. Separate
   Development-only Auth redirect/site_url approval using its real URL. No alias,
   Production, old Pilot or SSO-protection changes.
3. Explicit approval of two deliverable test identities and separate businesses;
   correct Dev MFA, member/owner permissions, confirmation/reset/rotation/revocation,
   336-hour boundary, two-seat rules and tenant read/write denial. Email/invitation
   sends need separate permission. No old-account MFA substitution.
4. Actual accepted browser journey: approved manual facts; question, quote, pending
   booking and refusal; saved lead/action; concurrency and honest failure; refresh;
   tenant isolation and immutable grant timestamps after recovery. Preserve examples
   and drafts on failures. Test disposable expiry fixtures, never real grant edits.
5. James's physical iPhone Safari worksheet with actual device/iOS/time/results.
6. Confirm legal/operator identity and authorised address publication, verified
   support email/telephone, applicable company/VAT status; agree/test data return,
   retention/deletion and provider/privacy handling. Professional legal review
   remains unresolved; no home address or new retention promise has been published.
7. Verify separately approved real business/owner authority, named users (maximum
   two), agreed scope and explicit activation/invitation approval. Record activation
   and expiry in UTC and Europe/London, exactly 336 elapsed hours, no card, charges
   or automatic paid conversion. No business has been selected automatically.

The current private invitation path allocates a member seat; do not promise an
unimplemented administrator invitation or share owner/authenticator credentials.
Hartlepool Chat's requested human-monitor role is not supplied by this product.

## What may wait until public-launch preparation

James explicitly deferred genuine-source backup/recovery verification. Keep the
existing procedures and require a complete actual DB/Auth/Storage-byte/config and
essential-key capture plus verified compatible isolated recovery before public
launch. No current recovery-point/time or successful-restore promise is justified.

Public launch also requires complete migration reconciliation/replay and operational
recovery signoff; launch configuration/domain/rollback acceptance; production legal/
privacy/data-lifecycle acceptance; approved pricing/billing/provider arrangements
and end-to-end tests for whichever paid/external features will actually be enabled.
Phone, WhatsApp, Marketing, Connect, uploads, Learn My Style and push remain outside
the controlled Pilot; re-enabling any is a separately scoped and approved release.
Full launch work is deferred, not silently certified by synthetic checks.

## Current approval boundary

No shared SQL, records/accounts, grants, invitations, Preview, env/Auth settings,
Production/older-Pilot operations or paid calls have been authorised by the current
prompt. NEXT_DEVELOPMENT_APPROVAL_20261026.md remains the exact next approval packet;
the payload/query hashes are unchanged. All prepared records are fictional.
