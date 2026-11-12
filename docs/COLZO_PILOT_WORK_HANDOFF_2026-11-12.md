# Colzo — exact pilot handover for authenticated Work/browser acceptance

**Date:** 12 November 2026 (UK); this is a live status handover, not release approval.
**Goal:** secure, demonstrable desktop-first Colzo pilot. Mobile = **Business on the Go**.
**Existing repo:** `08collinsj-boop/Business-AI`.
**Current connected workspace:** draft PR [#77](https://github.com/08collinsj-boop/Business-AI/pull/77) on `feature/colzo-connected-workspace-20261112`, stacked on draft desktop PR [#76](https://github.com/08collinsj-boop/Business-AI/pull/76) (`feature/colzo-ai-desktop-command-centre-20261111`).
**Approved development database reference:** `mvwseobgkexzpmmkgcxe`; no Production changes.
**Current external pilot:** **NO-GO** until real authentication, ClickUp, security and operational acceptance all pass.

## 1. Work completed without Work

- Reused the actual native Colzo desktop shell rather than creating a separate demo.
- Native ClickUp workspace supports first-page and later-page task display, workspace selection, grounded task priorities, inspector and owner/admin-confirmed changes. Desktop Home can explicitly refresh authorised ClickUp task counts and titles; labels say they represent the current page, not the entire workspace. The existing mobile five primary tabs remain intact; ClickUp is in More and command search.
- Server-only OAuth with one-time state, encrypted tenant-bound credentials, limited provider routes, role checks, migration proposal and data minimisation.
- Follow-up repairs: task creation works with available authorised ClickUp Lists **even when empty**, via bounded Spaces/Folder discovery; task updates compare both last-seen title and status; member controls are visually read-only and server-writes are owner/admin-only; form input survives provider-save failure.
- Full independent GitHub Actions verification of the OAuth callback and earlier independent fixes at commit `93cef07a82ef140e994d8b7c6afc4e8830dd007d`: [run 43210486775](https://github.com/08collinsj-boop/Business-AI/actions/runs/43210486775), **1,779/1,779 Node tests passed**, zero failures; isolated booking-overlap and signup/replay SQL checks passed. The desktop Home briefing was added afterward; re-run final CI on the new head before releasing.
- Protected Vercel Development Preview builds automatically on the feature branch, but Vercel `READY` proves package/build readiness only; do not infer user authentication, real ClickUp connection or visual acceptance.
- ClickUp integration remains off by default. No actual OAuth session, provider credentials, SQL migration, email/customer message, production code or pilot activation was performed.

## 2. Blocking approvals or external actions (cannot be inferred)

**A. ClickUp OAuth app.** An authorised ClickUp Workspace owner/admin must create/register the Colzo OAuth application; record its client ID and secret in a secret store (never a PR/issue/chat response), with exact protected Preview `https://<host>/api/clickup-callback` redirect URL. Use a fictional workspace and tasks to test. Confirm it grants only intended workspace access.

**B. Development SQL.** Request approval for the **exact** file `supabase/migrations/20261112013500_add_clickup_connections.sql`, only on Development project `mvwseobgkexzpmmkgcxe`, after backup/rollback preflight. It is not installed. It creates `colzo_clickup_oauth_states` and `colzo_clickup_connections`, with RLS and service-role-only privileges. Verify PostgREST service-role visibility and browser-role denial after the approved change. No production SQL.

**C. Protected Preview environment.** Scope `CLICKUP_INTEGRATION_ENABLED=true`, `CLICKUP_CLIENT_ID`, `CLICKUP_CLIENT_SECRET`, `CLICKUP_REDIRECT_URI`, `CLICKUP_TOKEN_ENCRYPTION_KEY` (32 bytes hex) to **PR #77's exact Preview branch only**. It also needs authenticated, correctly scoped Development Supabase server access; **PR #76's privileged key authorisation applies to PR #76 only and must NOT be silently copied or expanded**. Request separate explicit consent before any privileged PR #77 configuration. Keep Vercel deployment protection on; no secrets in browser/server logs. Keep feature off until all prerequisites are complete.

**D. Eligible Colzo QA account.** PR #76's most recent Preview reached the explicit expired-grant state: existing 14-day grants expired; no grant was renewed. Obtain a separate permitted fictional QA business/workspace with legitimate unexpired access and genuine MFA. An unapproved pilot activation, extended expiry, bypass, Production credential or real-customer data is forbidden.

**E. Operator and legal sign-off.** Confirm monitored support address and responsible operator, DPA/privacy disclosures covering new ClickUp connector, consent, deletion/data return and retention, incident response, and withdrawal/disconnect handling. The AI/phone features must reflect real capabilities and usage limits.

## 3. Concrete authenticated acceptance plan

### Real ClickUp integration

1. Log into **the actual native Colzo Preview** with a valid permitted QA workspace; complete MFA. Preserve SSO protection.
2. Open desktop home and More > Connections > ClickUp. Verify `Connect ClickUp` only for owner/admin when enabled; members can view but not mutate.
3. Click Connect. Capture only browser-safe evidence. Verify the registered OAuth redirect is accepted; state is single-use. Ensure failure, cancel and replay states fail closed.
4. Authorise a fictional ClickUp workspace and verify the selected name/authorised choices in Colzo. Check encrypted DB record only through approved backend metadata; never display token.
5. With a fictional ClickUp List containing **no tasks**, create one Colzo task, approve it, then verify in ClickUp. Repeat from a folder List; no link-only simulation counts as a pass.
6. Select a task, update its title/status after approval, confirm in ClickUp and refresh. Verify stale title/status -> 409, no overwrite; read-only member mutation -> 403 and no provider write.
7. Check multi-page task view, switching between authorised workspaces, duplicate/ambiguous provider failures, reconnect/revocation, 429/rate limit and disconnect.
8. Verify reconnect after disconnect. Colzo-side credential deletion alone is not provider token revocation; verify revocation separately in ClickUp.
9. Prove business A cannot read/change business B's ClickUp credentials, workspace, tasks or actions, including URL/query/body tampering, revoked membership and expired token.
10. Do not treat source tests or Vercel READY as live acceptance.

### Native desktop / mobile / existing Colzo

1. Compare actual authenticated desktop at 1440×900, 1366×768, 1280×800 and 1024×768 against approved [Stitch reference](https://stitch.google.com/preview/9676429605761932306?node-id=66aada51c5544c4583cea9eb7aeddd41); correct sidebar hierarchy, spacing, shadows, text wrapping, keyboard focus and native route transitions.
2. Verify mobile 375×812, 390×844 and 430×932, with existing 5-tab navigation preserved. Test scroll, touch, keyboard, safe areas, overlays, forms and quick business actions.
3. Retest: genuine sign-in and MFA, recovery successful reset, enquiry/customer edits, knowledge approvals, booking create/confirm/conflict/cancel, marketing saved drafts and reload, billing entitlements in TEST only, permissions, session replay/revocation and fail-closed behaviour.
4. Observe/confirm natural expiry, signup consent and 336-hour grant enforcement without bypass, only after exact schema/activation approval. Public self-service signup remains disabled unless approved and genuinely verified.
5. Capture before/after screenshot proof, relevant network codes, Git commit SHA and Vercel deployment IDs. Never expose privileged tokens/keys or actual customer records.
6. Run full `npm run verify` including isolated native SQL checks and fresh build at the final candidate. Pilot **GO** only after real controls, support/legal, data isolation, mobile and desktop acceptance all satisfy documented criteria.

## 4. Important unresolved product limits (not blockers to an honest ClickUp pilot unless customer needs them)

- ClickUp List discovery is bounded (four Spaces, twelve Folders, one hundred Lists) to control rate limiting; multi-page tasks currently cap at 21 pages. Large customer workspaces may require a dedicated hierarchical browser.
- Task create ambiguity on network timeouts may still need server idempotency/confirmation; do not automatically retry and risk duplicate task creation.
- The ClickUp briefing is **rules-based**. A genuine multi-app generative Colzo AI agent, Gmail/calendar connections, cross-application actions, voice AI and full ClickUp parity are not part of this delivered slice. Build those as separate tested, approval-gated milestones without delaying the reliable core pilot.
- Existing deployment and branch protections, approvals and QA credentials cannot be inferred from old evidence. Verify fresh.

## 5. Release boundary and cleanup

- Leave PR #77 **draft/unmerged**. Leave PR #76 **draft/unmerged**. Do not modify Production, live customer records, billing, domain aliases, paid publishing, pilot activation or other branches without explicit approval.
- During visual acceptance PR #76 holds additional **branch-only** privileged Preview configuration; once acceptance is genuinely complete, remove that temporary configuration and retire affected privileged QA deployments as previously authorised.
- Keep the product honest: the interface must not show demo metrics as real business data or mark live ClickUp OAuth as complete until actually connected and verified.

## 6. Operator handoff instruction

Continue from PR #77's current head and this document. Do not create another speculative prototype. First establish the exact current Git SHA, CI and protected Development deployment; then complete permitted real-browser acceptance. If credentials, SQL, MFA or operator sign-off require explicit input, record one precise approval request and continue other independent work. Supply an evidence-backed GO/NO-GO assessment, not a deadline-based pass.

\n## 7. Final independent hardening after the first desktop briefing pass\n\n- The Home card now correctly distinguishes **not yet checked** from **not connected**; user-initiated refresh is required before requesting provider data.\n- List refresh bypasses a previously cached empty result; scanning precisely the allowed twelve Folders no longer falsely announces truncation.\n- Rendered native-Home JSdom regression checks cover verified task counts, safe escaping, failures and session logout; use GitHub Actions to execute them because the remote workbench cannot currently install JSdom reliably. These fixture tests are distinct from real authenticated browser acceptance.\n