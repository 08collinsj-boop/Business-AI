# Colzo — pilot acceptance evidence ledger (14 November 2026)

**Status:** External pilot **NO-GO**. This is a documentary reconciliation, not a new release test or a legal approval.
**Repository:** `08collinsj-boop/Business-AI` | **Draft PR:** #77 (stacked on draft #76) | **inspected branch head before this document:** `5d2e7ca9b3307b64862c0438f14c4e0416faa250`.
**Development:** Supabase `mvwseobgkexzpmmkgcxe`; do not touch Production, billing, live data, access grants, privileged Preview settings, migration state, activation or PR merge.

## Evidence levels — do not promote reports to independently inspected runtime proof

1. **Previously independently recorded in PR #77:** QA-001 immediate/logout DOM containment, targeted D01–D03, core business workflow testing. Record: PR comment `6853973334`, exact tested source `e9937ff`. Retain this evidence; targeted retest only when subsequent code materially affects those flows.
2. **Latest operator-provided Work results (13 November; redacted independent report not separately reproduced by this source-only review):** desktop wrapping correction in `5d2e7ca` with authenticated visual retest; `1,879/1,879` regression tests reported; two-session logout passed. Reported fixture work: three fictional users with genuine AAL2; 57 live Data API checks covering tenant isolation and denied writes; unexpired-token denial after logout, refresh invalidation, membership removal and fixture-grant expiry. All fixture users disabled, temporary memberships removed and temporary grant revoked. Preserve these as **reported PASS in tested scope**, not proof of protected native-app owner/admin/member or natural JWT-expiry acceptance.
3. **GitHub Actions evidence:** earlier exact run `43421773958` passed `1,878/1,878` at `e9937ff`. This session's GitHub workflow-run lookup returned no PR-triggered run for `5d2e7ca`; therefore `1,879` is not independently reconfirmed by that endpoint.
4. **Chromebook emergency backup (operator screenshots and results, 14 November):** Development PG17 custom dump created; encrypted `age` database archive decrypted byte-for-byte against plain original; copied-back USB encrypted archive matched via SHA-256. Four downloaded Storage ZIPs had 12 file entries total, ZIP archive integrity OK; packaged/encrypted `tar.gz.age`, decrypted byte-for-byte and copied-back USB encrypted archive matched. These observations support **backup preservation and archive integrity**, **not full database/Storage/Auth recoverability**. Do not upload archive bytes or passwords to this repository.
5. **Independent hosted read-only Supabase review (14 November):** public 53 tables with RLS on all 53, Auth 27 tables, Storage 10 tables, 20 Auth users, 7 MFA factors, 3 buckets and 12 Storage object metadata entries; installed extensions include `pg_cron`, `pg_net`, `pg_stat_statements`, `pgcrypto`, `supabase_vault`, `uuid-ossp`, `plpgsql`. Current counts are NOT guaranteed to match the earlier backup snapshot.

## What is actually left

| Gate | Position | Completion evidence still required |
| --- | --- | --- |
| Desktop core workflows, prior QA-001/D01–D03 | **PASS in recorded scope** | Do not rerun automatically; only if relevant code changes |
| Direct Data API isolation and selected revocation | **Reported PASS (57 checks)** | Preserve actual report/status matrix; no need to repeat passing scope |
| Protected **native application** role/tenant browser tests | **OPEN** | Authorised new owner/admin/member and second-business AAL2 access, actual own/foreign reads/writes denied in protected app, cache/DOM and role controls; previous fixtures have been disabled |
| Natural JWT expiry | **OPEN** | Real expiry naturally reached and separately recorded; distinguish token expiry from logout/revocation |
| Genuine mobile and whole-desktop Stitch acceptance | **OPEN** | Real iPhone/Android/touch/keyboard/safe-area/authenticated readback, desktop comparison and redacted evidence. Device emulation was blocked; do not bypass |
| Development disaster recovery | **PARTIAL / release gate BLOCKED** | Isolated full restore of actual dump with roles/extensions, RLS, Auth/MFA factors, Vault dependencies; actual Storage file bytes mapped against source bucket/object keys, tested independent extraction/recovery, rollback owner and redacted receipt |
| ClickUp | **NOT ACTIVATED** | Only AFTER recovery gate and exact separate approvals: install Development SQL, restricted branch-only secrets, fictional OAuth provider app, create/update/readback, task conflicts, workspace isolation, disconnect/provider revocation |
| My Work assignments | **NOT ACTIVATED** | Separate assignment SQL approval after recovery; real owner/member assignment matrix, same-tenant constraints, explicit foreign assignee rejection |
| Support, privacy/DPA, retention, exit and consent | **OPEN** | Named monitored support and backup owner, incident/rollback ownership, reviewed published privacy/DPA/ClickUp processing roles, verified fictional tenant export/deletion incl. Auth/Storage/shared identity, participant consent and exact GO decision |

## Read-only security review (14 November)

- Supabase Security Advisor gave **six INFO** `rls_enabled_no_policy` findings. The six named tables were individually inspected using `has_table_privilege` and `pg_policy`: RLS enabled, zero policies, and **no direct SELECT/INSERT grants to `anon` or `authenticated`**. This is consistent with intentionally server-only/fail-closed access and is **not evidence of new exposure**. Review if access design changes. Advisory details: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy.
- Security Advisor also reported **WARN: Auth leaked-password protection disabled**. Current Supabase docs say it is **Pro-plan and above**; keep as a plan-dependent pre-pilot security action, not a covert upgrade: https://supabase.com/docs/guides/auth/password-security.
- Supabase Health Advisor returned no notices in this inspection.
- No source/runtime defect is inferred solely from an advisor warning. **No DDL, secret, auth flag, user grant, configuration or data writes occurred.**

## Release boundaries and next owner decisions

- **Safe now:** source-level verification, documentation, synthetic fixtures/tests, retrospective evidence consolidation, preparation of legally reviewable (unpublished) notices; a fictional-data demo may be shown with accurate limitations.
- **Do not change:** hosted Development schema until genuine independent recovery gate plus precise per-file approval; Production; payment/Stripe; pilot grants; public signup; customer data; privileged branch config; published legal terms.
- **Operator decisions needed:** suitable isolated recovery host/receipt, actual mobile device/browser and safe test identities if re-provisioning, separately scoped ClickUp/assignment approvals, monitored support/incident owner, privacy/DPA/participant approvals and final launch GO.
- **Scope choice:** a core-only pilot may defer ClickUp and assignments only with an explicit truthful scope amendment, but **does not waive** the security, mobile, recovery or operational gates.
- PR #76 and #77 remain **draft and unmerged**, and external pilot remains **NO-GO**.
