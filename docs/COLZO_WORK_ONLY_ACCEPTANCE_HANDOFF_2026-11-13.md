# Colzo — execution handoff: only external/live acceptance remains
**Prepared:** Friday 13 November 2026 (UK) | **Status:** External pilot **NO-GO**
**Source code candidate already independently accepted in the recorded scope:** `e9937ffaf16ebf9e62d96960268f89fbe3b5bd58` (PR #77). Subsequent commits that add only handoff/internal legal-review documentation do **not** retroactively extend live acceptance.
**Repository:** `08collinsj-boop/Business-AI` | **Protected branch:** `feature/colzo-connected-workspace-20261112` | **Draft PR:** #77 stacked on draft PR #76. Do not merge either.
**Development Supabase:** `mvwseobgkexzpmmkgcxe` | **Verified candidate Preview:** `https://business-ncmvy972l-buisness-ai1.vercel.app/` (deployment `dpl_5iJt9Ysj2HJGaWfHNkoTMgzF4Zet`). Deployment READY means build-ready, not comprehensive acceptance.

## Verified facts — avoid repeating checks that have already passed

- Independent 13 November browser report/PR #77 comment `6853973334`: QA-001 immediate hidden-DOM clearance after two logouts, password-only MFA gate, rejected authenticator, valid owner MFA, Back/Forward/reload and accessibility checks **PASS** in their recorded scope. D01–D03 targeted desktop/Knowledge corrections **PASS** (not full Stitch visual acceptance).
- Verified existing fictional workflows: customer and project CRUD/persistence, enquiry editing and restoration, Knowledge manual fact approval/reload, booking create/confirm/overlap denial/cancel, Actions edit/complete and navigation, search/unsaved-change guards. Original QA owner session was signed out after that independent report.
- GitHub Actions `43421773958`: full **1,878/1,878** Node tests passed at `e9937ff` (0 failed), build plus isolated PostgreSQL 17 backup/migration and staged assignment rehearsals passed. The synthetic backup rehearsal is not a Development backup.
- At a fresh read-only Development SQL check on 13 Nov: `colzo_clickup_connections` absent, `colzo_clickup_oauth_states` absent, `actions.assignee_user_id` absent. Existing strict-session function `colzo_preview_session_active(uuid,uuid)` is present and neither `anon` nor `authenticated` may EXECUTE it. **Do not recreate the RPC**.
- Vercel: exact SHA branch Preview is READY and SSO protection enabled; `CLICKUP_INTEGRATION_ENABLED` and encryption/redirect placeholders have branch-scoped configuration. No branch-scoped `CLICKUP_CLIENT_ID` or `CLICKUP_CLIENT_SECRET` was listed in the metadata read; **do not infer values or decrypt/export secrets**. No current proof of strict-session replay feature flag effective runtime state.
- Support alias `support@getbusiness-ai.com` had one different-sender message with INBOX present on 6 Nov 2026 (Gmail label-only check); this supports inbound delivery but not continuous monitoring, coverage or a working incident route.
- Existing release/backup documentation remains authoritative: `docs/COLZO_DEVELOPMENT_RESTORABLE_BACKUP_GATE_2026-11-12.md`, `docs/COLZO_PILOT_READINESS_GATES_2026-11-12.md` and `docs/COLZO_PILOT_WORK_HANDOFF_2026-11-12.md`.
- A proposed, unpublished ClickUp data-flow and privacy/DPA draft is in `docs/COLZO_CLICKUP_PRIVACY_REVIEW_DRAFT_2026-11-13.md`. It **does not update published legal pages or constitute an operator sign-off**.

## Exactly what remains; separate Work/browser activity from privileged human approval

### W1 — Authorised real role/tenant browser tests (Work + private fixture access)

1. Obtain explicit privately authorised **fictional** owner, admin, member identities with legitimate AAL2/MFA for a first business and a separate independent business with an active fictional grant. Do not silently create/renew accounts, grants or role memberships and never paste credentials, OTPs or bearer tokens into GitHub/PR/chat reports.
2. Establish positive same-business access, then attempt foreign-business ID manipulation and foreign-tenant customer, enquiry, booking, Action, team and Knowledge reads/writes. Verify server/REST denial and no client cache/DOM leak. Exercise role restrictions, removed membership, and expired grants.
3. Capture redacted response codes, exact SHA/deployment, expected-versus-actual; avoid recording private row contents. Preserve existing QA-001 regression pass; only rerun it if modified by a relevant subsequent change.
4. Never claim full isolation with only an owner account, mocked API or database policy definition.

**PASS criterion:** real authorised multi-identity/AAL2 sessions, demonstrable own-tenant success + foreign denial across relevant operations, revoked identity cannot recover data, no leakage or privilege inheritance.

### W2 — Issued-token/logout/revocation (Work + private authorised sessions)

1. With a genuine issued token, verify positive in-session protected API and direct Data API baseline, then local logout and reuse the **still unexpired** access token in browser-only ephemeral memory; assert protected API 401 and direct rows absent/rejected, without exporting token contents.
2. Validate refresh-token invalidation, revocation from another session, stale membership removal, immediate and natural expiry, post-revocation session re-entry with legitimate MFA; distinguish session revocation from access-token cryptographic expiry.
3. The legacy `assets/colzo-session-replay-panel.js` is currently hard-coded for an *older* Preview hostname and two fictional IDs. **Do not use it as proof for PR #77.** Only extend it if separately reviewed/test-driven, confined to exact approved PR #77 protected Preview and already authorised fictional identities, with no secret output.
4. If strict-session env is not enabled in the current deployment, record that fact; enabling it is a separately scoped security/configuration change, not an implicit acceptance.

**PASS criterion:** live HTTP/audit evidence of retained token denial while token JWT is still within expiry; refresh, other-device and natural expiry individually demonstrated.

### W3 — Genuine mobile/desktop final visual QA (Work with permitted browser/device)

1. Use authorised **real** mobile Safari/Chrome or a supported device emulator. 375×812, 390×844, 430×932 plus tablet and desktop sizes, real touch, software keyboard, sticky tab/navigation, scroll, safe areas, focus/labels, modal dismissal and forms.
2. Sign in with legitimate owner and member MFA and test saved-state workflows, logout/cache clearing and cross-device result persistence. Do not bypass the organisation's DevTools restriction; if unavailable, report BLOCKED.
3. Compare desktop at 1440×900, 1366×768, 1280×800 and 1024×768 with approved Stitch reference `https://stitch.google.com/preview/9676429605761932306?node-id=66aada51c5544c4583cea9eb7aeddd41`. Note that D01–D03 was targeted correction QA, not a complete Apple-quality sign-off.
4. Redacted screenshots, viewport values, OS/browser, actual interactions and a defect ledger are necessary.

**PASS criterion:** accepted real device and desktop UX evidence, not desktop zoom alone.

### O1 — Independently restorable Development backup (private operator tooling, not a chat credential request)

1. Complete the exact `docs/COLZO_DEVELOPMENT_RESTORABLE_BACKUP_GATE_2026-11-12.md` procedure with authorised privately held database access and encrypted outputs away from GitHub/chat/CI. No paid tier changes and no Production or Dev reset.
2. Independently restore a **real Development** backup to a separately authorised isolated destination; verify relevant Postgres roles/RLS, data/auth identities/factors, Storage *bytes*, Vault/pgsodium keys where relevant and tested ability to recover.
3. Preserve private redacted verification receipt identifying source, restore target, checksum, tested coverage, exclusions and rollback owner. No pasted DB credentials, full dump or customer data.

**PASS criterion:** an actual restore receipt, not synthetic PostgreSQL test results or a proposed script.

### O2 + W4 — ClickUp registration/SQL/OAuth and task provider acceptance (approval-gated)

1. Following O1 only, ask for exact approval A for `supabase/migrations/20261112013500_add_clickup_connections.sql` on **Development only**; SHA-256 as recorded in PR #77's 13 Nov engineering audit: `e9de9e9f2d25279465bac3a88f8f947be35bbc6ad9e4c732051e923a09cf5ea9`.
2. Separately request approval B for staged `docs/staged-sql/COLZO_ACTION_ASSIGNMENT_NOT_APPLIED.sql` (SHA-256 `2bdd752b93d815a97b7f24ff90af04fed078cc57b42655aeab47ad778f3018af`) before changing `actions`. Assignment is *not* installed or usable today.
3. Register a **fictional authorised ClickUp** OAuth application with a valid callback to the exact protected PR #77 Preview; keep client ID/secret/encryption material in the proper secure secret store, not PR/chat. Separately approve branch-only privileged Preview settings; keep SSO and feature flags disabled until schema, approved role model and storage pass.
4. Prove single-use OAuth state and failed-state denial; authorised task/list read; create within an empty List with ClickUp readback; approved title/status update and conflict rejection; workspace switching; provider reconnect; disconnect and independent ClickUp-side revocation; no cross-tenant or staff/other-admin access to authoriser's data. A task page refresh **is not background synchronisation**.
5. Verify deployment rollbacks and branch-only scoped clean-up. Any new provider action that incurs charges or discloses customer data is forbidden without separate review.

**PASS criterion:** live, audit-backed connection + real provider readback and denial matrix on fictional accounts, without exposing credentials or changing Production.

### O3 — Owner/operator actions and real-data readiness (not Work-only)

- Designate monitored support owner, backup, incident escalation and verify support responses. A 6 Nov inbound alias message does **not** prove ongoing support.
- Review, legally approve and publish accurate ClickUp/privacy/DPA/subprocessor disclosures and ensure pilot owners accept the applicable specific versions. The proposed draft note is deliberately unpublished.
- Exercise and record full tenant-scoped **export, return and safe deletion** on isolated fictional data including Storage/Auth and shared-user preservation; do not turn the 365/730-day review settings into an unsupported deletion promise. Agree retention, exceptions, responsible parties and timelines.
- Final named participant consent, risk disclosures, DPA and addendum acceptance, incident ownership, explicit release decision. Do not grant or invite real accounts until gates are passed.
- If operator chooses a **core-only pilot** excluding ClickUp/assignments, record that scope explicitly and amend accurate disclosures, but keep security, mobile, backup, support/data-exit and DPA/consent requirements.

## Work action handoff

> Continue PR #77 at the actual current head, first re-read this packet and the latest PR #77 engineering comments, and inspect CI/Preview identity. Do not repeat passing QA-001 or existing core acceptance unless later changes invalidate them. Execute W1→W2→W3 against the protected fictional Development Preview with legitimate MFA, collecting redacted live evidence and fixing reproducible defects by test-driven changes only. In parallel, complete any safe operational preflight not requiring private credentials or legal authority. Stop before schema/secret/role/grant changes until the precise O1/O2 approvals are verified. Then complete W4 and rerun actual end-to-end acceptance, preserving PR #76/#77 draft and keeping Production, paid services, billing and external activation unchanged. Report a per-gate PASS/FAIL/BLOCKED matrix and do not turn 'blocked' into 'passed'.

## Release rule

**External pilot NO-GO** until chosen pilot scope has real positive and negative cross-tenant role tests, security token and expiry tests, genuine mobile/desktop signoff, independently evidenced recovery and data-exit capability, documented current support/privacy/DPA/consent and explicit operator GO. Do not claim GO solely from CI, READY, an example-data demonstration or a private acceptance prompt.
