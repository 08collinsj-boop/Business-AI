# Data-lifecycle save confirmation fix and release-gate verification — 29 October 2026

**Status:** focused code correction independently verified in a disposable local checkout. **Undeployed**. PR #65 remains draft. Protected fictional-data demonstration retains its previous GO evidence; secure 14-day real-business pilot remains **NO-GO**.

## Original defect and RED evidence

Source: `lib/data-lifecycle-handler.js` before the fix. The protected owner-only `PATCH` of `business_data_lifecycle_policies` used service-role PostgREST and returned HTTP 200 even if the returned row set was empty, carried a different `business_id`, or omitted the requested saved values. In addition, GET could return the first row without checking that its `business_id` matched the authenticated business. These were fail-open **responses**, not demonstrated live cross-tenant disclosure.

Added `tests/colzo-data-lifecycle-confirmation.test.mjs` to reproduce five assertions with only fictional IDs and mocked service responses:

1. Zero returned PATCH rows must give 409, no success audit.
2. Foreign-business PATCH response must give 500, no audit or foreign row disclosure.
3. Own-business PATCH response whose saved value differs from submitted value must give 500, no audit.
4. Correctly confirmed own-business PATCH succeeds with one audit.
5. Foreign-business GET response must give 500 without disclosing the row.

RED run with unmodified handler: **four assertions failed** (cases 1, 2, 3, 5), proving the unsafe response handling. Case 4 passed.

## GREEN implementation

- Require GET results to be a zero/one-row array; reject multiple/malformed/foreign-business rows.
- Return HTTP 409 on empty PATCH result rather than falsely reporting a saved setting.
- Require one PATCH confirmation row for exactly the authenticated `business_id`; verify each submitted policy field matches returned persisted values.
- Do not create a successful audit event unless the saved row is confirmed.
- Preserve the established owner-only gate, field allowlist, retention range limits and service-role query tenant filter.

GitHub commits on the existing PR branch:
- Regression test: `e5f445a9a374f0f6ae9714cb9a87ef99ec512271`
- Handler correction: `53fda548447431187a9d1a686113d764b7bf8bf3`

Both files were independently fetched back from GitHub and matched the submitted complete contents. No deployment, database write, authentication change or account action.

## Executed verification

Reused the latest PR checkout with the exact two files fetched from the final correction commit; installed dependencies from checked-in `package-lock.json` with `npm ci --no-audit --no-fund` (74 packages, no reported install error). Runtime: Node `v24.22.1`, npm CLI `11.6.2`, disposable Linux sandbox.

| Check | Result |
| --- | --- |
| RED new lifecycle tests before fix | 4 failing assertions / 5 cases; expected reproduction |
| GREEN lifecycle tests plus focused cross-tenant and expiry tests | 26 tests passed, zero failed |
| Earlier expanded targeted run including lifecycle, revoke, hardening and runtime imports | 35 tests passed, zero failed |
| Application build (`node scripts/build-colzo-react.mjs`) | PASS, 228622-byte uncompressed React content bundle |
| Local static/secret marker verification (`node scripts/verify-local.mjs`) | PASS, 364 JavaScript files, zero inline scripts |
| Broader regression excluding five engine-dependent test files (`node --test --test-concurrency=2`) | **1381 passed / 0 failed**, 222 test files; 72.6 seconds |

### Embedded PostgreSQL limitation — NOT PASSED

The original complete test run counted **1390 tests: 1385 passed and five failed test files**, where the five failing files are:

- `tests/colzo-fictional-demo-persistence.test.mjs`
- `tests/colzo-lead-version-migration.test.mjs`
- `tests/colzo-pilot-booking-idempotency.test.mjs`
- `tests/colzo-pilot-database.test.mjs`
- `tests/colzo-release-package.test.mjs`

All five depend directly or indirectly on `@electric-sql/pglite`. An isolated rerun of the lead-version-migration test timed out at 50 seconds with a pending Promise despite being a single test. An isolated PGlite smoke probe also timed out while the sandbox approached its 976 MB memory ceiling and had no swap. These outcomes support a **runner/resource limitation**, not a proven defect in SQL semantics, but **must not** be credited as passing. Re-execute these five under a sufficiently provisioned, supported isolated PostgreSQL/PGlite environment before relying on a complete clean-suite acceptance. Previously recorded native PostgreSQL 17 synthetic acceptance remains historical evidence in its original scope, not proof this local run passed.

The remaining 222 file suite, build and local verification were run successfully. The full `npm run verify` gate **cannot** be called green for this correction because of the five unresolved files; neither did the initial shell-wrapper attempt provide a valid full result.

## Acceptance status and scope

| Gate | Status |
| --- | --- |
| Lifecycle save confirmation defect | PASS — targeted RED→GREEN |
| Unmodified cross-tenant and expiry focused regressions | PASS — 26 combined targeted tests |
| All non-PGlite regression files | PASS — 1381 tests |
| Full SQL/PGlite-dependent suite | BLOCKED — sandbox initialization/resource issue |
| Runtime deployment of correction | NOT RUN — separately approved exact deployment required |
| Live authenticated QA MFA/DPA and issued-JWT/API negative tests | BLOCKED — legitimate private QA credentials/session and supported test access |
| Exact shared Development revoke and post-revoke denial | BLOCKED — separate exact-byte approval and prerequisites |
| Natural live expiry | NOT YET DUE — unchanged deadlines, original read-only follow-up scheduled 12 November |
| Actual source/Auth/Storage backup restore and safe deletion | NOT VERIFIED |
| Operator/support/data lifecycle decisions | BLOCKED — owner decisions required |

**No Production, shared Development data, Auth, permissions, grants, customer records, SSO, Preview deployment, providers or billing changed.** No real-business account activated or invitations sent. This work does not declare the secure real-business pilot GO.

## Subsequent full clean-suite resolution — GitHub Actions, 29 October 2026

The five PGlite-dependent local-runner files above were **not** ignored or marked passed by assumption. The existing **Pilot Verification** workflow was explicitly dispatched on the same public-repository PR branch. It used a standard GitHub-hosted Ubuntu runner at no additional charge; no workflow definition, Production, application runtime, database or account setting changed.

**Completed successfully:** [GitHub Actions run 40936573244](https://github.com/08collinsj-boop/Business-AI/actions/runs/40936573244), workflow head `92e7516ba38d5fa95bd1a78b15f4005de26e4472` (including regression test commit `e5f445a` and application fix commit `53fda548`). Workflow status `completed`, conclusion `success`; official job logs read independently, not inferred from UI state.

The exact workflow command was `npm run verify`, invoking checked-in `npm test` with the build/pretest and then `npm run verify:local`. Job logs record:

- **1427 tests passed / zero failed / zero cancelled / zero skipped / zero TODO**.
- React content bundle build: **228622 bytes before compression**.
- Local verification: **364 JavaScript files**, zero inline scripts, secret/temporary-marker checks succeeded.
- Workflow's own installation and verification steps each concluded successfully, as did the completed overall job/run.

This **supersedes the earlier local-environment PGlite blocker for code-level CI acceptance at that exact head**. The constrained local runtime's failure remains a truthful historical environment limitation, not a current CI gate. The successful GitHub Actions run is automated/synthetic coverage, **not** a live Supabase-issued QA session, genuine two-business API acceptance, authorised shared Development revoke, natural grant expiry, source/Auth/Storage restore or privacy/lifecycle sign-off.

No subsequent application code change is included in this documentation addendum. The deployed Preview is still the separately approved runtime `adecce31b88f5c1ffd623480524996cb5ae91581`, which **does not include** the new lifecycle fix. A later deployment would need separate exact-commit owner approval and an appropriate live check.
