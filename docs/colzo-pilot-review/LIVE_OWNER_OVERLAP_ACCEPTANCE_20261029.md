# New-origin owner acceptance and observed booking conflict — 29 October 2026

This supersedes the earlier same-turn no-owner-session statements in LIVE_CONTINUATION_20261029.md. Deployed runtime remains 547c1903ecd6fd37e1fadf2a48655af2a3aa676c at https://business-ff79ht5as-buisness-ai1.vercel.app/ . No redeployment occurred.

## Actual new live results

- Private browser sign-in authenticated the original demonstration owner, not QA. The original owner completed its private authenticator challenge. Read-only managed session metadata confirms AAL2; dashboard rendered and remained accessible after refresh. No password/code/token extracted. QA still has zero sessions and zero verified factors; G2/G3 cannot use the original owner's MFA as substitution.
- Created fictional customer `QA Preview 29 Oct Acceptance — FICTIONAL`, UUID b9307759-7d52-418a-a17e-59401754852e, under original fictional business 6da33602-1b8f-474d-84a6-e003d1c713fd. Edited notes, searched successfully, refreshed and reopened: edited notes persisted. No outgoing contact.
- Existing synthetic enquiry 36 changed through UI from New to In Progress (database Contacted). Existing sentinel notes retained. Read-only history confirms Status changed, New -> Contacted. Evidence log_GrQmxfM91pxA. No records deleted.
- Created fictional booking 18 for 4 November 15:00–16:00 UTC, then confirmed it. Created fictional request 19 at 15:30–16:30 and confirmed it too. UI reported successful updates. Independent readback confirmed both persisted as confirmed with overlapping times: log_00IItNz_NtPU. **FAIL: confirmed-booking conflict protection.** Both fictional bookings were then cancelled through the UI; records/history preserved. Requests may coexist, but confirming overlapping scheduled work fails this requested acceptance.
- Created fictional follow-up action, then completed it through UI. Both saves reported success and open/completed counters changed. Refresh persistence of this action is not yet independently verified.
- Account security centre rendered MFA verified, incident controls and activity. No safety controls changed. Read-only latest owner session metadata confirmed aal2: log_TWAsxHJsGYJ-.
- Remaining Business Knowledge approval, Marketing draft edit, AI trusted FAQ/refusal, lifecycle/export authenticated smoke and sign-out/replay were not completed in this continuation. Do not mark the full owner journey passed.

## RED -> GREEN engineering

Two regression failures observed before correction: database fixture allowed the overlapping confirmed insert; API converted a database scheduling rejection to generic HTTP 500. Initial focused run: 3 passed / 2 failed.

Changes on existing PR only:

- `api/bookings.js`: translate SQLSTATE 23P01 into safe HTTP 409 overlap feedback; 40001/55P03 into reload/retry feedback. Never return database row details or emit success side effects after failure.
- Exact staged SQL `PILOT_BOOKING_OVERLAP_20261029.PROPOSED.sql`: guard only businesses listed in colzo_pilot_access. Serialize schedule-changing confirmed writes with a business transaction advisory lock, then check half-open overlapping intervals in the database. Non-pilot behavior, cancellations and ordinary note edits retained. Fixed-snapshot isolation fails closed; no data repair, extension, new role or grant change. Definer trigger has empty search_path, row_security off and no direct client EXECUTE grants.
- Tests exercise overlap rejection, requested-to-confirmed denial, adjacent intervals, cancellation, non-pilot compatibility, fixed-snapshot rejection and rollback. Disposable native concurrency script prepared separately.

Focused four-file suite: **76 PASS, zero failures/skips**.
Full local `npm run verify`: **1,465 PASS, zero failed/cancelled/skipped**, successful React build, static verifier **372 JS files**, zero inline scripts; exit 0. This includes the 10 synthetic isolation-runner tests; do not add overlapping totals. No tests excluded.

Native concurrency **NOT VERIFIED**. Local uid namespace exposes only root and rejects chown to a non-root cluster owner (EINVAL), so no server started. Separate remote dependency preparation did not complete; no successful native run claimed. The staged SQL is not ready for automatic execution based on PGlite's single-engine tests alone. An eight-independent-backend drill is prepared in scripts/verify-colzo-booking-overlap-native.mjs; required runtime paths are explicit and no hosted credentials are accepted.

## Exact security-sensitive packet, NOT APPLIED

Development only: mvwseobgkexzpmmkgcxe. Proposed SQL SHA256 **4dbfd4188ba042af0d704ed8bbeff0c576f031f7233ecdb33646f4816e879338**. Install one new definer trigger function and BEFORE INSERT/UPDATE trigger on public.bookings. One guarded transaction, 3-second lock timeout/15-second statement timeout, table locks during validation. Abort on existing confirmed overlaps; never repair existing records automatically. Scope rule: one business represents one scheduling resource for the pilot. Owner must approve that rule if parallel staff/resources are intended.

Outstanding before requesting execution: independent native concurrency evidence, fresh live catalog/overlap/permission review, complete exact packet readback and separate explicit approval. No shared SQL was applied. A code-only deployment does not install the guard or fix live overlaps; approval and acceptance of both components are necessary. Rollback would remove the exact new trigger/function only and needs separate review/approval; it would reopen the scheduling defect. No automatic rollback or data deletion.

Existing Auth redirect packet remains separate, hash 09020ea9585b225b92abe03e4a27ed709c597b08852d2b04232bca3a01419e14. Revoke proposal remains deferred to protect the original natural expiry on 11 November 22:50:58 UTC.

## Updated seven-gate decision

| Gate | Status | Evidence / remaining condition |
| --- | --- | --- |
| G1 deployed and accepted | FAIL | Correct deployment PASS; live overlap defect prevents full acceptance. |
| G2 independent QA AAL2/DPA | BLOCKED | Private exact QA account flow still required. |
| G3 actual two-business isolation | BLOCKED | Actual second session and supported request transport absent. |
| G4 revoke/natural expiry | BLOCKED | Original dates preserved; no premature revoke. |
| G5 full recoverability | BLOCKED | No actual protected source/Auth/Storage restore. |
| G6 complete owner workflow | FAIL | Overlap reproduced; several workflows still NOT RUN. |
| G7 approved real onboarding | BLOCKED | Final support/lifecycle decisions and separate activation approval. |

Bounded fictional demo: GO for verified non-conflicting workflows only. Full booking demonstration and secure real-business pilot: NO-GO until corrected deployed scheduling is accepted. Production NO-GO. No production/original product configuration, shared role/grant, real customer, paid provider or spend changed. Fictional owner QA writes above were normal authorised UI actions, not privileged database writes.
