## Section 2 independent browser acceptance — 15 November 2026

**External pilot: NO-GO.** Tested application source: `4b7d8ca76e6ed0f62ae114a4b22173666d1828bf`. PR #77 independently rechecked open, draft and unmerged. Browser target: https://business-mv79d1iz4-buisness-ai1.vercel.app/ . Deployment ID `dpl_ES5YvZfdYd9GeXE8RvtV9duAs1s1` and READY/SHA binding are carried from the execution handoff, not independently re-established through Vercel by this browser run. GitHub Actions run 43721528319 independently retrieved: completed/success at the exact tested SHA; 1,926/1,926 is retained from the prior inspected CI log, not recounted here.

### Actual environment and scope

Work cloud Chrome (cdp), desktop viewport **1363×936 CSS px**, DPR 1. Browser version/host OS not independently measured. No supported viewport-setting or device-emulation capability exposed; no mobile/touch/keyboard emulation claimed. Actual sign-in and legitimate authenticator MFA completed through secure credential controls; existing fictional QA owner workspace opened with labelled fictional records. No credential values, OTPs, JWTs or refresh tokens read or exported. Test interval approximately 19:07–19:23 GMT. Final state independently observed: Colzo Welcome back sign-in screen after Sign out.

| Check | Result | Independently observed / limit |
| --- | --- | --- |
| Current PR source/draft identity | PASS | Exact head matched 4b7d8ca; draft/unmerged |
| Protected Preview reachability | PASS, narrow | Actual native Colzo loaded in this browser; no SSO setting changed or bypass performed |
| Legitimate owner authentication + MFA | PASS | Password transition reached authenticator gate; valid verification opened owner workspace and fictional records |
| W1 owner own-business read baseline | PASS, narrow | Overview records, 7 saved customers, Actions and Bookings loaded; Team and Knowledge views reachable. No save or foreign-tenant request tested |
| W1 admin/member + independent Business B | BLOCKED | No authorised active private sessions supplied; previous fixture identities/grants revoked per handoff. No identities, memberships or grants created/renewed |
| W1 foreign reads/writes, role restrictions and cache/DOM switching matrix | BLOCKED | Needs the missing independent authorised role/tenant sessions; owner-only access is not isolation proof |
| W2 ordinary UI sign-out | PASS, narrow | Sign out returned to Welcome back. This is not issued-token/refresh invalidation proof |
| W2 unexpired-token replay and refresh invalidation | BLOCKED | Current browser API permits read-only page evaluation, not private token capture or arbitrary authenticated HTTP replay. No supported replay/request instrumentation exposed; obsolete-host panel deliberately not used |
| W2 independent revocation / membership / grant removal | BLOCKED | No second authorised session or approval to change membership/grants; no revocation controls exercised |
| W2 natural JWT expiry | BLOCKED | No non-secret token-expiry metadata or controlled natural-expiry harness exposed. No observed natural expiry; logout not substituted |
| W3 current available desktop smoke | PASS, narrow | 1363×936 overview: sidebar/account footer, briefing, KPI row and cards visible without obvious overlap; Customers readback; new-action editor fit, initial Title focus and close; new-booking editor opened and closed without save |
| W3 exact desktop 1440×900 / 1366×768 / 1280×800 / 1024×768 | BLOCKED | Supported viewport-setting unavailable; current 1363×936 is not any requested size |
| W3 375×812 / 390×844 / 430×932 / tablet, touch, software keyboard, safe areas, cross-device persistence | BLOCKED | No genuine mobile or supported emulator available. No zoom workaround used |
| W3 approved Stitch desktop parity | FAIL — visible differences | Approved node loaded and screenshot inspected. Current native owner overview still differs as below; not a pixel-matched or complete visual sign-off |

### Refreshed Stitch comparison and defect scope

Approved reference: https://stitch.google.com/preview/9676429605761932306?node-id=66aada51c5544c4583cea9eb7aeddd41 (rendered “Colzo Desktop Overview — Review v4”).

Observed differences at available desktop size: native sidebar uses Home and Business tools, while reference uses Overview and Workspace AI with a Business Knowledge entry; native account footer is a generic Account & settings button rather than named owner/avatar/role; briefing lacks reference priority chips/update time; fourth KPI is Total enquiries rather than Customers; native recent-enquiries/trend content order differs from reference weekly activity/suggested-next-step layout. Data-dependent values and greeting were not treated as defects.

These are retained design-acceptance gaps, not newly proven security defects. No independently reproduced clipping, broken control or narrowly scoped CSS malfunction in the exercised overview/dialogs justified a speculative patch. No code/CSS changes made; no duplicate regression run or redeployment necessary. Do not interpret this as approval of full visual parity.

One screenshot of the **blank new-booking dialog**, with no contact values or open option lists, recorded as redacted evidence. Other screenshots were internal inspection only; no private account/profile screenshot published.

### Preserve earlier accepted scope

QA-001 hidden-DOM containment, earlier D01–D03 and core saved-state workflows retain their original tested scope. The earlier 57 Data API checks and selected revocation tests remain reported historical PASS; not rerun or promoted into current native-app W1/W2 acceptance. Source-level Section 1 success does not replace browser security or full data-exit/recovery acceptance.

### Minimum continuation requirements

1. Privately available, already authorised active fictional Business A owner/admin/member plus independent Business B owner sessions, legitimate MFA and active grants. If unavailable, separately authorise exact Development-only fixture provisioning, expiry and cleanup before any such mutation; none authorised or performed here.
2. A permitted browser security harness that retains issued tokens only in private ephemeral memory and emits redacted status/expiry results for this exact deployment; separately controlled independent session revocation and any membership/grant mutation.
3. A real mobile browser or explicitly supported device emulator, plus supported exact desktop viewport control. Continue current-source visual review against the approved node.
4. Recovery remains deferred at owner direction, not waived. Operational/legal/consent, complete secure tenant data return and release gates remain unresolved. No pilot activation.

No Production/billing/SQL migration/privileged Preview configuration/feature flags/real customer data/ClickUp/assignment activation/deletion/PR merges changed. No accounts or access renewed. Session signed out.


---

# Colzo — execution handoff: only external/live acceptance remains

> **14 November operator-readiness handoff:** [Internal operator, incident, privacy/contact and tenant-exit sign-off pack](COLZO_PILOT_OPERATOR_SIGNOFF_AND_DATA_EXIT_PACK_2026-11-14.md) is now prepared for human review. Source inspection confirms current pilot selected-lead-only export, fail-closed scoped-pilot DELETE (503), lifecycle *review settings* rather than automated erasure, and unconfigured public legal identity. This new document is a draft, **not** monitored support, legal approval, customer consent, full data exit or recovery evidence; all those gates remain OPEN/NO-GO. Do not publish or activate based on this packet.\n\n> **14 November reconciliation — read first:** [Current pilot acceptance evidence ledger](COLZO_PILOT_ACCEPTANCE_EVIDENCE_LEDGER_2026-11-14.md) supersedes stale pending statuses below. Operator-reported newer independent Work testing passed **57 live Data API tenant/denied-write checks**, selected unexpired-token/logout, refresh and membership/grant revocation, desktop wrapping retest and **1,879/1,879** regressions at `5d2e7ca` (exact current CI not independently reproduced here). Temporary QA accounts/memberships/grant have been revoked; do **not** silently re-provision or rerun completed API scope. **Still OPEN:** protected native-app two-tenant role acceptance, natural JWT expiry, genuine mobile/full desktop, live ClickUp/assignments, complete isolated backup restore with Auth/Storage and operating/legal consent. Chromebook/USB encrypted DB and 12-object Storage archive integrity/duplicate checks passed; independent restoration **did not**. Read-only Supabase security advisor on 14 Nov reports leaked-password protection disabled (Pro-plan feature); six no-policy RLS tables deny direct anon/auth privileges and are not a demonstrated exposure. **Pilot remains NO-GO. No schema, secrets, Production or billing changes authorised.**

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


## 15 Nov 2026 — post-W3 source-level Stitch review v4 corrections (not browser acceptance)

The independently tested native runtime remains `4b7d8ca76e6ed0f62ae114a4b22173666d1828bf` (Work cloud Chrome 1363×936). PR #77 has since received unprivileged source-only UI adjustments at commits `7bc71d1`, `72e5b57`, `290eab0`, preceded by RED source-gap regression tests at `e0b77fb`. This is a **new, unaccepted runtime**; earlier PASS results do not automatically extend to the changed UI.

- Large desktop sidebar now renders **Overview** while the existing five mobile tabs retain **Home**; desktop links to the existing native **Business Knowledge** and **Workspace AI** (receptionist) screens, not imaginary services.
- Native overview fourth KPI is **Customers**, sourced only from an already loaded `colzoRecords.clients` array. It displays **—** and an instruction to check Customers when that record set has not yet been loaded, rather than counting enquiries as customers or showing a false zero. Refreshing/loading saved customers is still driven by the existing Customers route; automatic new background reads were deliberately not introduced.
- Workspace briefing now has three counts grounded in its existing new enquiry / action due / booking-request calculations, with a fail-closed unavailable label if computation is unavailable. **Viewed HH:mm UK** is explicitly a *page viewing timestamp*, not a claimed synchronisation or data freshness timestamp.
- Existing account footer still lacks an authenticated display name/avatar/role; the lower recent-enquiries/trend layout still needs approved-reference parity review. No session/user identity data was introduced into untrusted UI. These **remain open design gaps**.
- Existing native desktop regression file `tests/colzo-native-desktop-home.test.mjs` now asserts the revised route markup and honest KPI/priority rendering. Observed old-source conditions fail the new expectations; current-source 13 direct structural/syntax checks passed, including JavaScript syntax. **Full Node regression tests were not executed at this source head** (no PR-triggered Actions runs were returned), and Vercel Preview READY is a build/deploy status only. No authenticated live post-change screenshots, touch acceptance or exact-viewport results are claimed.
- Exact post-code Preview observed by Vercel: `business-3k8kfkggq-buisness-ai1.vercel.app`, deployment `dpl_5FVHYNKj8dFa8FogDiJk792u1hsf`, READY, SHA `290eab035eae1957f4cc2c012af13cc324ea0fca`. It is protected and must stay protected; the source handoff has a later documentation-only SHA.

**W1 authorisation request (NOT granted by this handoff):** If privately available authorised fictional identities do not exist, owner must separately approve a Development-only *Business A admin and member, Business B owner* fixture plan, specifying exact existing/new identities, MFA enrolment, tenant membership, grants/expiry and revocation/cleanup. No production real users, secret sharing or grant extension without approval. Existing Business A owner can be reused only while its authorised session/grant is valid. Prove tenant A positive and tenant B negative reads/writes per role.

**W2 harness requirement:** independent legitimate second session; ephemeral, private security-test tooling that never records or exposes token strings, only redacted request statuses/expiry evidence; separate permission for role/grant/session revocation. Natural expiry must be observed independently, not inferred from UI sign-out.

**W3 requirement:** actual supported desktop viewport controls and genuine mobile browser/emulator at specified sizes; retest the new source against the approved Stitch node, role-based menu accessibility, CSS at intermediate sizes and data-independent layout. Account footer/lower content parity remains unfinished.

**Preserved:** Chromebook/real Development restore deferred by owner but remains a mandatory external-pilot recovery gate. Production, live customer data, SQL, support/privacy publication, secrets, grants, external integrations, payments, deletion and pilot activation unchanged. PR #76/#77 draft/unmerged. **External pilot NO-GO.**


## 15 Nov 2026 — follow-up desktop account hierarchy correction (unaccepted source)

After the 1363×936 browser acceptance tested source `4b7d8ca`, the branch received separate targeted design changes. The additional account-footer work is complete **only as source edits**, at:
- `17d9833`: regression test authored first, covering a role display gap and clearing after sign-out.
- `d00c17b`: neutral account identity panel in the existing `More` navigation route, with a decorative silhouette rather than a fabricated user photo.
- `90399a2`: display `Owner`, `Admin`, or `Member` from the existing authenticated `authenticatedBusinessRole` only; fall back to `Account settings` where unavailable; immediately clear the role label during native auth teardown.
- `e288487`: desktop-only responsive footer styling.
- `e95bf23`: correction to test fixture so the test's auth teardown includes the existing production `cnReturnToColzo` element.

**Verification limits:** GitHub refetch showed these edits on draft/unmerged PR #77 head `e95bf238f111397852c90d55adb9463bc4350e0f`. The native JS parsed successfully using a read-only syntax compile; source/markup/fixture guards were rechecked. GitHub combined status shows Vercel `business-ai` and `business-ai-site` success for this commit. GitHub's PR-triggered Actions-run lookup returned **no runs** for this exact SHA; no executed JSdom assertion, full Node regression count, authenticated page inspection, mobile test or Stitch screenshot comparison is claimed. A Vercel success is not a regression/visual acceptance pass. The prior Work browser PASS remains bound to **its older tested runtime**, not this new code.

**Visual parity still OPEN:** no authenticated personal profile name or image is invented, stored or rendered; the neutral avatar is not a verified identity. The reference's named owner/avatar, activity/weekly/suggested-next-step arrangement and exact-device sizing still need proper source design acceptance and genuine authenticated viewport/browser observation. The monthly enquiry trend must not be relabelled as weekly activity without changing its underlying data/period and tests.

**Exact W1 approval needed before live tests:** privately approve Development-only fictional Business A admin/member and independent Business B owner identities if no already-authorised sessions exist. Specify who can create each user, how MFA is independently enrolled, tenant-role/expiry setup, grant windows, minimum fictional test data, isolated test log, who revokes the access and when. No accounts, membership or grants created/extended under this source correction; owner-only access is not role/tenant acceptance.

**Exact W2 prerequisites:** authorised independent second session and private ephemeral instrumentation that reports **redacted HTTP status and expiry metadata only** (no JWT/refresh-token strings, screenshots of secrets, persistent browser storage or PR logs). Privileged session/membership/grant revocation needs separately scoped owner approval. Natural JWT expiry requires real waiting and observation, not a simulated timer or UI logout.

**Unchanged:** no Production, SQL, OAuth, billing, real-customer records, pilot activation, grants, secrets or merge. Chromebook/real-Development-restore step stays deferred, not waived. External pilot remains **NO-GO**.


## 15 November — W1 fictional fixture authorisation granted; provisioning blocked by Auth Admin access

The Colzo owner **approved** Development-only creation of the minimum fictional QA identities/temporary grants for Business A admin/member and independent Business B owner with legitimate MFA. This does **not** approve Production/real-customer access, new schema, privileged settings, external pilot activation or a permanent QA grant.

**Execution handoff:** [Approved W1 QA identity fixture procedure](COLZO_DEVELOPMENT_W1_QA_IDENTITIES_APPROVED_2026-11-15.md). Read it before any account, membership, business, or grant mutation.

Independent read-only Supabase project/SQL checks confirmed `mvwseobgkexzpmmkgcxe` active; four QA/test/demo/fictitious-labelled businesses; one currently active grant; one active-grant business with a verified-MFA owner, and zero such active-grant businesses with verified-MFA admin or member. Identity-specific sign-in has **not** yet been performed during this phase. The existing pilot-grant check enforces **exactly 336 hours**; revoke early after QA instead of changing its constraint.

**Actual mutations performed this phase: NONE.** The available Supabase connector lacks the supported Auth Admin create/invite user operation; raw SQL insertion into `auth.users` is not a valid substitute, and independent interactive MFA enrolment is not available here. Use an authorised private operator/Work environment and supported Auth Admin API/dashboard, then record redacted creation, role, grant, AAL2, test and cleanup receipts. Keep W1 **BLOCKED** until all four real sessions and live positive/negative app checks pass.

W2 status-only private harness plus deliberate session/membership/grant revocation needs separately scoped operational permission. W3 exact-device/browser acceptance remains OPEN. Real Development restore stays deferred, not waived. External pilot **NO-GO**.
