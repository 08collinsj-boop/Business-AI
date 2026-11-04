# Current Preview owner acceptance and stale-edit defect — 31 October 2026

Secure real-business pilot: **NO-GO**. Existing draft PR #65 only. No deployment, Production, permission/grant/Auth configuration, source-data export, paid provider, invitation or merge change authorised by this evidence.

## Environment and authentication

Read the 30 October handover, latest PR description and comments through 6530009451, then the current docs-only branch head `fc4c91725ce11ea8f9c89f4970601c336695ead3`. Used the exact immutable Preview `https://business-h4gs5q7xt-buisness-ai1.vercel.app/`, previously approved/deployed runtime `d5fc9f70bb4d75f9dd09d8829ced2a389f608c1a`. That SHA is taken from existing deployment evidence, not independently derived from page content. No redeploy or repeat of its completed CI.

Browser started signed out. Secure owner password flow reached the authenticator challenge. The initial secure OTP request was rejected by automatic review; user subsequently explicitly authorised that one-time-code prompt. The retry submitted successfully, the MFA dialog closed, owner dashboard loaded, and Security Centre explicitly reported **MFA verified**, **Authenticator app enabled**, **This session has completed two-step verification**. No setup seed/QR, OTP, password, token or cookie was returned to the agent. Original owner evidence does not substitute for independent QA MFA/DPA.

## Direct live UI results on deployed d5fc9f70

Only newly created, explicitly fictional records were written.

| Check | Observed result |
| --- | --- |
| Booking request/create/confirm | **PASS (UI)**: `QA 20261031 Fictional overlap A`, customer `QA Fictional Customer`, 5 November 10:00–11:00 in browser date-time fields. Requested save, reopen and confirmed save succeeded. |
| Overlapping confirmed creation | **PASS (UI denial)**: proposed overlap B 10:30–11:30 was rejected with “This time overlaps another confirmed booking. Choose a different time.” Editor remained open. No overlap B appeared after reload. **Actual HTTP 409 not captured** by available browser inspection surface; do not upgrade this to HTTP-level PASS. |
| Adjacent confirmed creation | **PASS (UI)**: same form changed to `QA 20261031 Fictional adjacent B`, 11:00–12:00; full page reload showed both A and adjacent B confirmed. Reopening each showed exact submitted title/customer/start/end/status. No raw UTC/API readback claimed. |
| Cancellation persistence | **PASS (UI)**: both new bookings cancelled via editors; after another full reload, cancelled filter showed both cancelled, active count returned from 6 to original 4; total retained 9 rather than original 7. No deletions. |
| Stale booking editor | **FAIL**: two tabs opened cancelled A at the same loaded version. Second tab saved `QA concurrent winner 20261031. Retained cancelled.`; first tab then saved `QA stale writer must be rejected 20261031`. Both reported success. Reopening A showed the stale text, proving lost-update behavior. Test record remains cancelled, with failing-scenario evidence retained. |
| Manual Knowledge | **PASS (UI)**: created `QA 20261031 Fictional review fact` with explicitly fictional garden-consultation text/no service or price promises. Save showed Review needed/1 awaiting review; explicit accuracy confirmation led to Facts approved/1 approved/0 awaiting review. Refresh and later full page reload/re-entry retained that state. Existing pending fact and failed upload untouched. |
| Manual Marketing | **PASS (UI)**: created `QA 20261031 Fictional manual draft`, saved, edited caption, reviewed server-loaded caption, explicitly approved. Full reload/re-entry retained edited text and `approved`. UI states no scheduling/publishing, exposes manual creation/edit/review only after scope load, and says AI generation/publishing disabled. No generation, schedule, publish or paid-provider action invoked. Provider-network absence is not independently traced. |
| Owner session persistence | **PASS (UI)**: full page reloads retained owner workspace after successful MFA. |

## Root cause and minimal branch fix

`isColzoPreviewAuthTransportEnabled()` is pinned to the old `feature/colzo-complete-ui-motion-20261017` branch. Both action/booking PATCH version checks and the native work editor accidentally used that transport flag to enable record concurrency. On the actual `fix/colzo-pilot-release-gates-20261026` branch, the editor omitted the version and the API allowed unversioned writes.

Introduce a separate `isColzoRecordVersionEnabled()` guard for Colzo Development Preview branches with the existing approved-Supabase-target boundary. Expose only the nonsecret `recordVersionsEnabled` boolean; native and legacy work editors submit their loaded version when enabled. Action/booking handlers enforce the existing exact-version precheck, atomic database predicate, next-version and saved-version confirmation. Legacy auth transport behavior is unchanged. Production/non-Colzo branches retain existing behavior; wrong Development project fails the guard. No SQL or migration change.

## Verification and release boundary

- RED: 26 focused tests, **16 passed / 10 failed**, reproducing actual-pilot-branch API/UI gaps before the runtime fix.
- GREEN: **31 focused version/configuration tests passed / 0 failed** after fix, including existing precision tests. New cases cover both actions/bookings, stale/missing versions, atomic lost-race denial without success side effects, exact-version success, independent UI flag, nonsecret config, unchanged transport and Production/unrelated/wrong-target boundary.
- Full local `npm run verify`: **1,491 tests PASS**, zero failed/cancelled/skipped; build PASS; static verification of **377 JavaScript files PASS**. GitHub exact-head verification will be independently recorded after completion. Native SQL/trigger code was not changed or reinstalled.
- New runtime fix is **NOT DEPLOYED**. Existing Preview still has the observed lost-update defect. A new immutable candidate packet and separate deployment approval are required, followed by the same two-tab live retest. No readiness claim.

## Remaining gates

G1/G6 remain **FAIL overall** due demonstrated stale-edit loss, despite the workflow passes above. Independent QA MFA/AAL2/current DPA and two-issued-session tenant/role/replay checks remain **BLOCKED**. Genuine Development database/Auth/Storage-byte backup and isolated restore require precise private export/destination authorisation. Disposable-fixture revocation requires separate exact approval; original 10/11 November natural expiry fixtures and scheduled 12 November check remain unchanged. Operator/support/legal/lifecycle signoff and real-business activation remain outstanding. Additional spend **£0**.

## Same-root enquiry routing follow-up and additional owner smoke

Source review after commit `1741dcee36706bee6bf66b94381083e955772aa0` identified the same old transport flag selecting the legacy enquiry handler in the dispatcher. Actual pilot-branch regression: **6 tests / 3 passed / 3 failed** before the follow-up. The dispatcher now uses the independent record-version guard to select the existing safer Colzo enquiry handler; native and legacy enquiry editors use the same server-approved flag. No new handler contract or schema was introduced. Combined focused suite: **37 PASS / 0 failed**. Final local verification: **1,494 PASS**, zero failed/cancelled/skipped; build and static checks PASS. Exact final GitHub CI is recorded separately; do not attribute the earlier 1,491-test CI to the follow-up commit.

Additional live smoke on the unchanged d5fc9f70 Preview:
- Created `QA 20261031 Fictional Customer` without contact information; edited its notes, fully reloaded, searched `QA 20261031`, reopened and read the edited sentinel. **UI PASS**.
- Created `QA 20261031 Fictional follow-up`, reopened to verify description, marked completed, fully reloaded and saw the completed row under Completed. Original two open follow-ups unchanged. **UI PASS**.
- Created `QA 20261031 Fictional quote — DO NOT SEND`, linked to the already fictional QA Alex enquiry, amount GBP 1 purely as stored test data, internal do-not-send note. Full reload retained draft/GBP 1. No send/issue/accept transition or financial operation. Draft-only UI controls disabled non-draft creation. **UI PASS for draft persistence only**; later quote transitions and final immutability not live tested.
- Created `QA 20261031 Fictional Enquiry` with description `QA sentinel 20261031. Internal test only. Do not arrange a booking or callback.`; changed status to In Progress and added a separate notes sentinel. Full reload dashboard retained In Progress. **UI PASS for create/status persistence**; raw history/API and stale enquiry HTTP acceptance not captured. Manual enquiry creation is not a receptionist refusal-flow test.
- Full reload dashboard showed 5 enquiries, 9 total bookings (including retained cancelled probes), 2 open actions. No additional booking was created by these manual enquiry steps.

The first fix commit's independent GitHub CI [41191929917](https://github.com/08collinsj-boop/Business-AI/actions/runs/41191929917) passed **1,491 tests**, **17 native PostgreSQL checks**, build and 377-file static verification. Its nine changed file blob hashes matched local tested bytes on independent readback. Vercel deployment listing after that publish still showed the original d5fc9f70 immutable Preview as newest READY deployment. Final follow-up remains separately pinned/tested and undeployed until approval.
