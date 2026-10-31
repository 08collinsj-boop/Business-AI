# Business-AI-Dev recoverability preflight — 29 October 2026

**Scope:** actual Development Supabase project `mvwseobgkexzpmmkgcxe`. This is a safe metadata and backup-API inspection, **not a backup, archive, export of user records, or successful restore**. It does not authorise real-business activation.

## Actual platform backup check (read only)

The authenticated Supabase project-backups management API returned:

- `backups: []` — **zero listed managed backup artifacts**.
- `pitr_enabled: false` — **point-in-time recovery not enabled**.
- `walg_enabled: true`, but this flag is **not** an accessible, independently verified backup or point-in-time restore facility.
- Project region `eu-west-1`.

A separate service-health API reported `ACTIVE_HEALTHY` for the Auth, database, REST and Storage services. Health means availability, not recovery coverage. No settings, costs, plans, backups or source data were changed. Results independently checked on 29 October rather than copying the older inventory.

**Recovery outcome:** Full live-source recoverability remains **BLOCKED**, not PASS. Do not declare that a working backup exists based on PostgreSQL catalog metadata or WAL flags.

## Exact executable schema preflight

Committed [RECOVERY_SCHEMA_PREFLIGHT_20261029.READONLY.sql](RECOVERY_SCHEMA_PREFLIGHT_20261029.READONLY.sql) and independently fetched the complete file back. Executed the exact SQL contents in `BEGIN READ ONLY` / `ROLLBACK` against Business-AI-Dev through the authorised Supabase connector.

Results (counts of base ordinary/partitioned relations, not row counts):

| Schema | Tables | Indexes | Sequences | Views |
| --- | ---: | ---: | ---: | ---: |
| `auth` | 27 | 111 | 1 | 0 |
| `colzo_pilot_private` | 2 | 4 | 0 | 0 |
| `public` | 53 | 175 | 11 | 0 |
| `storage` | 8 | 20 | 0 | 0 |

All **14 expected essential relations** exist, including Auth users, identities, sessions, refresh tokens, MFA factors; Storage buckets and objects; business membership, lifecycle, legal acceptance and grant tables; and private audit. Database reports PostgreSQL major version 17, 88 public/private RLS policies and 34 public/private functions under this exact count definition.

This is a catalog-presence check only. It **does not** prove that all business records, Auth password/MFA secrets, Storage bytes, provider account settings, or critical operator configuration can be recreated from the deployed app or a source snapshot.

## Reconcile 24 October inventory

Previous [RECOVERY_SOURCE_INVENTORY_20261024.json](RECOVERY_SOURCE_INVENTORY_20261024.json) recorded `actual_public_tables: 52`; fresh catalog reports **53**. They were taken at different times and do not establish what changed, whether a migration created a table, or whether either inventory is exhaustive of external resources. The old snapshot must not be treated as a current restore manifest.

Old counts for policies/functions and overall tables may use different schema scope and object-kind rules than this new catalog query: **do not claim drift of 44→88 policies or 22→34 functions without an exact same-scope comparison.**

## What can be done without owner-only data access

- Catalog-only schema census: PASS.
- Backup API inventory and health query: PASS for **observability**, revealed no listed backups and PITR disabled.
- Prior 50-category QA fixture export/44 CSV roundtrip acceptance: RETAINED in its original narrower scope, not repeated.
- Synthetic/native PostgreSQL migration and rollback tests: RETAINED historical evidence; not a real-source backup restore.

## Genuine recovery gates before real pilot

1. **Source recovery method:** Identify an authorised existing, zero-additional-spend method to create a verified protected PostgreSQL source snapshot including roles/constraints/schema and appropriate tenant data. No paid upgrade, secret disclosure, service-role export to GitHub or snapshot of real customer payload in logs.
2. **Auth recovery:** Verify supported account, identity, MFA and session-handling recovery under Supabase Auth. A table catalog snapshot or JSON customer export does not prove valid user sign-in and MFA recovery.
3. **Storage recovery:** Capture and verify actual object bytes, metadata, access restrictions and reconstitution. `storage.objects` metadata alone cannot recover file contents.
4. **Critical configuration:** Document origin/redirects, provider exclusions, secrets-management restoration, tenant memberships, DPA/legal version references, migration fingerprints and audit history without publishing secret values.
5. **Isolated restore:** Perform an actual recovery in disposable, isolated infrastructure with supported tooling and no cost, test data consistency/Auth/Storage and rollback, then record a sanitized PASS with evidence. Do not run a destructive restore into shared Development.
6. **Owner sign-off:** Decide recovery point/recovery time expectations, retention/export windows, authorised support/data handlers and acceptable safeguards. No invented availability guarantees.

**Release classification:** Fictional-data demonstration retains GO; secure real-business 14-day pilot **NO-GO**; Production launch **NO-GO**. No Production, Auth, Storage, schema, grants, accounts, records, Preview deployment, billing or permissions modified. This entry is documentation and a read-only SQL audit tool only.

## Tenant-table export and isolated restore environment checks

Additional read-only `pg_catalog` inspection found **53 public tables**, split into **47 tables with a `business_id` column** and **six without one**. The six without a business key are `business_referrals` (references businesses), `businesses`, `customer_profiles` (references Auth users), `pilot_free_access_config`, `platform_incident_controls` and `user_legal_acceptances` (references Auth users). The earlier 50-category QA export rehearsal's **47 business-keyed tables** therefore still matches the current number of public tenant-keyed tables; this does not prove all user-global, shared referral, platform or external resources are included. It also does not explain the 52-versus-53 table count difference across dates.

Supabase's read-only branch-list endpoint returned **zero development branches** for this project. There is therefore no existing listed isolated Supabase branch where a genuine source restore can be tested now. No new branch was created because doing so can incur costs and requires separate approval.

These checks do not alter the backup-API results: zero listed backups, PITR off, restore not independently demonstrated.
