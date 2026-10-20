# Colzo - no-cost backup preparation and isolated restore runbook
Date: 20 October 2026
Scope: Development first. No Production export, real data copying or paid infrastructure.

## Verified current state

- Supabase Development: Business-AI-Dev (mvwseobgkexzpmmkgcxe).
- Read-only backup listing: **zero managed backups**; Point-in-Time Recovery disabled.
- The PGlite migration test and a separate minimal PGlite probe were terminated by SIGKILL in the approximately 1 GB test sandbox. This is not a real restore test.
- Supabase recommends manually exported off-site logical backups for Free-plan projects.
- A database dump is not a complete recovery solution: private Storage object bytes and configuration for Auth, Edge Functions, emails and connected providers require separate procedures.

## Implemented no-cost protection utility

The new scripts/colzo-backup-integrity.mjs secures an **already-existing** PostgreSQL dump using authenticated AES-256-GCM encryption, a random nonce and a private 32-byte key.

Operations:
- seal: encrypt local dump and refuse to overwrite existing backup.
- verify: stream-check encrypted-file integrity without writing plaintext.
- extract: recover to a new isolated file, only publishing it after authentication succeeds. This does NOT execute SQL.

It refuses empty, malformed, tampered or truncated archives, the wrong key, non-private plaintext dump permissions, symbolic-link inputs, source/output locations inside this Git repository, invalid keys and existing output paths. Output files use owner-only permissions.

The key is provided by a separate private environment variable named COLZO_BACKUP_KEY_HEX, containing 64 hex digits representing 32 random bytes. Keep it in an approved secret manager, separated from the ciphertext. NEVER paste it into GitHub issues, chat, shell history, Vercel, Slack or the repository.

## Synthetic recovery drill - completed

The automated test seals a synthetic fixture, verifies it, extracts and compares hashes, and tests wrong-key, tampering, truncation, unsafe paths/permissions and overwriting attempts. This proves cryptographic integrity and extraction behaviour, **not** recovery of an actual database or real customer records.

## Owner-approved real Dev backup - NOT performed

Before running any actual backup, get explicit approval to export private Dev records and identify an approved off-site encrypted location, retention policy, owner/key-recovery arrangements and a trusted device. Do not export real business data into this ephemeral assistant sandbox.

1. Identify the exact Dev project ref, not the Pilot or Production target. Use a trusted device with Supabase CLI, its required Docker runtime, PostgreSQL client tools, available disk space and secure local credentials.
2. Create a private working directory **outside Git** with umask 077 and mode 0700. Store database credentials only in approved protected facilities. Avoid exposing database passwords in command-line flags or process listings.
3. Following the official Supabase CLI guide, export **separate roles, schema and data SQL dumps**. Use the role-only, default schema and data-only/use-copy modes with the appropriate managed-schema exclusions. Supabase CLI excludes important managed schemas; do not mistake these files for a complete restore of Auth/Storage.
4. Encrypt **each** SQL file immediately using the utility and verify each encrypted artifact. Place encrypted archives off-site and protect the recovery key separately. Remove private plaintext using an approved deletion policy after successful verification.
5. Record sanitized inventory only: snapshot date, Dev ref, artifact types/sizes, encrypted checksums, encrypted off-site custodian, tool version, verification result, planned recovery objectives and gaps for Storage/Auth. Do not include secrets or business data.
6. **Do not change Production or create a potentially chargeable recovery project.** Get explicit approval for any paid infrastructure.

### CLI examples on a trusted private machine only

The COLZO_BACKUP_KEY_HEX environment variable must already be set from a secret manager. These are sample paths, not live commands executed here.

    umask 077
    node /path/to/Business-AI/scripts/colzo-backup-integrity.mjs seal /private/colzo/schema.sql /private/encrypted/schema.sql.czbak
    node /path/to/Business-AI/scripts/colzo-backup-integrity.mjs verify /private/encrypted/schema.sql.czbak
    node /path/to/Business-AI/scripts/colzo-backup-integrity.mjs extract /private/encrypted/schema.sql.czbak /private/isolated-restore/schema.sql

Repeat for roles and data.

## Isolated database restore - NOT performed

1. Get approval for an entirely isolated restore target. Do not restore into Dev, Pilot or Production.
2. Verify and extract encrypted roles/schema/data files in a private working directory on a trusted device.
3. Follow the official Supabase CLI restoration order and managed-schema precautions. Check PostgreSQL extensions/default grants. **Do not replay historical SQL files blindly:** Dev migration registry versions differ from Git filenames but the lead-version function and trigger already exist.
4. Verify counts, relations, functions/triggers and tenant permission checks using synthetic businesses. Record real Restore Time Objective (RTO) and Recovery Point Objective (RPO) results.
5. Separately restore/reconfigure private Storage object bytes, Auth settings/identities where applicable, email delivery and connected provider settings. SQL files alone do not guarantee these.
6. Keep verified encrypted off-site copies and separate key recovery under an approved retention policy. No public beta until actual recovery coverage is demonstrated.

## Open launch blockers

- Real Dev SQL dump NOT created; zero managed backups listed and PITR disabled.
- No off-site custodian/key recovery or verified SQL restore.
- No full Storage/Auth recovery coverage.
- Dev leaked-password protection still disabled. Plan/cost and owner approval needed.
- Real signed-in owner/customer, two-business tenant and mobile acceptance pending.
- Production and public free beta remain NO-GO.

## Official docs

- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/guides/deployment/going-into-prod
