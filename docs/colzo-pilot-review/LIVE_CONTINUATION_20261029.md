# Live acceptance continuation — 29 October 2026

## Exact baseline

PR #65 remains open, draft and unmerged. Starting head: `a9911ef87bc754f9f2d063ab1b737d323d44ea11`.
Deployed runtime: `547c1903ecd6fd37e1fadf2a48655af2a3aa676c`.
Deployment: `dpl_CSB9HYBCGvrtJXX9xSiYcGia93GU`.
Protected Preview: https://business-ff79ht5as-buisness-ai1.vercel.app/ .
The deployment is complete; historical PR descriptions requesting its approval are superseded.
The existing 1,453-pass full CI at https://github.com/08collinsj-boop/Business-AI/actions/runs/40955618353 is retained. No application code, migration or runtime changed here.

## Newly executed evidence

- Opened the exact new Preview in Work's browser. It rendered the actual Colzo email/password login form, rather than a Vercel interstitial. No owner session was present on this origin. No credential submitted, password reset sent, MFA enrolled or legal consent entered.
- Opened the deployed privacy page and waited for its asynchronous operator identity request. It rendered the configured operator/trading name, sole-trader structure, geographic address, email and telephone. Values were not copied into this document. Seven legal settings preserved; no new identity/publication approval is requested for those already-approved values. Initial fallback text before fetch is not evidence of missing final configuration.
- Navigated the browser directly to `/api/colzo-records?resource=clients`, `/api/leads`, `/api/bookings` and `/api/actions`. All four rendered `{"error":"Authentication is required"}`. These are actual application denials with no app bearer session, while browser deployment access was available. Browser navigation did not expose HTTP status; no HTTP 401 measurement, expired-token denial or sign-out proof is claimed.
- Composio service-health check reports Auth/database/Storage `ACTIVE_HEALTHY`.
- Filtered current Development Auth configuration: TOTP enrollment and verification enabled, refresh rotation enabled, email enabled, email autoconfirm disabled. Current `site_url` and 12-entry redirect list still target/include the previous origin, and do not include the new origin. See exact proposed correction below. No settings modified.
- Recovery access inspection ran as `supabase_read_only_user` (both current and session role). Auth schema usage, Auth user SELECT and Storage metadata SELECT are available. Storage has **12 objects / three buckets**, seven installed database extensions. Only counts/privilege booleans were retrieved; no object names, bytes, Auth secrets or user payload exported. Evidence: Composio `log_HnX31orq1YA-`; filtered Auth read `log_GJXBFrDSl6sR`.
- Discovery identified `SUPABASE_DOWNLOAD_PRIVATE_OBJECT`, which can download one known path with deliberately selected service-role access. It is not a database dump or an authorised full private archive. No object download executed. Prior no-managed-backup/PITR-off evidence retained without rerunning that check.

## Engineering completed and verification

Added `scripts/lib/colzo-live-isolation.mjs` and its focused regression tests. The runner takes an authorised session-safe request bridge and two distinct fictional business IDs. It neither discovers nor extracts credentials, tokens, sessions or cookies. It has no automatic fixture creation, deletion, permission changes, retries or repair writes.

It prepares bidirectional own-tenant reads and foreign customer/action ID reads, enquiry/booking list scoping, optional foreign PATCH denial with valid loaded versions, full owner-list preservation readback and app-anonymous denials. It stops after unexpected success, disclosure or transport failure. Missing fixtures are BLOCKED; default write probes are NOT RUN. The `complete` flag refers only to this runner's subset, never the whole G3 gate.

**Important endpoint contract:** `/api/leads` and `/api/bookings` do not implement GET by arbitrary record ID. Their list-scoping results must not be reported as exact foreign-ID GET denial. Foreign PATCH IDs exercise the individual-record scope. Remaining AAL1/AAL2, member/owner, business-ID tampering, expiry/revocation/stale-session replay and permitted write tests still require separate execution and evidence.

Invocation in a supported, operator-approved transport host:

```js
import { runLiveIsolation } from './scripts/lib/colzo-live-isolation.mjs';
// request(identity, {path, method, body}) must bind A/B to actual separately
// signed-in fictional owners and anonymous to no app session. It returns only
// {status, contentType, data}; do not expose auth material to this runner/logs.
const evidence = await runLiveIsolation({
  request: approvedSessionBridge,
  businesses: ['433f135d-720f-4687-8114-3dffe7361675', '6da33602-1b8f-474d-84a6-e003d1c713fd'],
  allowDeniedWrites: false
});
```

`approvedSessionBridge` is a required integration boundary, not an existing browser capability. Work's documented UI cannot issue arbitrary authenticated requests without extracting tokens; no such extraction or browser-script workaround was attempted. Do not run this example with invented/mocked sessions and call it live acceptance. Opt in to denied-write probes only after both lists are positively verified as fictional and allowed to test. An isolation defect could otherwise change a foreign record. Owner review is required if that happens; the runner deliberately does not overwrite evidence with compensating writes.

Executed `node --test tests/colzo-live-isolation-runner.test.mjs`: **10 PASS / 0 FAIL / 0 skipped**. All use synthetic bridges, not live sessions. One new runner assertion first failed (9 PASS / 1 FAIL): a 404 carrying a foreign `record` could be counted as denial. Corrected the runner to allow only the denial error/code envelope; rerun 10/10 GREEN. This was a test-runner defect, not an observed deployed application disclosure.

Executed `node scripts/verify-local.mjs`: PASS, 352 JavaScript files, zero inline scripts; secret/temporary-marker checks passed. Existing full application suite was not repeated because deployed application code is unchanged. No new full-CI total is claimed.

## Security-sensitive packets — prepared, not applied

1. [New-origin Auth redirect packet](RECOVERY_CURRENT_PREVIEW_APPROVAL_20261029.md): exact JSON SHA256 `09020ea9585b225b92abe03e4a27ed709c597b08852d2b04232bca3a01419e14`. Separate owner approval required. This is an Auth configuration change, not a redeployment.
2. Corrected revoke SQL remains SHA256 `1bfb70bc564989f529d4c9bb0c448dcba7dd666c3c5e31d8c26675554ba427d3`; historical 22 native checks retained. **Do not request execution against this active fixture now.** It would prevent natural expiry acceptance. Preserve activation 28 October 22:50:58.480174 UTC and expiry 11 November 22:50:58.480174 UTC, 336 hours. After expiry, freshly inspect state and revise/retest exact preconditions if necessary; existing script requires active status and an active unrelated demo grant and may then fail closed. No alternate grant/fixture has been authorised.
3. Real-source backup approval must specify trusted device, protected destination, operator/key custodian, exact Dev scope and safe isolated target. No actual private source extraction or destructive restore is authorised by this packet. See [operational handover](PILOT_OPERATIONS_HANDOVER_20261029.md).

## Seven release gates

| Gate | Classification | Exact remaining condition |
| --- | --- | --- |
| G1 correct Preview deployed and accepted | BLOCKED | Deployment PASS; actual sign-in/dashboard and changed legal/lifecycle/export authenticated smoke acceptance still need a legitimate session. |
| G2 independent QA MFA/AAL2/DPA | BLOCKED | Exact QA account private login, MFA enrollment/verification, current DPA acceptance. Existing zero-session/factor/DPA baseline retained. |
| G3 actual two-business isolation | BLOCKED | Four live no-app-session denials PASS; actual issued-session cross-tenant/write/tampering/AAL/role/replay checks unexecuted. New runner prepares a subset only. |
| G4 revocation/natural expiry | BLOCKED | Original natural date must pass; live revoke needs a suitable non-conflicting approved fixture/procedure and exact separate approval. No grant altered. |
| G5 source/Auth/Storage recoverability | BLOCKED | Actual protected snapshot, 12 Storage objects' bytes and isolated supported restore/Auth verification absent. Metadata and fixture export do not satisfy this gate. |
| G6 functioning owner workflow | BLOCKED | New-origin owner sign-in unavailable; private owner journeys and refresh persistence NOT RUN on this runtime. Previous narrower evidence retained. |
| G7 approved business/support/lifecycle | BLOCKED | Monitored support delivery, final export/retention/incident handling, named business/owner and separate invitation/activation approval. |

Fictional demonstration **GO only within prior verified fictional scope**, requiring legitimate sign-in. Complete new-runtime demonstration acceptance remains BLOCKED. Secure real-business pilot **NO-GO**. Production **NO-GO**.

Highest-impact next action: privately sign in as the exact QA account `08collinsj+colzoqa@gmail.com` on the new Preview, then complete MFA/AAL2 and current DPA consent. Do not use the demonstration owner as a substitute. If recovery is needed, resolve the exact new-origin redirect approval first. No repeated recovery email was sent.

No deployment, merge, Production/Business AI change, shared permission write, grant/revoke, data deletion, real invitation, paid provider enablement or spending occurred.
