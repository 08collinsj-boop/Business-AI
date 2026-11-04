# Recovery and release continuation - 26 October 2026, afternoon

DEMONSTRATION NOT READY. CONTROLLED 14-DAY PILOT NO-GO.

## Candidate reconciliation

Fresh Composio GitHub reads verified PR #63 draft/unmerged at db4e5ebc7cfb719615118c9efafcaf23f848767e,
continuation at 91e0d0d6babcbdca961d6985bba2843f1f7de2ee and PR #65 draft/unmerged at
decfaa7050afd5a8551fac19d389c12010908620 (tree 37ca98b428c5c1219a07185f425523ba3110e386)
before this continuation. PR #65 still targets the continuation. The continuation contains
all PR #63 work (17 ahead, zero behind), including website integration. New changes are
children of PR #65 only. No divergence was merged. Separate Learn My Style head
8eba27dc01f151ec1f7bb7608bc617e54a128498 remains excluded. Both existing Vercel branch
exclusions remain false; no new deployable branch is published.

## Concrete corrections and application proposal

Prepared scripts/assemble-colzo-release.mjs, exact proposed application SQL and hash manifest.
The first staged source has no outer transaction; the remaining four each have one.
The assembler retains their bodies, removes only the four verified wrapper pairs and
uses one enclosing transaction, ON_ERROR_STOP and local timeouts. SHA256 pins reject
any source change until deliberately reviewed. It does not connect to any database.

Proposal: pilot-release-application.PROPOSED.sql. SHA256:
26c864c1deb9b2deb4f1ab10d8e2f5aae0c7e76bc3aa45eeac99bd0dcae267c0
Target only: Development mvwseobgkexzpmmkgcxe. NOT AUTHORISED / NOT APPLIED.

Before commit it checks trusted postgres ownership, restricted new-function search_path,
effective PUBLIC/anon/authenticated/service permissions, operator role isolation and no
unexpected grants/invitations/audit. It checks the existing creator's exact reviewed
body fingerprint, owner, SECURITY DEFINER, ACL and unwritable public/auth search-path
schemas. Fresh Dev read-only evidence confirmed creator fingerprint
872a165ace5cfa6c8e9429c23a7d5d4b, owner postgres, search_path public/auth and service-only execution.
The fingerprint is a drift guard, not a substitute for review of the body.

Independent reviewer initially reproduced two important gaps: hidden transaction
controls in altered sources and an unchecked existing creator owner. Both cases failed
new regression tests before correction. Final independent local re-review reported no
Critical/Important findings; reviewer ran five package and six no-provider tests.
This is not genuine recovery/reconciliation signoff or shared-SQL approval.

Rollback before COMMIT is ROLLBACK/disconnect; native tests verified late failure rolls
back DDL, policies and the cluster role while preserving pre-existing fixture records.
After COMMIT preserve data/audit and fail-closed controls; stop activation. There is no
automatic destructive down script or accepted deployed app to roll back to. Any later
recovery/app/revocation operation requires its separately reviewed target and approval.

The no-cost demonstration path previously rejected all enquiries before deterministic
FAQ/quote/booking/refusal handling when provider keys were absent. Corrected only for
eligible scoped Development Preview with frontend/tenant auth true, billing false,
legacy blanket override off and both OpenAI/OpenRouter keys absent. Health uses the same
narrow predicate. Existing DPA, tenancy, quotas, grant, booking and persistence guards
remain enforced. Arbitrary conversation uses honest limited fallback/human handover;
this does not provide a paid model or promise general AI answers. Six new tests cover
FAQ/refusal, quote/booking, expiry denial, failed-save honesty, health and wrong settings.
Initial four behaviour tests failed before the correction. All network is mocked and
external provider URLs are rejected in the fixtures.

## Fresh verification

- Original candidate baseline: 1,368 automated tests passed; zero failures/skips/cancellations.
- Package plus no-provider plus existing hardening focused suites: 15 passed, zero failures/skips/cancellations.
- Final candidate full/build/static result: recorded in FINAL_VERIFICATION_20261026.json after completion.
- Native PostgreSQL 17.11 provisioning: 41 checks, nine actual overlapping-backend races.
- Native booking: 11 passed, zero failures; eight-backend deduplication, lock/audit-wait
  expiry, revocation, rollback, client-role and cross-tenant denial.
- Exact combined package: nine native checks passed. Untrusted owner and late duplicate
  index both fail without leaving staged objects. All five commit together in success;
  grants/audit remain empty. Evidence: NATIVE_PACKAGE_ACCEPTANCE_20261026.json.
- These 61 native checks are separate from Node test totals. Synthetic scoped restore
  retains minimal fixture metadata/roles; no real Supabase Auth service or Storage bytes.
- An initial native setup attempt bundled CREATE ROLE and CREATE DATABASE in one psql
  command and failed (CREATE DATABASE cannot run inside a transaction). Nothing was
  counted as passed. Corrected separate commands; final runners completed. Both clusters
  were stopped. Runtime packages came from Debian's authenticated package repository.

## Current Development/hosting evidence and recovery limit

Fresh read-only preflight at 14:23:16 UTC (also Europe/London on this date): 59 ledger
entries, no duplicate pending AI booking groups, required baseline dependencies present,
staged table/private schema/operator/RPC/index absent. Aggregate inventory at 14:12 UTC:
52 public tables, three buckets, 12 objects, 9,867,566 metadata-reported bytes. Empty managed
backup inventory; PITR false. No actual rows/Auth secrets/Storage bytes were exported.

Auth still has site_url https://business-ai-pilot.vercel.app/ and old Preview redirects.
Email autoconfirm false; password minimum 12; refresh rotation true/reuse 10 seconds;
TOTP enrol/verify true; WebAuthn enrol/verify false. These configuration flags do not
prove either intended Dev identity has MFA. Browser dashboard session has expired and
redirects to sign-in for this exact Development ref; no credentials were entered.

Matching decfaa7 deployment query returned zero. Global Preview env metadata still
includes OPENAI_API_KEY and Supabase credentials without an exact candidate branch override.
Values were not decrypted or printed. Other Learn My Style deployments are outside this
candidate. An old scoped Preview remains on 35a0edaf and is not acceptance evidence.

No pg_dump connection password, approved encrypted private export destination, separately
operator-held bundle key, authenticated Storage-byte export or compatible actual-source
restore is available. No encryption key was generated and falsely described as operator-held.
An empty private directory or dashboard login would not meet those gates. Review current
Supabase restore guidance for recoverability of the encryption root key: encrypted Vault/
column data in a dump does not itself include that root key. No key retrieval was attempted.
Source: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
The current changelog was checked; no new Supabase interface implementation was introduced.

## Prepared next gates and exact owners

| Gate | Owner and next action |
| --- | --- |
| Actual-source recovery | James signs into the prepared Development dashboard, locates existing session-pooler password privately without resetting it, selects an approved encrypted local/export runtime/destination and separate operator-held key. Engineer then captures schema/records/Auth/roles/config, all Storage bytes and recovery-material coverage, seals/verifies and restores into compatible isolated no-outbound services. |
| Independent recovery/reconciliation | Independent reviewer examines actual capture/restore, full migration ledger/source reconciliation, extensions and effective permissions; current code review alone does not pass this gate. |
| Shared SQL | After recovery/review pass, engineer refreshes preflight and presents the exact script/hash/effect/rollback above. James explicitly approves before any shared write. |
| Preview | James approves exact candidate/deployment after prerequisites. Engineer isolates Development env, omits external provider/payment keys, excludes crons and verifies SHA/environment, health/legal/auth/API/deferred-feature denials. No production/domain/alias switch. |
| Dev Auth redirects | Prepare site_url = the exact approved isolated Preview origin; append only its required login/recovery paths to the recorded allowlist, retaining unrelated entries until separately reviewed. Exact Preview URL is unavailable before deployment; no placeholder payload may be executed. Change Development config only, never the older Pilot. |
| Managed acceptance | James approves two deliverable test identities/businesses and completes correct Dev MFA securely. Engineer runs the existing worksheet; confirmation/reset/invitation sends remain blocked until separately authorised. Grant timestamps must stay unchanged. |
| Physical iPhone | James supplies actual device/iOS/time/results against accepted exact Preview using the existing worksheet. No emulator acceptance claimed. |
| Identity/privacy | James confirms LEGAL_OPERATOR_NAME, LEGAL_TRADING_NAME, LEGAL_OPERATOR_TYPE, authorised LEGAL_OPERATOR_ADDRESS and explicit publication confirmation, LEGAL_CONTACT_EMAIL/PHONE; company/VAT numbers only if applicable. No address from memory is used. Verify support route without sending under current restriction. |
| Retention/providers/legal | Operator and reviewer decide/test data-return format, identity checks, retention/deletion and backup/audit lifecycle. Reconcile actual accepted environment/provider/fallback/analytics configuration with register; obtain professional legal review. Existing source identity placeholders remain; no matching live pages accepted. |
| Real activation | After every preceding gate passes, James selects exact business, authority, named users/scope and approves audited 336-hour activation and any invitation separately. No business automatically chosen; Hartlepool Chat is not a human-monitor replacement. |

Existing fictional examples, owner guide, iPhone sheet and unpublished Pilot addendum
remain prepared. No live demonstration workspace, managed two-account security acceptance,
physical-device result, real Pilot grant, legal approval or matching Preview exists.
£0 spent. No shared SQL/data changes, deletions, merges, deployments, paid calls/payments,
real activation, invitations, email, posts or marketing communications.
