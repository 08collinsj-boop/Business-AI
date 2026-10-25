# Colzo readiness continuation — 25 October 2026

**NO-GO remains for genuine onboarding.** This continuation closes a schema-replay runtime blocker and prepares a further upload capability correction. It does not approve shared SQL, deployment or accounts.

## Source and integration

Fresh remote verification found PR #63 open/draft/unmerged at `db4e5ebc7cfb719615118c9efafcaf23f848767e`, superseding the earlier `4ef8bb3` checkpoint. Reviewed the three intervening commits: `4c8931a` Knowledge upload/finalisation restriction, `3e73ff6` auxiliary Marketing gates and `db4e5eb` Voice lock. The previously published integration branch remains `904abd210d63e5609b162d64cb430e3f64d373b4`.

New isolated branch: `fix/colzo-pilot-continuation-20261025`. Local security commit `9278cdb6724ed4c3f4a5549676dc2b7251bcb440`; reconciled two-parent merge `4b20b8ad4d2ddeea2385021064ecbad0bd5fb5ea`. It preserves the current PR head, complete website integration and deferred-reply exclusion. No shared branch or PR source was updated.

Signed upload capabilities can remain usable for two hours without rechecking account access. Current PR #63 already blocks Knowledge upload/finalisation. The combined correction preserves that guard and adds the equivalent profile-image token restriction plus native capability-aware controls. Manual facts/review, profile text and existing-image removal remain subject to existing permissions. Positive tests verify legacy token issuance with scoped mode off. No live token was issued or exploited. See `STORAGE_UPLOAD_SECURITY_20261025.md`.

Help copy now marks Marketing outside the scoped free pilot, states paid subscriptions are unavailable/no card/no automatic conversion, and explains manual Knowledge facts in the scoped pilot. Guides remain present. No live website was changed.

## Exact source verification

- `9278cdb`: 1,346 tests passed; zero failures, skips or cancellations; build passed; 346-file static verification passed.
- `4b20b8ad`: **1,350 tests passed; zero failures, skips or cancellations; build passed; 349-file static verification passed; exit 0.** This includes the three newer PR #63 boundary suites.
- Focused combined boundaries: 12 passed; final new storage capability test file: 8 passed.
- Final documentation-only additions have no application/test/config difference from `4b20b8ad`; final static/diff checks recorded separately.
- Full verification after workspace recovery supersedes the earlier incomplete/unretrievable run. No historical interrupted log is treated as a complete pass.
- Automatic deployment is disabled for the new fix branch in both Vercel configurations. No merge into shared Development/Production, deployment or real account activation.

## Database diagnostic result

Read-only Development catalog again has 71 relations, 560 columns, 413 constraints, 173 indexes, 44 policies, 22 non-extension public functions, five triggers and seven extensions. Sorted Python JSON hash remains `dcc095adcd0d85a4382f797dc97b766db76dec393e2095c1510e78274452ed42`. All 59 fresh recorded statement arrays equal the archived capture. Neither migration divergence/history was altered.

Downloaded the official free portable PostgreSQL 17.11.0.006-r0 archive (89,500,152 bytes), verified SHA-256 `f3a4389c92c550597cacf8c71c74af025b8e75259753c4e78bb5014e6f29e6f2`, extracted with bounded streaming and archive path protection, and ran PostgreSQL 17.11 as the existing unprivileged `nobody` account. The local executor could not run a non-root server; the existing disposable connected executor could. No new infrastructure or paid service was created.

Two newly initialised empty clusters were used sequentially. First proved real pg_cron/pg_net replay, but its pg_cron namespace and other platform extensions differed. The second supplied all seven source platform extensions with their source versions/namespaces before application migration replay. The final evidence is the second run, not the less complete first run.

Final run: **65/65 candidate migration steps replayed successfully, zero failures.** Seven compared schema categories (tables, columns, constraints, indexes, policies, public functions and triggers) have zero missing, additional or changed entries under the existing comparator. All 156 selected effective table/role rows and 66 public function/role rows match. All seven extension names, versions and namespaces match. These effective-privilege checks do not establish equality of every platform role, default ACL or schema grant.

Source baseline: pg_cron 1.6.4 in pg_catalog; pg_net 0.20.4, pg_stat_statements 1.11, pgcrypto 1.3 and uuid-ossp 1.1 in extensions; plpgsql 1.0 in pg_catalog; supabase_vault 0.3.1 in vault. Cron launch was disabled, job count zero, pg_net request queue zero and TCP listen addresses empty. Both servers stopped cleanly with exit 0; no postgres process remained.

The repository audit runner was not changed. A scratch copy selected the candidate chain only, because pg_cron is configured for one database, and appended the explicit platform baseline to its minimal bootstrap. Exact baseline, per-statement hashes/results, comparator output and limitations are in `EXTENSION_REPLAY_20261025.json`. Source runtime is PostgreSQL 17.6; this isolated runtime is 17.11. Runtime/configuration identity is not claimed.

**This clears the missing real-extension diagnostic blocker only.** No actual Development records, Auth secrets/users/MFA/session state or Storage bytes were backed up or restored. Minimal Auth/Storage stubs are still present. No restored real row count/checksum, file-byte integrity, genuine login/recovery or complete configuration/role recovery acceptance exists. A complete private encrypted real-data recovery drill remains BLOCKED.

## Actions and release gates

External reads: GitHub current heads/PR state; Development catalog, full migration statements and effective-privilege metadata; official public runtime archive. Isolated writes only: Git review branch/evidence and disposable local schema replay. No shared SQL/history repair, Auth changes, public deployment, Facebook publication, prospect message, invitation or charge.

Engineering, database recovery, security, website, pilot accounts and marketing remain **BLOCKED** for onboarding. Paid launch remains **FAIL/deferred**. The remaining owner actions are unchanged: secure private export/encryption arrangements; legal identity/iubenda/retention review; separately approved exact-SHA Preview and synthetic identities for MFA/recovery/two-tenant acceptance; physical iPhone acceptance; later exact business/invitation approval. No passwords, tokens or backups should be pasted into chat.
