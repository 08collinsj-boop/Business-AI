# Booking concurrency and expiry correction — 26 October 2026

Status: verified isolated code and staged SQL; **not deployed or approved for shared Development**.

## Root cause and correction

The existing booking helper separately read for a pending request and then inserted. Two overlapping requests could both observe no existing booking. Booking, history and audit writes were also separate operations. An interleaved mocked REST reproduction produced two bookings and two audit events.

Scoped-pilot requests now use one service-only PostgreSQL transaction through `request_colzo_pilot_booking`. The server validates the returned tenant, lead, ID, state, source and creation flag. Missing, failed or inconsistent RPC results fail closed without falling back to the old insert path. Legacy non-scoped behavior remains covered.

The staged proposal serializes requests for the same business/lead, locks the grant against revocation, validates an active grant with an exact 336-hour interval, validates tenant ownership of the lead, and atomically writes booking, history and audit. A partial unique index also protects against an older writer racing the RPC. A failed audit rolls back the entire operation. Anonymous and authenticated client roles cannot execute the function; only service_role can. It does not broaden client table permissions.

The first native PostgreSQL run found two expiry failures: a request could pass the initial grant check, wait on a lead or audit lock and resume after expiry. A final wall-clock expiry check after those operations now raises an authorization error, rolling everything back. The authorization point is the final check before function return; this is not a guarantee that a client receives the response or a transaction commits before the deadline.

Idempotency means one **pending AI booking request per business/lead**. Once that request is confirmed or otherwise leaves `requested`, a later request can create another booking. This is not a general client submission-key protocol and does not promise permanent deduplication after closure.

## Verification

- New focused regression suite: 8 passed, 0 failed, 0 skipped. Before implementation: 6 failed, 2 passed.
- Full `npm run verify`: **1,365 passed, 0 failed, 0 skipped, 0 cancelled**; application build passed; static/secret-pattern checks passed across **350 JavaScript files**.
- Native PostgreSQL 17.11: first expiry run 9 passed / 2 failed; final strengthened harness **11 passed / 0 failed**.
- Eight distinct native PostgreSQL backends overlapped while waiting for the same advisory lock. They produced exactly one booking, one history row and one audit event.
- Native checks also covered expiry while waiting for a lead lock, expiry while blocked inside audit, serialized revocation and subsequent denial, a legacy-writer unique conflict, atomic rollback after audit failure, anon/authenticated denial, foreign-lead denial and an independent business succeeding.
- The proposal and base access SQL were exercised against the reconstructed source schema, inside a transaction containing fictional records. All compatibility DDL/data were rolled back. Catalog hashes before/after matched; the pilot grant table remained absent afterwards.
- Independent read-only code review reran the 8 focused tests, checked evidence hashes and reviewed the native driver. No remaining Critical, Important or Minor findings were reported. The reviewer did not independently rerun the native cluster.
- The temporary native cluster stopped successfully; no PostgreSQL process remained.

Machine-readable native results, source hashes and limitations are in `BOOKING_CONCURRENCY_20261025.json`. The driver is `scripts/verify-colzo-booking-postgres.py`; it only creates a fresh disposable database on a private local Unix socket and never resets or drops an existing database.

## Release gates

`pilot-idempotent-bookings.STAGED.sql` is deliberately outside automatic migrations. Shared Development has not received this RPC or the base scoped-access schema. Scoped booking creation will fail closed until the reviewed prerequisites exist; code verification alone does not make this runnable in shared Development.

A read-only Development aggregate found zero existing duplicate pending AI booking groups at the time checked. Repeat the duplicate/dependency preflight at application time; the unique index affects existing writers too. Do not delete or rewrite duplicate rows to force installation. Obtain separate schema approval and verified recovery safeguards before applying either staged proposal. Confirm a trusted function owner and intended effective permissions, refresh the API schema cache through the approved release process, then test the exact deployed revision with authorized accounts.

These results use schema reconstruction and synthetic records. They do **not** establish genuine Development data/Auth/Storage restoration, real Auth/MFA acceptance, customer session acceptance, a matching Preview, mobile Safari acceptance or release readiness. Genuine source backup and restoration remain blocked on secure export access, an encryption recipient/private destination, Storage byte access and a safe complete restoration exercise. No shared data/schema, Auth settings, Production, older Pilot, billing or deployments were changed.
