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
