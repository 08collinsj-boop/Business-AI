# Colzo pilot acceptance continuation — 12 November 2026

## Assessment

**External pilot: NO-GO.** This record concerns source candidate `b6d82905ecdbfd3a334423a1787e8a663ed10dbe`. Automated verification and package readiness do not establish authenticated live acceptance.

## Fresh evidence (12:43–13:03 UK)

- Read `docs/COLZO_PILOT_WORK_HANDOFF_2026-11-12.md`, both current PR descriptions, root `AGENTS.md`, the exact proposed migration and connector setup documentation. No additional `docs/AGENTS.md` appeared in the pinned directory inventory.
- PR #77 branch was still `feature/colzo-connected-workspace-20261112` at the stated candidate. PR #76 and #77 were both draft and unmerged.
- GitHub Actions workflow_dispatch run [43215021343](https://github.com/08collinsj-boop/Business-AI/actions/runs/43215021343) completed successfully at this exact source SHA. The verify job `131171946907` passed dependency installation, isolated PostgreSQL 17 booking concurrency, isolated signup/capacity/replay SQL and Verify Pilot. Its logs report **1,792 tests / 1,792 pass**. This was inspected existing evidence; no new regression execution is claimed.
- Vercel deployment `dpl_Ff4Dc2rLa8FoBXtVku51WYtQp747` is READY, environment Preview, and its Git source matches the exact candidate and branch. Immutable deployment hostname: `business-nh8ctkxwg-buisness-ai1.vercel.app`.
- Fresh Chrome navigation initially redirected to Vercel login. The user completed the selected GitHub/Apple sign-in flow using secure credential entry. Vercel authentication then returned this browser to the protected [PR #77 branch Preview](https://business-ai-git-feature-colzo-connected-wor-64d936-buisness-ai1.vercel.app/). Protection was not disabled or bypassed.
- The actual Colzo login screen renders **Authentication is temporarily unavailable**. Direct browser navigation to `/api/public-config` renders `{"error":"Colzo development environment unavailable"}`. Source mapping through `vercel.json` and `api/operations.js:89-90` identifies this as the dispatcher\'s `isApprovedSupabaseTarget()` denial (HTTP 503 in source). The configured target fails validation; its exact inherited value was not read, so no specific alternate project is asserted. Do not remove this guard. Correctly scoped Development configuration requires the separate approval below.
- No Colzo login or MFA success is claimed. A browser-safe screenshot of the actual login blocker was captured; no credentials are visible.
- Read-only query on Development `mvwseobgkexzpmmkgcxe` returned `NULL` for both `public.colzo_clickup_oauth_states` and `public.colzo_clickup_connections`; `public.businesses` exists.
- Vercel environment inventory with exact PR #77 branch filter and decrypt=false returned an empty env list. This establishes absence of branch-specific entries, not absence or correctness of inherited project variables. Deployment metadata lists inherited Supabase variable names; their values/target were not decrypted or validated.
- Supabase backup inventory returned `backups: []` and `pitr_enabled: false`. No restorable backup is proven. No restore, export or database mutation was attempted.
- Connected-app operations after root instructions were read used the active Composio connections. Earlier initial handoff/PR reads used the GitHub connector before those repository instructions were available.

## Live acceptance matrix

| Gate | Status | Evidence / dependency |
| --- | --- | --- |
| Protected Preview access | PASS (access only) | User completed Vercel sign-in; actual Colzo login renders |
| Genuine Colzo sign-in and AAL2 MFA | BLOCKED | Public configuration fails approved-target validation; eligible fictional QA account still required |
| Desktop native dashboard and Stitch comparison | NOT RUN | Authenticated native shell unavailable; no fixture substituted |
| Mobile navigation, forms, keyboard and touch | NOT RUN | Authenticated native shell unavailable |
| ClickUp OAuth, single-use state, cancel/replay | BLOCKED | Tables absent; branch configuration absent; OAuth registration unverified |
| Empty List task creation and provider confirmation | NOT RUN | Requires genuine connection to fictional ClickUp workspace |
| Task update, stale conflict, pagination, workspace switching | NOT RUN | Same dependency; automated source checks do not count |
| Member permissions and cross-tenant read/write isolation | NOT RUN | Requires two eligible fictional businesses and role-specific live sessions |
| Logout/revoked-session replay and expired access denial | NOT RUN | Requires genuine live sessions; previous expired-grant evidence is historical |
| Support, privacy/DPA, retention, incident and deletion/data return | PENDING | Responsible operator sign-off not supplied |
| Backup/rollback preflight for migration | BLOCKED | No available managed backup listed; restore not verified |

## Exact approvals required (not granted by this record)

### A — Development SQL, independently of configuration

Review the unchanged [migration at the accepted source SHA](https://github.com/08collinsj-boop/Business-AI/blob/b6d82905ecdbfd3a334423a1787e8a663ed10dbe/supabase/migrations/20261112013500_add_clickup_connections.sql).

- File: `supabase/migrations/20261112013500_add_clickup_connections.sql`.
- Exact Git blob: `420d5bf48ce66669eb562ab4865faed8eaa7aa43`.
- Target exclusively `mvwseobgkexzpmmkgcxe`.
- Adds the two connector tables, state expiry index, tenant/auth foreign keys, validation constraints, RLS, browser-role privilege revocation and service-role grants.
- Requires completed backup/rollback preflight before execution. Verify actual default privileges, role denial and service-role PostgREST access afterward.
- No existing pilot entitlement, existing record, billing or Production change is included.

### B — PR #77 privileged Preview configuration, separate consent

Only project `prj_d5DuC65u4hSITFRC54ygswiMW9ST`, target Preview and exact branch `feature/colzo-connected-workspace-20261112`.

- Set `SUPABASE_URL` to `https://mvwseobgkexzpmmkgcxe.supabase.co` and the browser publishable key to that existing Development project, exact branch/Preview only. Validate the target before any authenticated data access.
- Existing Development Supabase server credential, validated against `mvwseobgkexzpmmkgcxe`, configured as sensitive server-only data. This enables privileged backend access to Development records. PR #76 consent does not apply.
- Server-only ClickUp client ID/secret, exact callback URI and a 32-byte AES encryption key. Callback URI: `https://business-ai-git-feature-colzo-connected-wor-64d936-buisness-ai1.vercel.app/api/clickup-callback`.
- Enable `CLICKUP_INTEGRATION_ENABLED=true` only after prerequisites pass. Keep deployment protection enabled and secrets out of chat, frontend responses, screenshots and logs.
- OAuth application registration/consent must be controlled by an authorised owner/admin and limited to the intended fictional ClickUp workspace.
- Remove temporary additional privileged Preview configuration and retire affected privileged QA deployments when acceptance completes, coordinating with any continuing authorised QA.
- No Production or other-branch configuration is authorised.

## Required human inputs

- Vercel sign-in is complete in this task's browser. After approved configuration is corrected, complete genuine Colzo login/MFA.
- Identify existing permitted, unexpired fictional QA businesses and role accounts sufficient for two-tenant and owner/admin/member checks. Do not renew grants, activate a pilot or bypass expiry under the current authority.
- Supply OAuth credentials through a secret store, never chat or repository files; identify the authorised fictional ClickUp workspace.
- Confirm responsible operator and support/legal/retention/deletion/incident sign-off.

## Change boundary

This continuation adds documentation only. No application correction was justified from authenticated rendering because that rendering was unavailable. No new test run is claimed. No SQL, secret configuration, OAuth grant, pilot activation, billing, real customer record or Production mutation occurred. Both PRs must remain draft and unmerged.
