# Data-subject export tenant-boundary correction — 29 October 2026

**Scope:** Undeployed code change in draft PR #65. No live records, grants, database settings, Production, Auth, Preview, data deletion or payments changed.

## Root cause and observed RED regression

`lib/data-subjects-handler.js` uses the service-role PostgREST API to fetch the owner-requested lead and related history, bookings and actions. It included the server-derived `business_id` in database query filters, **but did not independently confirm that the returned service-role rows actually matched the requested business and lead** before exporting them or starting an erasure. This is an application response-validation gap, **not evidence that Supabase itself returned a foreign record**.

The new synthetic `tests/colzo-data-subject-response.test.mjs` controlled the service response and exercised six cases:

1. A foreign business lead must not leave the API.
2. A different lead ID with the right tenant must be rejected.
3. A foreign-tenant history row must not appear in the export.
4. A mismatched lead reference in a booking must be rejected.
5. A correctly scoped lead plus three related arrays must export normally and audit once.
6. A foreign-tenant lead returned by an anomalous service response must not trigger any erasure PATCH.

**RED execution:** five negative cases failed against the uncorrected handler, producing HTTP 200 instead of the required safe failure; the legitimate export case passed.

## Small scoped code correction

- `leadForBusiness` now verifies an array with at most one row, that any returned row matches the server-authorised `business_id`, and that the returned `id` matches the requested lead ID.
- For GET export, the history, bookings and actions responses must each be arrays containing only rows with the same `business_id` and `lead_id`. Otherwise return the existing generic HTTP 500 without disclosure or success audit.
- An anomalous foreign lead read now fails before reaching the DELETE/PATCH operations. No attempt to bypass the owner-only auth gate or trust a client-supplied business ID.
- Preserves the existing ordinary legitimate export JSON shape, existing error style, audit semantics and non-pilot behavior.

**GREEN execution:** focused six-file Node test command reported **40 tests passed, zero failed**; includes new synthetic export coverage, lifecycle save confirmation, owner auth, two-business contract, runtime compatibility, operations. Existing PR changes and the new test were committed and independently read back.

**Additional quality gates:** a separate nineteen-file test slice covering scoped pilot, authentication, sensitive AAL2 routes, protected records, release/revoke guards and synthetic encrypted backup integrity reported **81 tests passed, zero failed**. This overlaps the 40-test slice; counts must not be added as unique totals. The local static check returned exit 0: 347 JS files checked for syntax/secret patterns/temporary markers. Colzo frontend build exited 0 with bundle length 228,622 bytes before compression. These were executed in an isolated local repo snapshot with current code corrections applied.

## Explicitly uncorrected destructive-data risk

**This is not proof that erasure is atomic or complete.** The existing DELETE code makes four concurrent service-role PostgREST PATCH requests to leads/bookings/actions/history, with no single transaction and no confirmed row-return validation. A network failure or one failed update can leave partially anonymised records; the API could report success despite zero matching associated rows. No live DELETE was executed, no data-subject erasure was accepted, and this GET/lead preflight fix does not solve those limitations.

Before treating erasure as a real-business supported feature:
1. Define the exact approved dataset and retention exceptions, including customer portals, uploads, backups and shared Auth users.
2. Use a reviewed tenant/lead-bound atomic database procedure, or a clearly controlled, auditable and recoverable alternative.
3. Validate positive and negative scoped mutations, rollback, concurrency, audit correctness and affected-row counts in disposable native PostgreSQL fixtures.
4. Obtain separate approval before any shared Development or real-business destructive operation.
5. Provide an accurate owner-facing policy and manual assisted request route; do not promise unverified automatic deletion.

## Full-suite and release boundaries

Earlier full `npm run verify` on this PR code lineage reported 1,385 passes and five file-level failures (1,390 total) in PGlite-dependent database suites. The embedded PGlite process was independently killed with OS status -9 on initial SELECT in constrained disposable compute. This is an **unresolved full regression gate**. The new 40/81 focused slices, local build and static check do not turn that into a full-suite PASS; no matching full suite or native database regression on the updated head has been verified.

The genuine QA-owner MFA/AAL2/DPA, real issued-JWT two-business/foreign-ID/replay, exact approved live revoke, natural expiry, full source/Auth/Storage restore, data deletion and final operator/legal lifecycle gates remain outstanding. **Secure 14-day real-business pilot: NO-GO.**
