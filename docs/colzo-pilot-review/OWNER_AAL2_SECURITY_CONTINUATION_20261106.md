# Issued owner AAL2 and security-centre continuation — 6 November 2026

## Actual current-runtime observations

Protected immutable Development Preview:
`https://business-phqc0624o-buisness-ai1.vercel.app/`.
Deployment `dpl_HvGYmBztzome4kh4knhhcSVrWTAG`, source
`e65bd25d40252d82e654942a788127dd9700c0de`, independently read back READY,
Preview target null. Owner completed private sign-in manually. The actual page
rendered the existing fictional workspace and its fictional-only warning.

Account security showed **MFA verified**, **Authenticator app enabled** and
**This session has completed two-step verification**. This verifies the existing
owner's current session; it is not independent QA enrollment or a second-tenant
AAL2 acceptance pass. No secrets/factors/tokens inspected or copied.

Observed live defect: incident controls and security activity showed
`[object Object]`; incident refresh reproduced it while the account retained
MFA verification. Anonymous direct navigation to `/api/incident-controls` rendered
`{"error":"Authentication is required"}`. This confirms the route reached an
auth-required application response; it does not determine the authenticated
failure's HTTP status or root cause. No incident toggles were changed.

Bounded Vercel runtime-log collection did not return a result before it was
cancelled; do not claim logs established a cause. Browser error-log filter for
incident requests returned no entries. Do not infer success from absent logs.

## Code correction and regression

Security-centre error handling previously passed an object-valued `error` to
`new Error(...)`. A regression reproduced `Error: [object Object]`. It now keeps
bounded string application errors; nested/platform errors show HTTP status and
only a validated uppercase code. Nested debug/message content is not displayed.
No transport, authorization, verification, endpoint or permissions are weakened.

The existing protected, opt-in, read-only QA panel now handles issued AAL2 as
well as its original AAL1 checks. It remains limited to the exact stable #67
HTTPS host, `?qaSecurity=1`, exact Development Supabase and fictional-only,
approval-required config. It first verifies the actual user via Auth and an
owner membership in exactly one of the two designated fictional businesses.

AAL2 probes include positive own bookings/enquiries/customer API reads,
anonymous API rejection, foreign-business direct Data API reads, business-ID
manipulation and (for the original owner only) the existing foreign QA customer
ID; security-centre endpoints report response status/code. The foreign fictional
customer ID was obtained read-only from its exact existing QA business before
the change. No record content, user ID, JWT, session ID or browser key is shown.

All requests are GET. No enrollment, logout, session mutation, invitations,
provider action, new grant or record write is added. A table-level 403 is labelled
as permission denial, not an RLS-specific proof. Owner positive reads must really
contain tenant-bound records; leaked foreign rows fail. Unknown memberships and
unverified users stop before workspace probes. Each output states one-direction
only: roles, replay, outage behaviour and independent second-account acceptance
remain separate. Mock regressions are not live acceptance.

The new live acceptance must be run on a separately identified deployed source;
opening the immutable old runtime cannot load changes committed afterwards.
Use the stable protected QA origin for subsequent private sign-in so future
essential Preview deployments can preserve that origin's legitimate session.
Never move credentials or tokens between origins to avoid a sign-in.

## Remaining boundary

Security-centre root cause and live AAL2 tenant/foreign-ID outcomes await the
corrected deployed candidate. No replay, role, second-business AAL2 or mobile
pass is inferred. QA enrollment remains deferred. No privileged SQL, Auth setting,
Production, signup activation, grant/clock change or additional spend. Pilot NO-GO.
