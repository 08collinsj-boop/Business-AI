# Issued-session logout replay execution — 6 November 2026

## Actual completed prerequisite

Stable protected #67 origin, runtime `9e11949e80f01f9f7db023161b25f2013a178e25`,
deployment `dpl_EVW3vxHuknPrjmTZ5Hv67KtrUmCz`: **13/13 real read-only AAL2
checks passed** using the owner's issued session. Full outcomes are recorded in
PR #65 comment `6696774615`. This is one-direction evidence. It does not imply
independent QA AAL2, role enforcement, replay or outage acceptance.

Count-only independent Development baseline before preparing the replay test:
the original owner has **three Auth sessions**. No session IDs/tokens/factors
retrieved. Counts alone will not prove which session was revoked.

## Explicit session test implementation

`assets/colzo-session-replay-panel.js` is attached only in the existing exact
Development Preview build guard. Runtime also requires the exact protected
stable hostname and explicit `?qaReplay=1`. It has a separate, clearly labelled
button: **Test logout replay — ends this session**. Merely opening the page
performs no test requests or logout. The existing read-only panel remains separate.

Before logout it verifies exact Development/fictional-only config, issued Auth
identity, AAL2, a single expected fictional owner membership, valid session claim
and JWT expiry at least two minutes away. The JWT is decoded only after Auth
verification; no decoded claims, user/session IDs, token or browser key are shown.
Two protected API reads and a direct bookings row read must each return positive,
tenant-bound data using that exact token. Any failed prerequisite stops logout.

The test uses the SDK's **local** logout scope to end only this Auth session.
It never uses global/others logout and never revokes another device's session.
The issued JWT is retained only inside this async test's memory, then reused for
the same GETs. API responses must be401; direct Data API must deny/return no row.
Any200 protected API is explicitly FAIL. JWT expiry is checked again afterwards;
natural token expiry cannot be counted as a replay pass. Logout errors and network
ambiguity yield inconclusive, with no raw response data or exception displayed.
The logout button stays disabled to prevent a second logout attempt in the same
run. A separately labelled single recheck can reuse that same revoked JWT after
a backend correction without another private login. Its private in-page callback
expires after at most ten minutes or JWT expiry and is discarded after use; no
token is persisted. Requests have bounded timeouts. Reloading/closing the page
intentionally loses the test state. If the window expires, results are inconclusive.

No workspace mutation, DPA acceptance, grant, invitation, SQL, credential reset or
provider activity is added. Local logout is the only intentional session mutation
and is within the originally requested logout/replay acceptance. A new legitimate
private sign-in is required afterwards. No tokens move between origins.

Seven focused regressions cover exact bearer reuse/local scope, replay200 failing,
failed/near-expiry/foreign prerequisites preventing logout, ambiguous logout and
no-action on a normal page, plus exact-token single recheck and its expiry. These
mocks verify test tooling, not server security.

## Acceptance boundary

Actual live replay outcomes require this exact tested source to be deployed and
the button to be executed with a genuine owner AAL2 session. Record all HTTP
outcomes, unexpired-token indication and independent non-secret session metadata.
Observe other-session access and newly issued fresh-session access separately.

The existing backend strict replay opt-in remains **off** until its separately
gated configuration activation is authorised. A failed replay result is a blocker,
never permission to weaken controls or silently enable settings. The restricted
session RPC is already installed; no new privileged SQL is part of this work.
Original grants/natural-expiry dates and Production remain unchanged. Pilot NO-GO.


## Actual live results and fresh-session continuation

On source `40fcd47a6b78a1ff8530fc006d9f8de604b8c560`, protected Preview
`dpl_Dt82Vk5xgnEtpebTb8vYG6cSyvB4`, the actual issued owner AAL2 session passed
positive tenant-bound API/Data API baselines, then SDK local logout completed.
The SAME retained JWT remained unexpired throughout: bookings API401, enquiries
API401, direct bookings Data API200 with empty rows. Independent count-only Auth
metadata changed from three active owner sessions to two. A different existing
session on immutable runtime `e65bd25d` survived full reload and Security centre.
Evidence: https://github.com/08collinsj-boop/Business-AI/pull/65#issuecomment-6697134343

The user then privately signed in again at the stable protected origin, using
existing MFA. The fresh issued AAL2 session passed **13/13** read-only checks on
runtime `40fcd47a`: own APIs200, anonymous APIs401, foreign bookings/leads empty,
foreign clients403 table permission denial, business-ID manipulation remained
own-tenant, actual foreign customer404, incident-controls/audit-log200. This is
one direction only; clients403 is table permission denial rather than RLS proof.
Independent metadata showed three total/active owner sessions and exactly one
session created after the earlier replay evidence at 22:11:53Z. No tokens/session
IDs/MFA secrets/record contents retrieved. READY/exact source/stable alias were
independently rechecked. Fresh-session access after local revocation now passes.
Evidence: https://github.com/08collinsj-boop/Business-AI/pull/65#issuecomment-6697306651
Integration evidence in #68 does not assert that #68's head itself was deployed.

Strict replay flag remained absent/off; observed native Auth/RLS denials did not
require its activation. No privileged/configuration change is authorised or
necessary merely to obtain these already-observed passes. The earlier proposed
flag package remains unapplied. Controlled real validation-unavailability,
independent QA AAL2/two-way/roles and other pilot gates remain open. NO-GO.

## Observed QA panel obstruction

The fixed expanded panel obstructed the user's sign-in form. Navigating to the
same stable origin without the explicit QA query restored unobstructed sign-in;
that workaround enabled the actual fresh-session acceptance above. Both explicit
QA panels now use normal document flow rather than fixed overlays and provide a
normal root link labelled "Close QA panel — return to workspace". Merely opening
or closing a panel adds no probes, logout or credential access. Two regressions
failed on the original fixed layout and passed after the change. Existing auth,
tenant/replay assertions remain intact. These layout changes do not invalidate
recorded server-security results for runtime40fcd47a. Deployment verification of
the visual correction must name its own exact newer source separately.
