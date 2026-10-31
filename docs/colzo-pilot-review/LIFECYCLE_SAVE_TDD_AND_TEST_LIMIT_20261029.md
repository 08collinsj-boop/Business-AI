# Lifecycle-save confirmation correction — executed TDD and bounded verification (29 October 2026)

**Classification: undeployed Development PR code correction, not live acceptance.** Secure 14-day real-business pilot: **NO-GO**. No Production/Preview deployment, database mutation, auth change, data deletion, account, grant, invitation or spend was authorised or performed.

## Defect and reproduction

Original `lib/data-lifecycle-handler.js` used a service-role PostgREST request scoped to authenticated `business_id`, but:
1. A zero-row `PATCH` returned HTTP 200 with `null`, misleadingly indicating a successful save.
2. A service-role response containing a foreign business's policy was returned without a tenant-row verification.
3. A response containing the own business but not the requested new retention value was reported successful.
4. The `GET` path returned a foreign business's policy without checking the returned row's `business_id`.

This is an API acceptance/data-scoping defect, **not** evidence that PostgREST itself ignored the business-id predicate.

Added `tests/colzo-data-lifecycle-confirmation.test.mjs` with five focused synthetic cases: zero-row save, foreign-row save, stale/unconfirmed save, legitimate confirmed save and audit, and foreign-row read rejection.

**Red:** Before the fix, the test reported four failing cases (HTTP 200 where denial/confirmation failure was required). Legitimate confirmed save passed. This was observed in a disposable Node test process; no live customer records were used.

## Minimal correction

Change on PR branch:
- GET requires an array containing at most one tenant-owned row, or returns a safe generic 500 rather than disclosing unexpected data.
- PATCH zero-row response yields HTTP 409 without a success audit.
- PATCH requires exactly one row with matching server-verified `business_id` and all submitted allowed retention values before HTTP 200 and the success audit.
- Unexpected/foreign/inconsistent service-role response fails closed with generic HTTP 500.
- Retains the existing owner-only PATCH permission, field validation, and successful read/write contract. No public API or database schema additions.
- The `updated_at` field is not independently round-trip verified by this correction. No atomic compare-and-swap of policy version was introduced; concurrent-write protection would require separately scoped design and tests.

**Green:** With the smallest correction applied, the new five-case test suite passed, and the local focused set of six test files reported **35 tests passed, 0 failed**, including two-business/expiry/revoke-guard/operations compatibility.

**Independent readback:** GitHub `lib/data-lifecycle-handler.js` and new test file were independently read back after push. A separate isolated test environment then copied those **exact current GitHub bytes** over its checked-out branch snapshot and reran the same focused six-file command, reporting **35 passed, 0 failed** with exit status 0.

## Broad suite limitations — must not mark PASS

A separate isolated full verification attempt reported **1,390 total tests: 1,385 pass, 5 fail**, with failures at the *file harness* level for:
- `tests/colzo-fictional-demo-persistence.test.mjs`
- `tests/colzo-lead-version-migration.test.mjs`
- `tests/colzo-pilot-booking-idempotency.test.mjs`
- `tests/colzo-pilot-database.test.mjs`
- `tests/colzo-release-package.test.mjs`

These five files all depend on `@electric-sql/pglite` in-process PostgreSQL, directly or via a shared fixture. Retrying them separately in the sandbox again produced file-level failures before named assertions; a standalone `PGlite` construction succeeded but `SELECT 1` process was killed with OS exit `-9`, no JS exception. This supports an environment/process termination diagnosis, **not a proven application failure** and **not a passing database suite**. The sandbox had a constrained memory limit and no swap.

A later reduced-concurrency non-PGlite batch timed out or closed its execution connection; **no PASS is credited** for that incomplete attempt. Dependencies had been installed successfully from the existing lockfile, and the new source's focused tests pass, but **full build, `npm run verify`, and all PostgreSQL-dependent regression checks remain unverified for this head**. No CI status checks have been reported for the current code SHA.

Re-run the full package quality gate in a suitably provisioned isolated CI/native PostgreSQL environment, with version-pinned dependencies, **before** any further deployment proposal. Do not mask failures, alter regression assertions to pass, or infer live-security acceptance from the local tests.

## Remaining independent and private gates

- Legitimate QA account password recovery, correct independent sign-in, enrolled MFA/AAL2, DPA acceptance — **user-only private action**.
- Actual issued-JWT two-business API negative read/write/replay and protected AAL tests — **blocked by independent account/session and supported safe browser/API tools**.
- Corrected exact live fictional grant revoke/post-revoke denial — **separate exact-operation approval after prerequisites**.
- Natural true grant expiry — **await unchanged deadlines**; existing 12 November follow-up.
- Actual Auth/Storage/full source recovery and scoped tenant deletion — **not proved**.
- Owner/operator/contact and final data lifecycle decisions — **not approved**.
- Supabase security advisor warns leaked-password protection disabled — any Auth change needs separate approval.

**Overall decision:** fictional-data demonstration usable with existing deployed runtime; this new fix remains undeployed; secure real-business pilot **NO-GO**.
