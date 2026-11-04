# Data-subject export and non-atomic erasure safeguards — 29 October 2026

**Development branch only; undeployed.** Source changes `lib/data-subjects-handler.js`, regression test `tests/colzo-data-subject-safety.test.mjs`. Existing draft PR #65. No real-business pilot activation, shared Development data change, deletion, Auth change or deployment.

## Proven problem (RED before source fix)

The existing owner-authenticated data-subject endpoint used the service-role database connection and checked only the outbound `business_id` filter when exporting a lead, history, bookings and actions. It did not verify returned row tenant IDs or related `lead_id` values, even though service-role reads bypass RLS. An inconsistent or incorrectly routed response could therefore disclose another business's data while being returned as HTTP 200.

The `DELETE` route separately issued four parallel PATCH operations to leads, bookings, actions and lead_history, with no confirmed-return counts or transactional all-or-nothing guarantee, yet returned `{erased:true}` and wrote an erased audit on success responses. This risks partial mutation or a misleading erasure claim. **No actual live partial erasure was reproduced or performed; the risk was demonstrated using synthetic handler responses and source inspection.**

The ID parser also accepted arbitrarily large decimal strings beyond JavaScript safe integers.

The new suite first ran against the unchanged handler and produced **seven expected failing assertions**:

- Foreign lead must fail closed.
- Foreign history must fail closed.
- Foreign booking must fail closed.
- Foreign action must fail closed.
- Mismatched related lead ID must fail closed.
- Unsafe huge lead ID must be rejected.
- In scoped pilot mode, a DELETE must be refused before any PATCH call.

The valid own-tenant JSON export case passed.

## Implemented small safe correction (GREEN)

- Validate the `leads` service-role response is a zero/one-row array and, for a row, matches the authenticated business and exact requested lead ID. Inconsistent responses fail with generic HTTP 500 and no record disclosure.
- Validate each returned history, booking and action row against both authenticated business ID and requested lead ID before auditing/exporting. Empty arrays remain valid.
- Reject unsafe or oversized numeric lead identifiers before requesting tenant content.
- In **scoped pilot mode only**, reject automated `DELETE` with HTTP 503 after authentication and input checks, before any lead content read or partial database mutation. Do not claim erasure or write an erasure audit.
- Preserve existing non-pilot legacy erasure behavior outside the explicitly gated scoped pilot. **This is not proof that legacy erasure is atomic or safe to release for real-business use**; replacing its parallel PATCHes with a reviewed atomic, transactional tenant-scoped erasure workflow remains required before claiming end-to-end erasure acceptance.

There is no new Supabase privileged function, schema migration, provider action or data deletion.

GitHub commits:
- `45e97adf9d3f55a695d006795f15f4fd133b5fef` — new regression tests.
- `be4cb99849e6ef46f36663704408ae228d2057bd` — scoped pilot block and fail-closed export validation.

Both committed files were retrieved from GitHub and matched the expected local tested source bytes.

## Verification and limits

Focused local run after the change:
`node --test tests/colzo-data-subject-safety.test.mjs tests/pilot-hardening.test.mjs tests/colzo-data-lifecycle-confirmation.test.mjs tests/colzo-two-business-matrix.test.mjs`

Result: **38 tests passed, zero failed**, including all eight nested synthetic data-subject cases and previous lifecycle/tenant coverage. The RED run failed as expected against the old handler. No live JWT, cross-business API token or protected browser session was used by these synthetic tests.

The earlier [full CI run 40936573244](https://github.com/08collinsj-boop/Business-AI/actions/runs/40936573244) passed 1427 tests at its exact preceding workflow head `92e7516ba38d5fa95bd1a78b15f4005de26e4472`. **That CI result does not cover this newer data-subject code change.** A new full CI run is required and must be independently recorded before treating full regression as passed after this change.

## Deletion and legal release gate

Denying unsafe self-service erasure is safer than falsely claiming a partially completed deletion. It is **not** a substitute for honouring valid privacy/data rights requests or establishing an operator-handled process.

Before onboarding a real business:
1. Verify responsible operator/support contact and authority-verification process.
2. Resolve tenant-specific data return and post-pilot retention/deletion terms, including legal/audit holds and backups.
3. Design an auditable transactional database process for applicable tenant records and child references; reconcile ownership, shared Auth user, referrals, Storage objects and external provider copies.
4. Test in disposable isolated data; prepare exact rollback/exception handling and verified response semantics.
5. Obtain separate approval before modifying shared Development or deleting any tenant records.

Export via this lead-specific route does not replace the previously rehearsed 50-category fictional tenant JSON/CSV export and does not demonstrate a full source/Auth/Storage backup or successful restore.

**Readiness:** fictional demo retains prior GO; secure real-business pilot remains NO-GO. The application runtime deployed to protected Preview is still `adecce31b88f5c1ffd623480524996cb5ae91581`, without either new code correction. Do not deploy or activate a real business without separate exact approval.

## Concurrent-head reconciliation and focused re-verification

While preparing full CI, the PR advanced by an additional code commit `3fd0176e67c2dade553adfd346dce1280e45317c`. That change preserved the legitimate lead and related-row verification through `verifiedRelatedRows` (including explicitly excluding arrays), but removed the safe-integer ID validator and the scoped-pilot non-atomic erasure block.

The latest source was independently fetched and substituted into the already-written regression suite. **RED on that exact concurrent code state:** six passing nested cases; the oversized lead-ID and scoped-pilot DELETE assertions both failed, with the enclosing test also marked failed (9 reported tests: 6 passed, 3 failed including the parent). The failure was observed before modifying the latest source; the rest of the new export checks remained green.

**GREEN:** retained the concurrent commit's stronger `verifiedRelatedRows` implementation and changed **only** the bounded positive safe-integer ID validation and the scoped-pilot `DELETE` early refusal. Exact combined source was run against the four focused test files: **38 passed / zero failed**, no shared database or live deletion. Committed this reconciliation as `1ce6f248c067785d440fd856a931affd254cbdaf` and independently fetched the committed bytes back.

This section supersedes the earlier single-code-fix SHA as the final tested implementation; both the original `be4cb998` and the concurrently evolved export validation are preserved where compatible. **Full CI must run against the head including reconciliation**, not just the earlier 1427-pass lifecycle CI at `92e7516`. No unrelated app behaviour or real user data changed.
