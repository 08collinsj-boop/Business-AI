# Colzo acceptance continuation — 5 November 2026

**NO-GO. Signup disabled. New fixes are review candidates, not deployed.**

## Runtime and preserved evidence

Vercel readback returned READY, target null/Preview, deployment
`dpl_6FudJ71beZVgRmPHVDZjMsF27AzD`, exact source
`4ba80fd2f0c5f5a1f2717770ef46e2d06a0a4cf4` and existing #65 acceptance ref.
URL: https://business-8njmm8dvx-buisness-ai1.vercel.app/ .
The #67 signup branch is **not** the deployment ref; enabling a signup flag on
this acceptance deployment cannot satisfy the exact branch guard.

[4 November actual owner acceptance](https://github.com/08collinsj-boop/Business-AI/pull/65#issuecomment-6644019798)
is preserved for that exact runtime. Booking/Knowledge/Marketing/customer/enquiry/
follow-up/desktop tests were not unnecessarily repeated.
The existing [CI 41847393017](https://github.com/08collinsj-boop/Business-AI/actions/runs/41847393017)
job steps independently read back as successful; the commit-workflow wrapper
returned no runs because it filters pull-request events, not because CI failed.

## Observed MFA gap and code correction

Fresh secure owner email/password sign-in presented the authenticator gate.
Before OTP completion, the DOM contained the native dashboard and existing
fictional enquiry names/counts behind that modal. Separate secure OTP submission
opened the owner workspace; Settings identified Colzo. No secret values, JWTs,
MFA seeds, QR payloads or cookies were inspected/copied.

Source inspection corroborated that `requireBusinessMember` accepted a verified
AAL1 identity without enforcing MFA. Its service-role calls bypass RLS. A new
regression reproduced that missing denial with a mocked Auth verifier. This is
**not a captured live AAL1 HTTP response** and does not complete issued-token QA.

`lib/auth.js` now rejects missing/non-AAL2 assurance **after** Supabase verifies
the token and **before** membership/tenant-record reads, only for scoped
Development Preview. Recovery/identity authentication remains available. The
legacy auth integrity hash is retained; one exact new denial block is pinned
in the review helper. Existing synthetic success fixtures now explicitly carry
synthetic AAL2 claims; no assertion was removed or relaxed.

Test-first RED: two focused failures on the original runtime source (missing
MFA rejection / reaching protected data); two positive controls passed after
correcting the fixture's exact grant timestamps and Production expectation.
GREEN: 4 new tests, including GET/POST/PATCH denial for bookings, enquiries and
customers; the 46-test affected-route group passed. Full local `npm run verify`
then passed **1,659 tests, zero failures/skips/cancellations**, build and static
verification. A separate new direct-policy test passed after that full run.
Native PostgreSQL evidence for the new staged correction must be read from the
new CI run; it is not implied by earlier native success.

## Direct Data API gap and separately gated SQL

Fresh Development catalog inspection found membership + expiry policies on
leads/bookings and the private `workspace_read_allowed(uuid)` function, but no
MFA/session-existence test in that predicate. API-only replay protection cannot
close direct Data API access using a retained issued JWT.

New `DIRECT_PILOT_SESSION_POLICY_PREVIEW.STAGED.sql` replaces only that existing
private predicate. It preserves membership/336-hour expiry and applies MFA plus
matching live `auth.sessions` checks only to permanently designated pilot
workspaces. It changes no table grants, Auth rows or expiry dates; non-pilot
policy behavior remains unchanged. It checks current_user=postgres, expected
owner/ACL and exact prior-definition MD5 before replacement; whole transaction
must roll back on any error. MD5 here detects baseline drift, not file integrity;
the SHA256 below pins the approval package.

Isolated PGlite RED: AAL1 read returned fixture lead1, failing the expected denial.
GREEN: AAL1 denied; AAL2 own-tenant positive read; foreign-user/malformed/missing
session denied; non-pilot behavior retained; removed/expired sessions denied;
usable session positive control; unavailable session table fails closed.
The existing socket-only native PG17 harness now also rehearses this new package
as a non-superuser postgres owner, including surviving fresh-session access after
removing a different synthetic session. **No live SQL installed.**

## Exact approval packages

Target for all SQL: **Business-AI-Dev `mvwseobgkexzpmmkgcxe` only**.
Run each unchanged file atomically as existing postgres owner, never statement
fragments. File sources are in this commit's `docs/colzo-pilot-review/` directory.

| File | SHA256 | Effect and prerequisite |
| --- | --- | --- |
| `DIRECT_PILOT_SESSION_POLICY_PREVIEW.STAGED.sql` | `f331069511e56ccd8ca371ae1787c7ec10a4a324e4f990e1dc00079c0bf73eed` | Tightens existing designated-pilot RLS. Requires independent native PG17 success and separate exact approval. |
| `STRICT_SESSION_REPLAY_PREVIEW.STAGED.sql` | `ccaae397a9b52368d0f56fa9340f63629a1db67a3d51f6bfc06817cebb880eff` | Adds service-role-only session-check RPC. Requires separate exact approval and owner/ACL postflight; API opt-in remains a separate release action. |
| `SELF_SERVICE_PILOT_PREVIEW.STAGED.sql` | `9d20cda419ffc230ef5747e4a2ec83da23725430bc540d8d321a47989be4f6a6` | Atomic workspace + immutable single award, 336 hours, five TOTAL designations. Requires genuine two-tenant acceptance and operator legal/data-exit sign-off before installation, as its header states. |

Read-only preflight: all three proposed changes remain absent/unchanged; expected
private predicate owner postgres, SECURITY DEFINER, empty search_path, EXECUTE
only postgres/authenticated. Signup ledger/RPC and replay RPC absent. postgres
already has Auth sessions SELECT and users REFERENCES; service_role lacks direct
sessions SELECT. anon/authenticated/service_role lack CREATE on public. Pilot
table RLS enabled. No new broad grants are required.

Rollback/containment: an installation error rolls back that file's transaction.
For application rollout failure, retain the existing approved Preview/alias and
leave signup/replay activation flags off; do not imply flags roll back database
policies. After a committed direct-policy correction, restoring the old predicate
would reopen MFA/replay access and therefore requires a separately reviewed exact
rollback approval. Do not drop RPCs/awards, delete identities, revoke grants or
alter expiry as an implicit rollback. Preserve all record and award history.

Remaining risks: new SQL has not been accepted with actual issued sessions;
session deletion semantics/propagation need real logout/replay/fresh-session
checks; definer ownership must remain restricted; users without verified factors
must complete a working legitimate enrollment path before the new mandatory-MFA
candidate can be released. Test that first-time enrollment path explicitly; the
existing post-workspace security offer alone is not evidence it works before a
server-enforced MFA gate. These packages do not certify recoverability or erase
real account data.

## Authentication and mobile blockers

Opera connector returned **Browser not connected**. The available host browser
started with no tabs, then supported fresh legitimate owner sign-in and MFA.
The separate acceptance-alias sign-in returned **pilot access requires approval**;
no identity/grant was changed to bypass it. A subsequent metadata-only check of
the designated QA Garden B owner showed zero sessions and zero verified factors.
Therefore that independent identity was **not** authenticated in this session.
Use its legitimate private sign-in and genuine MFA; do not substitute the owner
session or SQL identity simulations. Current DPA must be accepted by its actual
authorised owner where required; no consent has been fabricated.

No supported device/viewport resize operation is exposed by this browser surface.
No iPhone viewport, software keyboard, safe-area, sheet or mobile accessibility
acceptance is claimed. Desktop screenshots/source tests cannot replace it.

Outstanding real-security matrix remains: independent own/foreign record reads,
foreign IDs/body/query business-ID manipulation, role-denial controls, AAL1/AAL2
HTTP responses, revoke + retained JWT replay across application and direct Data
API, a different fresh session, and fail-closed provider/session-validation
unavailability. Actual issued-session tests require the legitimate accounts and
approved candidate/SQL/strict-replay activation first.

## Operations and fictional-only scope

Focused read-only Gmail search for the existing 2 November support test returned
one SENT-only result, no separate receipt and no more pages. No email was sent.
Independent external-origin receipt and an accountable monitor/escalation owner
are still not established. Historic sent evidence cannot prove monitoring.

Existing legal identity configuration is retained; no private operator address,
telephone or credential is copied into GitHub. No legal versions or acceptances
were changed. The older addendum's possible future real-customer wording is
**not authority for this pilot**: the current pilot must remain fictional
operational/customer data only throughout. Account/auth/support information is
still real personal data.

Operator-only decisions, not software sign-off:
1. Confirm who monitors the published support inbox, actual monitoring schedule,
   incident lead and private backup; provide independent receipt evidence.
2. Approve a fictional-only participant addendum and prerelease recovery-risk
   disclosure. Record each participant's own acceptance of exact terms/DPA and
   the restriction; do not precheck consent or sign on anyone's behalf.
3. Choose defensible retention purposes/periods for account, Auth/session/MFA,
   security/audit, support and consent records; assign an authenticated closure,
   return and deletion owner, applicable exceptions and secure delivery method.
   Do not promise automatic deletion: expiry restricts access only. Existing
   365/730-day review fields are not an account-deletion implementation.
4. Demonstrate the approved account-data exit procedure on disposable data before
   making a participant promise. Existing one-customer export rehearsal does not
   establish whole-account/Auth/Storage return or deletion. No shared data may be
   erased to produce acceptance evidence without exact authorisation.

## Preserved natural expiry and next route

Read-only grant values remain exactly:
- 27 Oct 18:08:54.676335 UTC → **10 Nov 18:08:54.676335 UTC**.
- 28 Oct 22:50:58.480174 UTC → **11 Nov 22:50:58.480174 UTC**.
Both are 336 hours. The existing 12 November verification was not edited or
duplicated. Future observation remains mandatory; no simulated clock is passed
off as natural expiry.

Shortest safe route: legitimate independent QA MFA/DPA → independently verified
new MFA/direct-policy candidate and exact Development approvals → issued-session
bidirectional/API/direct-RLS/replay tests and mobile acceptance → accountable
support/account-data/consent acceptance → scheduled natural expiry → separately
approved #67 Development-scoped signup candidate and complete signup E2E before
public activation. Two existing QA designations leave **three** slots under the
current five-total cap, not five additional businesses.

No Production, paid provider, publishing, invitation, privileged SQL, authentication
configuration, activation flag, deployment, expiry grant or PR merge changed.
