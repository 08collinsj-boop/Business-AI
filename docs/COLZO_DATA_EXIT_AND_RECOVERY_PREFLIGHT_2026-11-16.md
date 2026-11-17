# COLZO — data return, retention and safe deletion preparation
**Internal operator runbook; unexecuted. 16 November 2026.** No SQL deletion, real export, new grants, policy publication or customer-facing certification is authorised by this document.

## Current known constraints
- `lib/colzo-data-exit-coverage.js` tracks **53** public table cases; current fictional draft export allowlists **40** and **defers 13**. Every exclusion must remain recorded; do not claim complete data return.
- Draft package and Storage manifest are **partial**: Storage references are not file bytes or signed download links. Non-public Auth, MFA, Storage metadata/bytes, Vault, provider accounts, shared-user relations and operational audit retention require separate treatment.
- The operator's Chromebook-related independent Development backup/restore work is **deferred**. Isolated CI PostgreSQL restore proves mechanics on disposable data only.
- `makeInertDeletionReview` is deliberately non-executable; do not mutate it into a live erasure path before an approved scoped design and restore receipt.

## Preflight checklist — no deletion or Production access
1. **Confirm legal controller/processor roles:** exact customer controller instruction, data categories, approved legal/privacy/DPA version, retention exceptions and authorised operator; customer consent/contract receipt stored privately.
2. **Establish exact scope:** identify the approved business UUID privately; map all 53 public table categories, indirect/shared tables, non-public Auth/MFA and Storage/provider assets. Block any unknown schema object or foreign tenant record.
3. **Freeze changes and reconcile:** approve a written maintenance window and point-in-time strategy. The current two-read draft reconciliation is **not** a transactionally consistent snapshot. Record count/hash/snapshot approach and handling for concurrent writes; no full-data-return claim until proved.
4. **Rehearse only with synthetic data:** run isolated source, SQL, and export-packager tests. Verify no credentials or excluded classes enter the ZIP/gzip. Use a different synthetic business to prove cross-tenant exclusion. The package must state PARTIAL and require independent recovery.
5. **Prepare encrypted backup and independent restoration:** preserve schema, actual rows, Auth/MFA, Storage object bytes and encryption key custody; independently restore into a separate controlled target. Inspect permissions, checksums, referential integrity and redacted evidence. Do not record private keys/passphrases in the repository.
6. **Plan return separately from deletion:** secure owner-authenticated delivery, integrity hashes, recipient confirmation, time-limited link, failure and retry process. Draft export `data_exit.draft_export` audit is not a receipt for a complete customer return.
7. **Deletion only after explicit approval:** dual-check operator/legal sign-off; idempotent transaction/batch plan covering foreign keys, references/shared users, Storage, external tools and allowed retention holds. Deletion must fail closed on a missing receipt or ambiguous tenant. **No executable SQL or deletion automation is included here.**
8. **Verify residuals and issue receipts:** counts and checksums before/after, relevant Auth/Storage/provider revoke confirmations, permitted audit/legal holds and customer acknowledgement. Avoid exposing personal data in public issue comments.

## Evidence register (all currently unverified unless linked privately)
| Evidence | Owner | Acceptance receipt | Current |
| --- | --- | --- | --- |
| Complete 53-table plus Auth/MFA/Storage/Vault/provider inventory | Operator + engineering | Versioned signed map | OPEN |
| Exact scope and data-controller instruction | Pilot customer/controller | Signed private authorisation | OPEN |
| Full consistent return and safe delivery | Engineering + operator | Encryption, checksum and receipt | OPEN |
| Independent Development DB/Auth/MFA/Storage restore | Recovery operator | Isolation, restore logs and rollback | DEFERRED / OPEN |
| Deletion safety and holds review | Legal + operator | Approved design and negative tests | OPEN |
| Erasure, provider revoke and residual verification | Recovery/operator | Secret-free receipts | NOT EXECUTED |

## Operator decision
External live-customer pilot remains **NO-GO** until compliant data exit and disaster recovery are independently evidenced and authorised. Do not treat a fictional gzip, a synthetic fixture or a test pass as real data-return capability.

## 17 November 2026 read-only Development public-schema reconciliation

**Evidence type: structural metadata only — no row reads, export, deletion, migrations or customer-data processing.** The Colzo QA operator compared `pg_catalog` public **base and partitioned tables** (`relkind in ('r','p')`) from Development project `mvwseobgkexzpmmkgcxe` with the 14 November snapshot in `lib/colzo-data-exit-coverage.js`.

| Structural item | Read-only result |
| --- | --- |
| Current public base/partitioned tables | **53** |
| Snapshot-classified tables | **53** |
| Unrecognised or missing names | **0 / 0** |
| Tables with `business_id` | **47**, all match snapshot classification |
| Special/shared relationship cases | **6**, none incorrectly classified as `business_id` |
| Public tables with RLS disabled | **0** |
| Non-public table counts, *not* exported | `auth`: **27**; `storage`: **10**; `vault`: **1** |
| Separate migration table count | `supabase_migrations`: **1** |

The query used **only system catalogue metadata**:

```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled,
  exists(
    select 1 from pg_attribute a
    where a.attrelid = c.oid and a.attname = 'business_id'
      and a.attnum > 0 and not a.attisdropped
  ) as has_business_id
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r','p')
order by c.relname;
```

A separate count of table relations in the known `auth`, `storage`, `vault`, `public` and `supabase_migrations` schemas produced the non-public counts above. These numbers are **not** an inventory of Auth identities, MFA factors, Storage object bytes, retention classes, provider data, audit holds, private schemas, views or row-level ownership. **RLS enabled is not proof that policies or cross-tenant requests are correct.**

**Regression protection added on draft PR #79:** `reconcilePublicDataExitSchema(observedTables)` in `lib/colzo-data-exit-coverage.js` consumes the same table-name/`business_id`/RLS boolean metadata and returns a fail-closed difference report for unknown, missing, misclassified, duplicate, RLS-off and malformed tables. It never connects to the database or changes data. `tests/colzo-data-exit-schema-drift.test.mjs` covers seven synthetic cases. Even a perfect match returns `pilotApproved:false` and `completeDataReturnVerified:false`. The separate 53-table + 7-domain + 9-control evidence receipt ledger is **not** marked verified as a result of this schema check.

**Release conclusion unchanged:** No full or consistent customer return, Auth/MFA/Storage/Vault coverage, provider revocation, independently restorable live Development backup, approved deletion or residual proof was established. External pilot remains **NO-GO**.

## 17 November 2026 — current draft-export column and primary-key audit (read-only)

This check is **separate** from the 53-table inventory reconciliation above. Using `pg_catalog` metadata only, the QA reviewer compared the current **40** `PREVIEW_DATASETS` allowlisted projections and the `TENANT_EXPORT_PRIMARY_KEYS` pagination/sort-key definitions from `lib/colzo-tenant-export-engine.js` with the Development project's actual public-table columns and primary-key ordinals. No application rows, owner identities, customer records or file bytes were queried.

| Metadata-only check | Result |
| --- | --- |
| Active allowlisted draft-export datasets | **40** |
| Explicit selected field references | **390 / 390 exist** in the current public schema |
| Expected primary-key ordering | **40 / 40 matches** current PostgreSQL primary keys |
| Missing/unknown dataset tables in the selected projection | **0 / 0** |
| Inspected selected tables with RLS disabled | **0** |
| Relevant unclassified public tables | **13 deliberately deferred**, unchanged; see `DEFERRED_PUBLIC_DATA_CLASSES` |
| Customer export, retention, secure delivery or deletion verified | **No** |

The read-only verification used `pg_class`, `pg_namespace`, `pg_attribute`, and `pg_index` to obtain table names, selected column names, primary-key ordinal order and the RLS-enabled bit. It did **not** evaluate row contents, RLS policy quality, API grants, role-specific owner/MFA acceptance, snapshot consistency or the customer's right to receive any particular field.

The added `lib/colzo-tenant-export-schema-audit.js` implements a pure `assessDraftTenantExportSchema(observedTables)` contract for metadata-shaped inputs. Missing tables/selected columns, changes to primary keys, RLS-off tables, duplicates, unexpected tables, or malformed catalog entries return an explicit structural failure. Seven synthetic regression cases in `tests/colzo-tenant-export-schema-audit.test.mjs` cover these behaviours; the checker also ran against live **metadata** and reported `schemaMatchesDeclaredExport: true`. Both `realExportVerified` and `pilotApproved` are **always false**.

This is **not** a permanent live schema polling task, an executable data-export feature or permission to enable the disabled draft export. Future checks must use a new independently obtained metadata snapshot. Full Auth/MFA, Storage *bytes*, Vault, provider-revocation, tenant-scoping/holds, encrypted return and independently restorable recovery gates remain outstanding. **External pilot NO-GO.**
