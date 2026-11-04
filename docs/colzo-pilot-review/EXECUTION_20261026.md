# Colzo demonstration and pilot readiness - 26 October 2026

**DEMONSTRATION NOT READY. CONTROLLED 14-DAY PILOT NO-GO.**

## Latest continuation — managed installer correction

The exact previously approved Development SQL was attempted once and failed closed
with “unsafe operator role”. Postfailure readbacks confirm rollback: staged tables,
private schema/operator are absent; ledger remains59. No retry was performed.
The replacement wrapper handles only PostgreSQL17's exact bootstrap admin-only
entry to trusted non-superuser postgres. Five staged sources are unchanged.
Independent13 focused tests and native9 non-superuser package checks pass. New
hashes, changed administrator invariant, effect/risks and renewed approval boundary
are in NEXT_DEVELOPMENT_APPROVAL_20261026.md. Earlier statements below describe
historical states. Backup/recovery is DEFERRED/UNVERIFIED until public launch by
explicit user decision. No Preview, accounts/invites or activation were performed.

## Work completed

Reconciled the current remote refs and checked out the continuation unchanged.
PR #63 remains draft/unmerged at db4e5ebc7cfb719615118c9efafcaf23f848767e.
Continuation 91e0d0d6babcbdca961d6985bba2843f1f7de2ee contains all PR work
plus upload-token restrictions, booking consent/atomicity fixes and website work:
17 commits ahead, zero behind. Both older integration alternatives are ancestors
of the continuation. Learn My Style was not integrated.

Prepared isolated branch **fix/colzo-pilot-release-gates-20261026** on that exact
continuation. Fixed a newly reproduced staged-SQL defect: invitation creation or
acceptance could pass initial eligibility and finish after pilot/invitation expiry
while audit persistence waited. Final wall-clock checks now reject and roll back
membership, invitation and audit changes together. All three new elapsed-deadline
tests failed before the fix (missing rejection) and passed after it. This follows
the booking routine's final-authorization-point model; it does not promise the
client receives a response or an outer transaction commits before expiry.

Added the same three cases to the native PostgreSQL runner. Initial extended
native run found a collision between its synthetic token and an older fixture;
the fixture now derives unique tokens from scenario names. That interrupted run
is not counted as passing. Final 41-check native rerun completed successfully.

Disabled automatic deployment for the new branch in both Vercel configs before
publication. Existing refs, automatic migrations and shared data were preserved.
Prepared exact read-only SQL preflight, release/rollback procedure, fictional
demo/physical-iPhone result sheet and a scoped draft pilot addendum.

## Fresh verification

| Evidence | Result and limit |
| --- | --- |
| Untouched continuation baseline | 1,365 passed; zero failed/skipped/cancelled; build and 350-file static checks passed |
| Focused SQL/booking/upload suites | 36 passed; zero failed/skipped/cancelled |
| Corrected application full suite | 1,368 passed; zero failed/skipped/cancelled; build and 350-file static checks passed |
| Final source verification | Repeated npm run verify: 1,368 passed; zero failed/skipped/cancelled; build and 350-file static checks passed |
| Native provisioning/seat/expiry/restore | 41 checks passed, nine overlapping-backend races; three new elapsed-deadline cases |
| Native atomic booking | 11 checks passed, including eight-backend overlap, lock/audit-wait expiry, rollback, tenant and client-role denials |
| Native runtime | Server PostgreSQL 17.6, client tools 17.11; private Unix socket, TCP disabled; stopped successfully |
| Native source identity | Proposal/driver SHA256 values captured in NATIVE_ACCEPTANCE_20261026.json |
| Genuine Development restore | BLOCKED; native records and Auth/Storage schemas are fictional/minimal |
| Managed Auth/MFA/reset/session acceptance | NOT RUN on this candidate |
| Matching deployment | None; continuation SHA returned zero deployments |
| Managed cross-tenant/expiry acceptance | NOT RUN; synthetic denials only |
| Physical iPhone Safari | NOT RUN; handoff/result sheet prepared |

Native 52 checks are reported separately from the 1,368 automated Node tests, not
added into that total. Prior 65-step reconstruction replay was not rerun and is
historical evidence only. No synthetic/source-schema result is a genuine backup.

## Fresh Development and hosting findings

Read-only project: Business-AI-Dev, mvwseobgkexzpmmkgcxe. All eight reported
services healthy; Auth v2.197.0. Public tables: 52. Auth users: 16, confirmed: 14;
verified MFA factors: two in aggregate, not proof for either intended test identity.
Three Storage buckets, 12 metadata entries, 9,867,566 metadata-reported bytes.
No names, passwords, MFA seeds or object contents were exported.

Backup inventory remains empty; PITR=false. No complete pg_dump source connection,
operator-controlled encrypted destination/key, Storage-byte export or compatible
real-source restore was established. Do not infer otherwise from SQL access.

Preflight at 10:43:26 UTC / UK on 26 October: 59 migration entries, zero duplicate
pending AI booking groups; required baseline tables and create_business_for_owner
exist. Staged grant/private-schema/operator/booking-RPC/index objects are absent.
The five SQL proposals have not been applied to Development. Shared existing RLS
therefore does not yet supply the proposed pilot expiry controls.

Development Auth still has the older Pilot as site_url and only older Preview
redirect entries. Email autoconfirm=false, password minimum=12, refresh rotation=true
with 10-second reuse interval, TOTP enrol/verify=true. WebAuthn enrol/verify=false.
No Auth settings, accounts, MFA factors or sessions were changed.

Vercel Git creation is enabled project-wide; exact PR/continuation/new-branch
deployment exclusions are in source. A separate Learn My Style Preview is visible
in metadata and is outside this task. The old scoped Preview is on 35a0edaf, not
an accepted current release. Global Preview env metadata includes an OpenAI key;
the new candidate needs an explicitly reviewed no-paid-provider environment and
correct Development-only credentials. No environment values/secrets were printed
or changed. No deployment or alias/domain switch was made.

## Blocking gates and prepared next work

1. Genuine encrypted Development export/recovery and independent reconciliation
   review, including Auth/MFA/configuration and all Storage bytes.
2. Independent review of exact staged SQL/ownership/effective permissions and
   atomic packaging, then separate approval before any shared Development write.
3. Exact candidate approval and isolated Preview; verify SHA, project/env mapping,
   no paid providers, redirects, legal/health/protected routes and deferred denials.
4. Two expressly approved test identities/businesses and secure manual login/MFA;
   real confirmation/recovery/rotation/revocation, tenant denial and full persistence
   journey. No email/invitation is sent under this task's standing prohibition.
5. Physical Safari acceptance on James's actual iPhone against that exact Preview.
6. Operator/legal identity, support verification, provider reconciliation and tested
   retention/data-return/deletion decisions. Legal source placeholders remain.
7. Approved business authority, named users and separate final activation approval.

The fictional demo records and procedure are prepared, but no live demonstration
workspace/account was provisioned. No real business or Hartlepool Chat workspace
was created/activated; no timestamps or readiness certificate were fabricated.
Existing owner guide remains available; the new addendum is an unpublished draft
requiring professional legal review and unresolved operator decisions.

## Single next operator action

Open Development's Supabase **Connect** screen in the existing authorised account
and arrange private source-export access plus an operator-held encryption key and
destination in an approved export runtime. Do not paste secrets into chat. Do not
reset the database password, purchase backups, restore over Development, or apply
the staged SQL. The precise handoff and remaining review sequence are in
RELEASE_PROCEDURE_20261026.md. A login/MFA demonstration is premature until that
recovery gate and the subsequent matching-Preview gates are satisfied.

£0 spent. No paid AI, Stripe payments, shared writes/deletions, Production/older-Pilot
operations, merges, deployments, activations, invitations or external messages.
