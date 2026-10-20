# Colzo - browserless free-beta acceptance and security handoff
Date: 20 October 2026. Base Development commit: af920e32cf70036131bf0920af410ab73edaeec3.
Supabase Development: mvwseobgkexzpmmkgcxe.
Repository: 08collinsj-boop/Business-AI.
Scope: registration and tenancy, security and mobile, controlled free-beta preparation.

**Backup and recovery work is excluded at the user's request. No database export, backup or restore was undertaken.** Production, paid providers, marketing messages and real customer data were not changed.

## Customer registration reliability - implemented and tested

- Customer sign-in, sign-up and confirmation resend reject simultaneous duplicate submissions.
- Buttons restore correct form-validity state after success or failure. Unexpected provider/network errors show neutral customer-facing text without leaking technical details.
- Customer sign-in requires a real returned session, not merely an error-free response.
- Existing strong password, privacy acknowledgement, email confirmation and shared business/customer account behaviour are preserved.
- JSDOM regression suite tests duplicate sends, failures, missing session, invalid submissions and resend rejection.
- Synthetic Chromium registration screen checked at 320/350/375/390/402/430/768px: no horizontal overflow, 48px submit buttons, no browser JS errors, only one mocked signup call and no real user registration.

## Live Dev read-only isolation evidence

- Metadata checks confirmed RLS on businesses, memberships, leads, bookings, Knowledge, customer profiles, customer enquiry access, Clients, Projects and Quotes.
- Customer profiles, customer enquiry access, Clients, Projects and Quotes are server-only to the browser roles (no direct authenticated/anonymous SELECT grants).
- Under BEGIN READ ONLY, SET LOCAL ROLE authenticated and a synthetic nonmember JWT subject, real Dev RLS returned zero visible businesses, leads, bookings and membership rows. No user IDs, business names or records were returned and the transaction was rolled back.
- Existing handler-level two-business tests for Customers/Projects/Quotes and Actions/Bookings pass with mocked independent identities. No authorised real two-account test was performed.

## Safe deployment metadata preflight

New scripts/colzo-beta-readonly-preflight.mjs makes only four GET requests to a specified Development .vercel.app origin: /api/health, /api/public-config, /api/legal-public and /api/public-business?business=colzo. Requires the expected Dev project, configured sole-trader legal identity, available public assistant and existing security headers. Prints sanitized PASS/BLOCKED checks, not keys, JWTs or private data. Rejects Production, Pilot, unsafe URLs and credentials embedded in URLs. It never certifies public launch.

## Launch gate matrix

| Gate | Evidence | Current state |
| --- | --- | --- |
| Exact Development Preview / health / Auth ref | Read-only Preview checks pending for final merge SHA | Confirm after deployment |
| Approved Graphite & Volt and animation pack | User says owner app works; automated mobile checks | Partial user/device acceptance |
| Customer registration form | Synthetic browser and mocked Auth tests | PASS synthetic, real confirmation blocked |
| Email confirmation, actual login/logout, MFA, password recovery | Current repo regressions, no live fresh test account | NEEDS INTERACTIVE OWNER/WORK |
| Data isolation | Dev RLS metadata and fake nonmember role, mocked multi-tenant tests | PASS read-only and synthetic only |
| Real two-business read/write and forbidden cross-tenant access | Two authenticated authorised Dev test identities needed | NEEDS INTERACTIVE TEST |
| Customer enquiry ownership and real account persistence | No live writes or customer email sent | NOT VERIFIED |
| Core business flows / assistant | Earlier verified QA and user says customer assistant works | Final SHA end-to-end remains open |
| Mobile and accessibility | Chromium simulated widths, owner iPhone user check | Physical keyboard, Safari, VoiceOver, desktop remain open |
| Security | RLS, permission metadata, safe frontend changes and response headers | Partial; leaked-password protection open |
| Legal and contact identity | Previous Business AI legal identity adapted to Colzo; DPA accepted by owner | Other legal/ICO review remains open |
| Hosting/operations | Commercial plan, monitoring, support route, kill switches | Owner decision / operational testing |
| Billing | No paid checkout in free beta | Do not charge; separate Stripe test required for paid tier |
| Recovery | EXCLUDED by user for this task | Existing independent launch blocker |
| Public promotion/Production | No invite, domain switch, release or payment | NO-GO without owner sign-off |

## Controlled free-beta procedure - not yet authorised

1. Freeze exact Development source and verify same-SHA app/health/auth/legal/public customer routes and all automated tests.
2. User signs into authorised owner account; run password recovery and MFA tests without sharing credentials. Set up a separate explicitly authorised test customer and second synthetic business in Dev only.
3. Verify customer enquiry to owner lead/action, booking requests, Knowledge grounding, and second-business denials with synthetic data. Test across reloads and sessions. Avoid actual provider charges and external messaging.
4. Verify desktop keyboard and physical iPhone keyboard/safe-area, forms and screen readers. Preserve approved designs.
5. Complete security/hosting/ICO/support and external recovery go/no-go gates with owner's decisions.
6. Only after ALL P0 gates pass, obtain explicit approval for exact SHA, permitted invite count, cost ceiling and rollback owner. Do not merge into Production, switch DNS or publish invitations before approval.

**Public free beta: NO-GO.** This package does not mean the app is production-ready and makes no changes to Production.
