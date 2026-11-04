# Colzo — verified recovery and revoked-session feasibility checkpoint — 31 October 2026

**Scope correction (owner confirmed 31 October): Full genuine backup-and-restore verification is a PUBLIC-LAUNCH gate, not a blocker for the controlled 14-day pilot.** This document records metadata-only Dev observations and exact operational dependencies. It is NOT a backup, an actual restoration, a successful JWT replay test, an authority to modify database permissions or an approval to deploy. The pilot still requires independently tested access/security, owner-approved tenant data return and retention terms, support, disclosure of the unverified recovery risk, and separate activation authorisation. Do not use these facts to bypass owner consent, create billed resources, export private records, read secrets, alter Production or invite real businesses. Other live pilot gates remain NO-GO.

## Scope and immutable baselines

- GitHub existing [draft PR #65](https://github.com/08collinsj-boop/Business-AI/pull/65), branch `fix/colzo-pilot-release-gates-20261026`.
- Last independently tested code before this **documentation-only** update: `a33f051004b5a47c16677e8609dab3b8d64da322`, [exact CI 41251612323](https://github.com/08collinsj-boop/Business-AI/actions/runs/41251612323): **1,579/1,579 Node tests, 17/17 isolated native PostgreSQL checks, full build/static/secret checks pass**.
- Existing approved **SSO-protected** READY Development Preview remains on older code `f6a1d4a5eb474683d9cbb93b602c3fe637423ef5`: deployment `dpl_2DaFUff2NKLP35xS32KXjPdnzLbX`, https://business-dgt8c4dmz-buisness-ai1.vercel.app/ .
- Only approved Supabase Development project ref `mvwseobgkexzpmmkgcxe`; no new project/branch, deployment, role grant, configuration, secret rotation or extra spending authorised. Existing 10/11 Nov natural-expiry fixtures and 12 Nov task are preserved.

## New actual Development recovery inventory — management API, read-only

The connected authenticated Supabase Management API was called for exactly this Dev ref with **list backups, list existing branches, health Auth/DB/REST/Storage**. Independent returned fields:

| Field | Observed result |
| --- | --- |
| Managed project backup list | `backups: []` (zero listed artifacts) |
| PITR | `pitr_enabled: false` |
| WAL archiving flag | `walg_enabled: true` — **not** evidence of a downloadable or restorable backup |
| Existing Supabase Dev branch list | `details: []` |
| Project region | `eu-west-1` |
| `auth`, `db`, `rest`, `storage` health | All `ACTIVE_HEALTHY` |

These results reconfirm the [29 Oct recovery preflight](RECOVERY_SOURCE_STATUS_20261029.md) and identify **no existing managed backup or isolated Supabase restoration destination**. Service health is not recovery proof. This checkpoint did **not** read Auth users/sessions, customer data, object bytes, service role secrets, database passwords or backup content.

Official Supabase guidance: Free projects have no automatic managed daily backups; operators can make a manual logical backup with `supabase db dump` / `pg_dump`. Cloud database backup files cover database metadata but **not the actual binary Storage objects**, which must be backed up independently. A logical restore of a real project needs an appropriately secured target, data integrity validation, actual Auth functionality, Storage object bytes and explicit role/function/privilege checks, not just SQL catalog counts.

References:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/kb/faqs/platform/free-plan-backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

### Existing source tooling inspected; exact capability boundary

- `scripts/colzo-backup-integrity.mjs` encrypts and verifies a **pre-existing** local backup with AES-256-GCM using an externally supplied private secret. It does **not** fetch or dump source data, produce storage-byte backups or restore a database.
- `scripts/audit-colzo-recovery-postgres.py` and `scripts/verify-colzo-recovery-roundtrip.py` replay schemas and minimal fictional Auth/Storage fixtures into a disposable PostgreSQL 17 environment. That is **synthetic**. It is explicitly not actual GoTrue MFA/sign-in, source database row backup or Storage object-byte restore.
- Current chat execution environment preflight (no network or secret use): `node` and `npm` available; **`pg_dump`, `pg_restore`, `psql`, `supabase` CLI and `docker` unavailable**. Earlier Codex Cloud TCP connection to Supabase was blocked. This environment has no verified authorised PostgreSQL source credentials or secure destination for a real dump.

### Exact remaining backup decision (must be approved separately)

1. Identify an existing, **£0 extra cost**, securely controlled execution environment with PostgreSQL 17 tools and authenticated access to the Development **session pooler or supported direct connection**. Do not reset any passwords to work around missing access, expose connection strings in CI/job logs, copy keys to source control, or bypass network restrictions.
2. Approve an encrypted private source snapshot method capturing database roles, full schema, constraints, extensions, migrations, material tenant data where authorised and relevant Auth user/identity/MFA metadata. Handle Auth secrets under owner-approved private controls; never ask an agent to read/display them.
3. Independently capture **Storage object bytes**, bucket metadata and access controls. A PostgreSQL dump of `storage.objects` alone is insufficient.
4. Establish an existing isolated, *zero-spend* restoration destination that cannot overwrite or mutate shared Development or Production. No branch/project creation until cost and owner permission separately confirmed.
5. Actually restore and check record/row hashes **without publishing private content**, cross-tenant RLS, authenticated sign-in/MFA, object-byte hashes, grants/revocation, migrations and application behavior. Record evidence, safe rollback/destruction of disposable destination and accountable RPO/RTO signoff. If missing, mark **BLOCKED** rather than GO.

## JWT session replay/revocation feasibility — read-only Dev SQL

A single `BEGIN READ ONLY` / `ROLLBACK` SQL metadata query checked server version, existence and permissions for `auth.sessions`, and names of session-related **public** routines. It did not select session rows, tokens, MFA or user data.

| Field | Result |
| --- | --- |
| PostgreSQL | `17.6` |
| `auth.sessions` table exists | yes |
| `service_role` can use `auth` schema | yes |
| `service_role` direct `SELECT` on `auth.sessions` | **false** |
| Existing public RPC named for session/revocation lookup | **none found** (only unrelated pilot booking functions) |

Current `lib/auth.js` calls Supabase Auth `/auth/v1/user` for every authenticated request; `requireBusinessMember()` subsequently re-reads memberships for each request, and when `COLZO_SCOPED_PILOT_ACCESS=true` checks the current approved and unexpired pilot grant. The existing isolated `tests/colzo-session-expiry-acceptance.test.mjs` tests grant expiry and mock membership/identity removal. **Those tests are not live, issued-JWT replay acceptance.** An unexpired JWT may remain usable after signout depending on the Auth implementation and verification path; current Supabase guidance recommends independently validating `session_id` against `auth.sessions` for high-assurance immediate-revocation needs.

References:
- https://supabase.com/docs/guides/auth/sessions
- https://supabase.com/docs/guides/auth/managing-user-data

**Do NOT grant `service_role` SELECT on all `auth.sessions` or expose `auth` schema to the REST API to make this work.** An exact, narrowly scoped and reviewed, server-only session-validation mechanism (e.g. an appropriately restricted internal function exposed only through the intended authenticated backend path) requires a **separately approved, tested migration and permissions audit**. Drafting code that depends on such a function is not proof of live revocation. Do not claim that current `getUser` is or is not sufficient for the required security guarantee until actual signed-in retained-JWT tests or supported Auth behavior confirm it.

### Exact G3 test needed with legitimate accounts, no secrets exposed to agent

1. Use **two independently legitimately issued** owner/fictional-QA signed-in sessions, each with their own private MFA/AAL2 and business membership, and complete the QA account's current DPA acceptance.
2. Record responses only (401/403/200 where appropriate, redacting all tokens/customer payload) for same-tenant authorized and cross-tenant read/write, forbidden roles, and expired scoped grant.
3. Explicitly test **the same retained valid access JWT immediately after legitimate sign-out or approved targeted session revocation**, then after JWT expiry. Do not substitute a mock bearer token or raw service-role request and call it success.
4. For acceptance require independent confirmation that revoked/stale sessions cannot perform protected operations before access-token natural expiry, or document the actual residual window and owner-signed security/risk decision. Do not assert guarantee from Supabase `getUser` alone or a static file inspection.

## Release state and next actions

Public-launch full recovery **BLOCKED** (no backup listed and no validated source/isolated destination), but **NOT a controlled-pilot GO gate**; pilot G5 data-return, retention and recovery-risk signoff still pending; G3 actual revoked JWT behavior **NOT RUN**; G2 independent QA MFA/DPA **BLOCKED**; G6 new deployed f6 owner enquiry valid and stale-save acceptance **PENDING**; G4 original natural expiry **NOT YET DUE**; G7 operational signoff/real-business activation **BLOCKED**.

No changes to PR application code or existing CI tests in this documentation-only checkpoint; **do not rerun the 1,579-test suite solely because this file was added.** Any future Preview deployment of `a33f0510` requires exact-SHA separate approval and explicit actual browser testing. Preserve draft PR and £0 cost. **NO-GO.**
