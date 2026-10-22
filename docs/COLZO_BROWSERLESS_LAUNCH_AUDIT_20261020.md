# Colzo browserless Development audit - 20 October 2026

**Release state: NO-GO for public free beta and paid launch.** This is a current-state record, not a release approval.

## Scope and safety

- Repo: 08collinsj-boop/Business-AI
- Dev branch: feature/colzo-complete-ui-motion-20261017
- Latest tested/merged SHA: b18bcd3b855867a1d7c938a5696dec79230a2a5f (PR #36, incorporating Fluid Motion Pack PR #35)
- Vercel Preview: https://business-259b0yof4-buisness-ai1.vercel.app/
- Supabase Development project: mvwseobgkexzpmmkgcxe (Business-AI-Dev)
- No cloud browser, real sign-in, Production promotion, paid providers or real data modifications were performed during this audit.
- The evidence below does not certify production-readiness or live authenticated customer journeys.

## Verified

1. Marketing strategy editor integrated after approved animations via PR #36. Synthetic Chromium confirms saving planning-only settings preserves the weekly plan and disabled automation.
2. Non-PGlite local suite: 1,125 tests PASS, zero failures/skips. Further 25 focused post-merge tests passed. Build, static verification and syntax checks pass.
3. Merged Vercel Preview READY; /api/health HTTP 200/status ok, /api/public-config HTTP 200/auth enabled/correct Dev project. This confirms reachability, not real sign-in.
4. Supabase project ACTIVE_HEALTHY. Lead optimistic-concurrency updated_at column exists (NOT NULL, default now()), with the expected BEFORE UPDATE trigger and stamp function. Authenticated and anonymous roles cannot directly EXECUTE the function.
5. Security advisor: 8 informational RLS Enabled No Policy entries. All 8 tables have RLS enabled AND anon/authenticated lack direct SELECT privileges. Do not relax RLS just to remove a warning. API/tenant tests remain necessary.
6. Performance advisor: 33 unindexed-foreign-key findings; review actual query patterns/load before adding indexes.

## Unresolved launch blockers

| Gate | Result | Evidence / next safe action |
| --- | --- | --- |
| Restorable backups | BLOCKED | Supabase lists zero managed backups and PITR disabled. Establish a suitable authorised backup and rehearse an isolated restore before onboarding. No backup/restore attempted. |
| Password security | BLOCKED | Supabase advisor warns leaked-password protection disabled. Verify plan availability/cost and gain approval before any changes. |
| Owner/customer auth and MFA | UNVERIFIED | Hosted public config returns 200, but real owner/customer sign-in, session expiry, MFA, registration and email recovery need browser-led acceptance. Older MFA enrollment does not prove the newer Dev account enrolled. |
| Two-business isolation | UNVERIFIED | Synthetic tests do not replace real Dev write/read/denial checks with two isolated synthetic businesses. |
| Mobile and accessibility | UNVERIFIED | Animation works per owner; full iOS Safari forms/keyboard/scroll/VoiceOver/Reduce Motion acceptance outstanding. |
| Lead migration history and CI | RECONCILE | Live Dev column/function/trigger exist, but registry and repo migration version identifiers differ (25 file versions absent from registry, 27 recorded versions without matching file IDs). These do not prove missing migrations. Do not blindly replay DDL. PGlite migration test SIGKILL in 1GB sandbox is NOT CERTIFIED. |
| Legal/commercial hosting | OWNER DECISION | Confirm operator/contact, Terms/Privacy/DPA acceptance, ICO fee assessment, hosting licence and cost. Older runbook mentioned Vercel Hobby; current billing tier was not independently provided by read-only team metadata. |
| Payments | PAID LAUNCH BLOCKED | Stripe TEST mode checkout, webhook, entitlements, cancellation and billing portal require real certification. No live payment attempted. |
| Rollback and promotion | NOT STARTED | Pin release SHA, confirm production targets, secret scopes, recovery drill and get explicit owner approval before Production/domain switch. |

## Official remediation references

- Leaked password protection: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- RLS no policy advisory: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- Unindexed foreign keys: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

## Next safe sequence

1. Keep Development feature freeze and ensure Production stays untouched.
2. When interactive authenticated browser access returns, certify owner/customer paths with two isolated synthetic businesses, error and denial cases, persistence and screenshots.
3. Establish usable backup and isolated restore evidence including Storage/Auth considerations; do not restore a real database as a drill.
4. Resolve password security, hosting/commercial and legal approval gates.
5. Complete final iOS/Android checks and paid TEST-mode billing checks where applicable.
6. Make an explicit free-beta go/no-go decision; keep AI phone answering, WhatsApp and unattended publishing disabled until separately verified.

**No public launch is authorised by this audit.**

## Additional read-only verification (20 October 2026, after backup-toolkit and header PRs)

### Development SQL privilege and tenant-policy inventory

Inspected PostgreSQL system catalog metadata only; **no private table rows, identities or records were selected or altered**.

- Public schema has 52 ordinary tables; all 52 have RLS enabled.
- Anonymous role has 0 direct SELECT grants and 0 direct INSERT/UPDATE/DELETE grants on those 52 base tables.
- Public schema has no views/materialized views.
- Ten SECURITY DEFINER routines exist, and none permits direct EXECUTE by either anonymous or authenticated roles.
- Membership-based authenticated SELECT policies were inspected for business memberships, businesses, leads, bookings, business knowledge sources and knowledge items. The lead/booking/Knowledge/businesses policies check that a membership exists linking the row's business_id to auth.uid(). The membership policy checks membership.user_id = auth.uid().
- The eight earlier RLS-with-no-policy advisory findings apply to server-only tables without anonymous/authenticated direct read access. **Do not add permissive policies to clear that warning.**
- These checks are limited to the SQL role/policy layer. They do **not** certify server API authorization, signed-link access, service-role handling, custom JWT claims or live two-business isolation. Those remain mandatory acceptance tests.

### Vercel Dev-only response headers

PR #39 adds global X-Content-Type-Options: nosniff and Referrer-Policy: strict-origin-when-cross-origin without changing auth, customer routes, scheduled jobs, embedding permissions or existing legal noindex. The READY Development app Preview, customer account, health and public-config routes each returned HTTP 200 with both headers and existing HSTS. No restrictive CSP, frame blocking or microphone/camera policy was added without separate compatibility testing.

### Backup capability status

PR #38 added the synthetic-tested encrypted logical-dump protection utility and isolated-restore runbook. It does not connect to the database or create a real export. Four synthetic tests passed, including a multi-megabyte stream, wrong key, corruption, safe file creation and refusal to overwrite. Managed backup inventory still listed zero backups and PITR disabled at the earlier read-only check. Off-site export, escrow and real isolated restore are open launch gates.

### Paid security limitation

The Supabase pricing page says leaked-password protection is **not included in the Free plan**. The Security Advisor warning is still active on Dev. Before spending or changing the Auth policy, verify the actual organisation plan and discuss paid alternatives or an approved compensating-control approach. Free baseline TOTP MFA does not provide breached-password detection. Nothing was purchased or enabled in this audit.

### Current status

**Public beta NO-GO.** Real authenticated end-to-end QA, a proper recoverable backup/isolated restore, privacy/hosting/legal approval, iPhone accessibility testing and release freeze/rollback remain unfinished. Production remains untouched.

Official references:
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/guides/platform/backups
