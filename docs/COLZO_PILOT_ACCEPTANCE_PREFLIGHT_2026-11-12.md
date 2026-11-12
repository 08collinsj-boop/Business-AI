# Colzo pilot acceptance continuation — 12 November 2026

## Assessment

**External pilot: NO-GO.** This record concerns source candidate `b6d82905ecdbfd3a334423a1787e8a663ed10dbe`. Automated verification and package readiness do not establish authenticated live acceptance.

## Earlier evidence (12:43–13:03 UK; superseded where noted below)

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


## Approved execution update — 12 November 2026, 14:04–14:12 UK

The user explicitly approved both requested scopes in this task. The SQL approval remains conditional on completed backup/rollback preflight; no further approval for the same scopes is required.

### Completed and freshly verified

- Confirmed PR #77 was draft/open at `d6a66e867a1ea41c19d43894593d09f010890539`, stacked on PR #76. No application source changes were needed.
- Validated the existing Development Supabase API keys server-side, including legacy key project/role claims. No credential values were printed, placed in chat, committed or exposed in screenshots.
- Created exactly branch-scoped `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY` overrides on Vercel project `prj_d5DuC65u4hSITFRC54ygswiMW9ST`, target Preview, branch `feature/colzo-connected-workspace-20261112`. Keys are sensitive variables. URL is the approved `https://mvwseobgkexzpmmkgcxe.supabase.co`.
- Created `CLICKUP_REDIRECT_URI`, a sensitive generated 32-byte `CLICKUP_TOKEN_ENCRYPTION_KEY`, and `CLICKUP_INTEGRATION_ENABLED=false`, with the same exact branch/Preview scope. Client ID/secret are not available; integration remains disabled.
- Read back metadata for all six entries and verified exact branch/Preview scope. No global, Production or other-branch entry was edited.
- Vercel SSO protection was confirmed enabled (`all_except_custom_domains`) and was not modified.
- Redeployed source `d6a66e867a1ea41c19d43894593d09f010890539` as protected Preview `dpl_HBQrjDB51kfmskcUupLir69kX3Yu`, immutable hostname `business-z4b08fvx2-buisness-ai1.vercel.app`; authoritative status READY, target null (Preview). This deployment includes the three Supabase overrides; the later prepared disabled ClickUp settings will take effect on subsequent builds.
- Actual browser retained Vercel authentication. Native Colzo login now renders without the previous authentication-unavailable error. User submitted credentials through secure browser authentication; the page reports **Unable to sign in with those details**.
- Development Auth logs for 14:06–14:09 UK returned one `invalid_credentials` / HTTP 400 event. No automatic credential retry, password reset or MFA bypass was attempted. This establishes a different blocker from the resolved target-configuration denial; no successful Colzo login/MFA or dashboard acceptance is claimed.
- Fresh aggregate read of `public.colzo_pilot_access`: two status-active rows, **one unexpired and one expired**. This supersedes the earlier both-expired observation. No grant was created, extended or changed. The eligible account/workspace identity has not been verified by live login.

### Still blocked

- Exact approved migration is unchanged, Git blob `420d5bf48ce66669eb562ab4865faed8eaa7aa43`. Both new tables remain absent.
- Supabase still lists no available backups, with PITR disabled. Retrieved database connection metadata contains a password placeholder, not a usable backup credential. No restorable database backup/restore evidence is available; therefore the conditional SQL approval has **not** been executed. No database password was reset or invented, and metadata/template discovery is not treated as backup proof.
- An authorised ClickUp OAuth app client ID and secret must be placed in the approved branch-only secret store before enabling the connector. No ClickUp provider permission was granted or provider write attempted.
- Genuine Colzo sign-in/MFA remains blocked by the submitted credentials. Desktop/mobile native acceptance, Stitch visual comparison, live tenant isolation, member permissions and session/replay tests remain NOT RUN.
- Support/privacy/DPA/retention/deletion/incident operational sign-off remains outstanding.

### Exact current assessment

**External pilot NO-GO.** Approved configuration work progressed and the live target-configuration error is resolved. Automated tests remain historical at source `b6d8290` (1,792 passing); no new full regression run is claimed because no application code was corrected. The new Preview build passed, which is not evidence of live authenticated acceptance. Temporary privileged configuration cleanup remains pending completion of authorised acceptance.
