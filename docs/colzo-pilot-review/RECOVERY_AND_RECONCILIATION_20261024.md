# Development recovery and SQL reconciliation - 24 October 2026

Status: **BLOCKED for a real Development recovery certificate and for shared SQL changes.** Operator integration is not the next executable release step. This continuation started from draft PR #63 at `65a8f51d5990041c2f8bcdb296e85859c98bd8d9`.

## Verified findings

Development `mvwseobgkexzpmmkgcxe` was queried read-only. Production and the older Pilot were not queried or changed. Current inventory: 52 public tables, 560 public columns, 413 constraints, 173 indexes, 44 public/Storage policies, 22 non-extension public functions and five public triggers. Auth aggregate counts: 16 users, 16 identities, two MFA factors. Storage has three buckets and 12 object records. Storage records are not proof that the corresponding file bytes exist or are backed up.

The management backup inventory is empty and PITR is disabled. `walg_enabled=true` is not a user-restorable backup. The connected tools expose SQL results and configuration reads, but no usable source database connection credentials, downloadable full backup or authenticated Storage-byte export was established. No password or key was reset or rotated to work around this. **No complete private backup of actual Development was created.**

PostgREST exposes `public,graphql_public` with extra search path `public,extensions` and maximum rows 1,000. GraphQL runtime acceptance remains open. Auth configuration has signup enabled, email confirmation required, minimum password length 12, TOTP enrolment/verification enabled and refresh rotation enabled. Its site URL points to `https://business-ai-pilot.vercel.app/`; its redirect list also includes older application Preview addresses. These are configuration discrepancies requiring exact-SHA recovery/Preview review, not permission to edit shared settings. Provider configuration and secrets were not published.

## Every migration compared using SQL

`MIGRATION_SQL_AUDIT_20261024.json` covers all 57 files and all 59 ledger entries. The comparator ignores SQL comments and whitespace outside literals, preserves quoted identifiers/strings and dollar bodies, and retains statement boundaries. Raw and token SHA256 values are retained. It is deliberately conservative and is **not** a general SQL semantic-equivalence engine or ledger-repair tool.

- 46 repository files have a token-identical SQL match in the ledger, independent of names/versions; 46 ledger entries match those files.
- 11 repository files and 13 ledger entries have no strict token match.
- Two same-version/name pairs contain different SQL: the 8 October unattended-marketing constraints use guarded `DO` blocks in the repository and direct `ALTER TABLE` statements in the ledger. Their resulting constraint definitions match on a fresh fixture; their reapplication behaviour differs.
- Marketing schedules includes an extra `DROP POLICY IF EXISTS` in recorded SQL. The final policy definition matches in the tested reconstruction; replay behaviour differs.
- `save_public_enquiry` differs in comments inside its dollar-quoted body; the conservative comparator retains that difference. Recorded SQL reproduces the current function definition exactly.
- Strategy planning was recorded as two migrations rather than the repository's single combined migration. Do not mark either entry repaired solely because the final table exists.
- Two recorded `add_marketing_usage_limits` entries are materially different: the later permits an active entitlement with `expires_at IS NULL`; the earlier requires a future expiry. Later SQL supersedes the function. This is not a duplicate to delete by name.
- The unusual filename `20261010_pilot_free_starter_marketing.sql` has numeric version `20261010`; splitting at the first underscore avoids treating `pilot` as part of its version. Its disabled-by-default configuration table exists in actual Development without a matching ledger entry.

The exact captured SQL statements are preserved in `observed-dev-migrations-20261024.json`, outside automatic migrations. This file contains migration source, not customer records, Auth factors, object bytes or a backup. No historical repository migration or recorded migration was edited.

## Isolated PostgreSQL reconstruction

The repeatable runner attempted each migration in its own transaction and retained every failure. After the first failure it continued **for diagnosis only**, with that transaction rolled back. It does not count an incomplete chain as passed. Minimal Auth and Storage schema stubs are explicitly marked; they do not implement Supabase Auth or Storage services.

| Input chain | Attempts | Failed transactions | Result |
| --- | ---: | ---: | --- |
| Repository | 57 | 1 | BLOCKED: local runtime lacks `pg_net`; six real Dev tables and 66 columns are absent from this reconstructed source chain |
| Recorded ledger | 59 | 8 | BLOCKED: missing extension packages plus dependencies absent from recorded history |
| Recorded ledger plus six identified repository sources | 65 | 2 | BLOCKED for extensions; captured public-schema and effective-privilege comparisons match |

The missing ledger dependencies are `marketing_images`, `marketing_automation_settings` and review settings. Later recorded migrations fail when these dependencies are absent. The six added sources in the diagnostic candidate are:

1. `20260926233524_add_marketing_automation_images.sql`
2. `20260929124200_add_automatic_follow_up_settings.sql`
3. `20260929144034_add_review_requests.sql`
4. `20261004231500_add_business_public_profile_media.sql`
5. `20261010_pilot_free_starter_marketing.sql`
6. `20261019162954_colzo_lead_write_versions.sql`

All 57 source files were pinned to the starting SHA and checked against their Git blob hashes. The candidate combines the original recorded SQL with these six sources in numeric chronological order; it is an offline reconstruction, not an executable shared database repair plan. With those additions, **zero differences** remain in the captured public tables, columns, constraints, indexes, policies, function definitions and triggers. All **156 table privilege rows and 66 function privilege rows** for `anon`, `authenticated` and `service_role` also match after reproducing the captured platform default grants in the disposable cluster.

The repository alone lacks `colzo_clients`, `colzo_projects`, `colzo_quotes`, `colzo_whatsapp_demo_threads`, `customer_complaints` and `review_email_outbox`. It also lacks the Trustpilot settings/constraint extension and `claim_due_review_emails`. These are preserved in recorded SQL. The WhatsApp source is explicitly Development-only and must never be promoted automatically to Production/Pilot.

The candidate still fails `enable_marketing_scheduler_extensions` and `enable_pg_net_for_marketing_scheduler`: `pg_cron`/`pg_net` are not installed in this test runtime. No fake replacement extensions were created, no scheduler was enabled, and the extension steps were not declared passed. Full managed Auth/Storage schemas, sequences/default ACLs beyond the compared API grants, extension-owned objects, GraphQL, publications, cron jobs, provider secrets, object bytes and runtime configuration are outside the zero-difference claim.

Evidence: `RECOVERY_SCHEMA_AUDIT_20261024.json`, `RECOVERY_SOURCE_INVENTORY_20261024.json` and `MIGRATION_SQL_AUDIT_20261024.json`.

## Independent synthetic restore

`verify-colzo-recovery-roundtrip.py` ran against the reconstructed disposable database on PostgreSQL 17.11. It dumped the database in custom format and cluster roles without role passwords, then restored roles and data into a **different freshly initialised cluster** with a different bootstrap administrator. Both clusters listened only on private Unix sockets.

Ten checks passed. Counts and complete row fingerprints matched across all 57 tested public/Auth/Storage tables. Synthetic password/identity/MFA material and Storage metadata survived; each of two restored tenants saw exactly its own lead, and browser provisioning remained denied. The target cluster was stopped in the runner's `finally` block. This improves the earlier same-cluster restore evidence but **is not real Auth login/TOTP, Storage-byte recovery or a shared Dev backup**. Duration and archive hash are in `RECOVERY_ROUNDTRIP_20261024.json`.

The temporary execution environment restarted during an initial privilege-comparison attempt. It was rebuilt from the captured inputs, the final candidate and effective-permission checks reran, and machine-readable results were copied out before completion. That interruption is not counted as successful test evidence.

## Private source backup and restoration procedure

This procedure is ready for a controlled run; the actual-source run remains BLOCKED. Use existing free/local infrastructure, not a new hosted project or branch.

1. Establish a secure, authenticated, read-only source-export connection for **Development only** in the execution environment, with permission to dump all required application/Auth/Storage metadata and role definitions. Confirm project identity before export. Use a private service/password file or secret manager; do not paste credentials into chat, command arguments, PRs or logs. Do not reset a shared password to obtain access.
2. Use a private `0700` workspace and `0600` files on encrypted local storage. Capture one consistent PostgreSQL snapshot with PostgreSQL 17 `pg_dump` custom format covering all required schemas and records, plus role definitions with passwords excluded and all ACL/default-ACL/sequence/extension metadata. Retain the dump manifest, migration SQL, catalog fingerprint, exact snapshot time and server versions. Abort on incomplete access or any dump warning that affects completeness.
3. Separately inventory and download every Storage object through an authenticated Storage/S3 read path. Keep bucket/key/version/size/ETag and SHA256 for every byte stream. Use opaque local filenames rather than trusting object keys as local paths. Compare the database's Storage snapshot with downloaded versions and a fresh post-export inventory. Concurrent replacements/deletions or missing versions make the capture incomplete; retry a new capture rather than claiming consistency.
4. Capture private Auth/PostgREST/Storage settings, enabled providers, email/redirect templates, hook configuration, extension/publication/cron definitions, Edge Function source/configuration and relevant app environment configuration. Record which secrets are exportable, masked or external, and reference their independently recoverable secret-store entries. API configuration responses must be treated as secret-bearing. Database dumps alone do not recover these services. MFA encryption/signing material must be recoverable or a separately reviewed recovery/re-enrolment strategy must be tested; fixture row preservation does not settle this.
5. Seal the complete bundle with authenticated encryption to an operator-held recovery key outside the bundle; retain two private copies and a SHA256 manifest. Verify decryption into another private directory before any restore. Do not upload real data/Auth secrets/object bytes into GitHub, public artifacts, a generic file share or application logs. Document retention and deletion of plaintext after verification.
6. Prepare a free **offline isolated Supabase-compatible stack** with PostgreSQL 17 and required extensions/Auth/Storage versions. Start with empty databases and buckets; bind services locally and disable outbound SMTP, webhooks, payment/AI calls, schedulers and provider jobs before restoring data. Isolation must be established externally, because restored configuration can reintroduce jobs/secrets. Never point the app at shared Development during a drill.
7. Restore roles, complete schema/records/sequences and object bytes; apply essential local configuration with local-only URLs. Fail on restore errors, unresolved owners/extensions, missing files or masked-secret dependencies. Do not ignore errors as normal. Record restoration duration, recovery point, manifest hashes and exact version mapping.
8. Compare complete per-table counts and canonical row fingerprints, sequence state, foreign keys, RLS/policies, effective grants, function bodies, triggers and extension objects. Recheck all Storage bytes and metadata. Verify the restored Auth identity links and a consented test account's email/password/TOTP/reset/recovery/session behaviour without contacting real recipients. Preserve the deletion/anonymisation/retention decisions that apply to the chosen recovery point.
9. Run two-tenant owner/customer and negative direct API/GraphQL/Storage checks on the restored stack; test expiry/revocation and privileged server paths separately. Reconcile configuration discrepancies, including the older Pilot Auth URL, only within the isolated target during this task.
10. Record every outcome as passed, failed or blocked, stop the isolated services and retain the sealed bundle privately. A successful synthetic restore or metadata-only archive must never be substituted for this source recovery certificate.

Supabase's official restore guidance confirms that Storage object bytes and essential service configuration require separate recovery: https://supabase.com/docs/guides/platform/migrating-within-supabase/dashboard-restore . No paid backup service, branch or project was created.

## Repeatable commands

The scripts perform no network requests. Supply captured metadata privately and invoke them only against a new empty disposable cluster. PostgreSQL server lifecycle and the platform extension installation are explicit operator prerequisites.

```sh
node scripts/audit-colzo-migrations.mjs PRIVATE_LEDGER_JSON OUTPUT_JSON
python3 scripts/audit-colzo-recovery-postgres.py --bin PG17_BIN --socket PRIVATE_DISPOSABLE_SOCKET --port 55433 --ledger PRIVATE_LEDGER_JSON --catalog PRIVATE_CATALOG_JSON --privileges PRIVATE_PRIVILEGES_JSON --output OUTPUT_JSON
python3 scripts/verify-colzo-recovery-roundtrip.py --bin PG17_BIN --socket PRIVATE_DISPOSABLE_SOCKET --port 55433 --workdir NEW_PRIVATE_DISPOSABLE_DIRECTORY
```

Do not run the SQL proposals or observed migrations on shared Development. The reconstruction runner creates only explicitly named disposable databases, refuses a non-private socket or a TCP-listening server, and never reuses/resets existing targets.

## Regression validation

`npm run verify`: 1,285 tests passed, zero failures, skips or cancellations. React build passed; static syntax, secret-pattern and temporary-marker checks passed for 333 JavaScript files. `git diff --check` passed. The two added tests first failed before the offline comparator existed, then passed with the implemented comparison. PostgreSQL replay failures remain separately reported as BLOCKED, not counted as passing regression tests. Python runners were syntax-checked and executed in the disposable environment.

## Exact gates before operator integration

1. **Access and private capture:** secure read-only source dump and authenticated object-download access, recoverable essential secrets/configuration, encrypted complete bundle and verified decryption. Evidence: manifest, hashes, consistency/recovery-point record, complete Auth/Storage coverage and no secret exposure.
2. **Full compatible restore:** PostgreSQL 17 plus genuine `pg_cron`/`pg_net` and appropriate Supabase services in a no-cost isolated target. Evidence: zero restore errors, complete source-to-target data/byte/schema/ACL/sequence comparisons and real local Auth/recovery/tenant acceptance. Current diagnostic extension failures stay open until rerun successfully.
3. **Reconciliation review:** independently review the captured ledger, missing sources, split/superseded migrations, Development-only WhatsApp source and the disabled legacy free-pilot config. Prepare explicit forward-only corrections or a reviewed baseline/history strategy; prove old and fresh database paths in isolation. No automatic name-based ledger repair. The captured public-schema/privilege match supports this review but does not authorise shared writes.
4. **Recovery sign-off:** approve the recovery certificate and exact reconciliation proposal. Any eventual shared Development application requires separate authorisation under the task's current prohibition. Keep scoped provisioning disabled and existing team/provisioning guards enforced.
5. **Only then operator integration:** connect the private audited atomic workspace/grant workflow, approval/idempotency/status/recovery UI and operator identity without activating real accounts. Deployment, real identities, invitations and onboarding remain separate later gates.

No shared Development writes/restores, Production/older-Pilot operations, deployments, merges, invitations, account activation, provider messages or charges occurred in this continuation.
