# Colzo Dev schema drift and recovery readiness - 17 October 2026

**Scope:** authorised read-only Supabase management API and Postgres catalogue.
**Outcome:** 56 checked schema conditions matched this snapshot, but DATABASE RESTORE IS NOT VERIFIED and public launch remains NO-GO.

## Current Dev evidence

- Expected project: mvwseobgkexzpmmkgcxe (Business-AI-Dev).
- Observation time (UTC): recorded in dev-catalog-evidence-20261017.json.
- Read-only catalogue: 37 columns, 31 constraints, 8 indexes, 4 privilege/RLS entries and 1 policy, restricted to four Colzo tables.
- Checked tables: colzo_clients, colzo_projects, colzo_quotes, colzo_whatsapp_demo_threads. All have RLS enabled.
- The three Colzo records tables deny direct anonymous/authenticated read and write grants. They rely on server-side membership authorisation.
- Projects and Quotes retain composite foreign keys tying a lead ID to its business.
- The synthetic WhatsApp table permits authenticated SELECT governed by an owner/admin-membership RLS policy. It is DEV ONLY, never a general release feature.
- Local schema drift code reports SNAPSHOT_MATCH, but liveVerified=false. This is not an authenticated two-tenant access check or ongoing monitoring.

## Backup inventory returned by Supabase management API

| Field | Observation | Interpretation |
| --- | --- | --- |
| Provider backups | Empty list | No listed provider-managed backup |
| Physical backup data | Empty | No accessible physical backup evidence |
| PITR | Disabled | No point-in-time restoration |
| WAL-G enabled internally | True | Not a user-restorable backup guarantee |
| Region | eu-west-1 | Metadata only |

**No usable restore has been demonstrated.** The provider inventory must not be confused with a backup test. No database dump, backup creation, restore or paid action was performed.

Supabase documents that database backups contain Storage metadata, not Storage file contents. The Dev Storage buckets in scope are business-knowledge and marketing-images (private), plus business-profile-media (public). Their objects were not accessed or reconciled.

Supabase documentation recommends independent off-site database dumps for Free-plan projects, while Pro/Team/Enterprise include scheduled backups. Restore to a new project on eligible paid plans can entail additional charges, does not transfer Storage files or all project settings, and restored cron/external jobs can run automatically. Owner authorisation and outbound-automation isolation are required before any restore drill.

Sources:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/clone-project
- https://supabase.com/docs/guides/platform/migrating-within-supabase

## Remaining release and recovery gates

1. Recheck the live Dev catalogue after Work changes. A saved snapshot cannot authorise launch indefinitely.
2. Plan how to keep a protected database backup and corresponding Storage objects outside public GitHub, without posting personal records or database secrets to chat.
3. Review the historical SQL archives and propose an authorised, forward-only migration plan for non-demo Colzo tables. The DEV-ONLY WhatsApp fixture migration must never be applied to Production.
4. With explicit approval and a known cost ceiling, test restoration into a completely isolated environment. Prevent cron jobs, pg_net actions, publishing and external messages in the restored copy.
5. Verify database schema, auth, tenant isolation, privacy deletion/replay, Storage objects, and actual recovery-point and recovery-time metrics.
6. Work completes authenticated 08collinsj Dev acceptance and final user-visible screen checks. Operator approves legal identity, commercial hosting, billing TEST when appropriate, deployment SHA and rollback.

## Local reproducible checks

- node --test tests/colzo-schema-drift-guard.test.mjs
- node --test tests/colzo-migration-snapshot-integrity.test.mjs
- npm run verify
- node scripts/colzo-schema-drift-guard.mjs docs/colzo-migration-recovery/dev-catalog-evidence-20261017.json

The final command intentionally exits nonzero until all backup/restore evidence exists. Even a matching schema is insufficient for public launch.

**No Dev/Production database writes, customer communications, paid services, merges, or legal changes were made.**
