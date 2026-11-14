# Colzo PR #77 — QA-001 retained hidden records after logout (13 Nov 2026)

## Independent browser evidence / scope

Read `Colzo_PR77_Focused_Retest_2026-11-13.html` and its complete evidence pack (original unmodified QA output). Work's corrected-Preview browser session reported first password-only MFA gate **PASS**, invalid authenticator code **PASS**, valid MFA **PASS**, and verified desktop search workflows **PASS**. **P1 remained:** after a genuine authenticated owner session was signed out, and on a second password-only sign-in, hidden legacy selects `#bookingLead` and `#actionLead` under hidden `#dashboardApp` still included the fictional enquiry name and job type as `<option>` text. The accessibility tree had no business records, but the full DOM did. Evidence E03/E16 and `03-leak-locations.json`. Neither an AAL1 server bypass nor cross-tenant exposure was demonstrated.

## Fix candidate — DOM must be empty even when hidden

- `clearPrivateState()` now scrubs both dynamic lead-selector options, removes their previous selection, resets the dynamic configuration-template option, clears all unsaved legacy form values, summaries, profile names/media and other dynamic tenant widgets, and resets tenant-associated JavaScript state.
- The sign-out button calls `clearPrivateState()` and closes the workspace *synchronously before awaiting* Supabase `signOut()`. `SIGNED_OUT` clears immediately inside the auth event callback, not only after a scheduled bootstrap.
- `privateDataEpoch` increments whenever a private session is discarded. `loadAll`, `loadWorkItems`, and the shared authenticated API wrapper reject/ignore results obtained under an earlier epoch; a delayed response cannot repopulate private legacy DOM after logout or an MFA boundary change.
- Public website/directories and their independent data paths are unchanged. Account legal/recovery and valid MFA flow are unchanged. No production or SQL changes.
- Nine red-then-green synthetic test cases: `tests/colzo-postlogout-dom-containment.test.mjs`. They reproduce the concrete hidden DOM option labels, direct button clearing before a delayed sign-out promise, synchronous `SIGNED_OUT` cleanup, form/brand/profile scrubbing, and request epoch guards.

## Independent acceptance still required — P1 not closed

Using the **exact new protected PR #77 Preview SHA** and existing fictional owner QA account, perform genuine MFA and load records, sign out without page navigation, immediately inspect **all hidden DOM text/options**, explicitly `#bookingLead` and `#actionLead`, and verify no old enquiry/booking strings anywhere. Then sign in with password but without authenticator, inspect the full DOM and AX tree, deliberately fail a code, then complete valid AAL2 and verify correct records load. Test a sign-out while a dashboard request is in progress and reload/back-forward paths, where feasible. Never include credentials or tokens in captures. Run the genuine iPhone/mobile and independent role/tenant tests only with authorised QA accounts.

**Pilot verdict remains NO-GO** pending independent browser retest and blocked backup, hosted SQL, ClickUp and per-role/tenant security and operational acceptance. Keep PR #76/#77 draft/unmerged. No Production, billing, customer records, pilot invites or activation.

## Follow-up Work retest on the exact corrected Preview (13 November 2026, 02:09–02:13 GMT)

**The first correction was insufficient:** Work independently reproduced that `#bookingLead` and `#actionLead` had been cleared correctly, but **P1 still FAIL** because the *hidden* `#colzoAttentionList` held booking titles, and `#handoverList` held fictional customer names, contact details and conversation summaries after two logouts and throughout password-only MFA, including after an invalid challenge. The accessibility tree was clean but the complete DOM was not. No server-side MFA/AAL1 bypass was shown. Source: `Colzo_QA001_Final_Security_Retest_2026-11-13.md`, evidence E02/E03/E04/E05/E07.

### Follow-up code candidate

The privacy reset now also removes all children of both named containers and `#colzoScheduleList`, `#teamList` and `#pilotFeedbackList`. Rather than relying exclusively on brittle lists of element IDs, it sweeps **all authenticated legacy** `#dashboardApp .work-list` and `#dashboardApp .colzo-ops-list` containers, without touching public profiles, auth screens or the static application shell. Associated private attention/schedule summary counters are also reset. This executes synchronously at sign-out and before any later account sign-in's MFA challenge; the previously added `privateDataEpoch` async response checks remain intact.

`tests/colzo-postlogout-dom-containment.test.mjs` adds two new **red-then-green** tests reproducing the exact hidden attention/handover retention and checking that other work lists with newly introduced IDs are scrubbed. The earlier nine cases for select options, DOM form values, synchronous logout, versioned in-flight request containment and hidden profile/tenant metadata remain.

**Release status:** still **NO-GO**. The candidate requires an independent Work browser retest on the **exact new protected Preview**: MFA-valid owner → load records → immediate Sign out → inspect entire DOM and `#colzoAttentionList`, `#handoverList`, form options and all other hidden private markers → password-only sign-in → invalid MFA → valid MFA and correct records → second logout and repeat the full DOM inspection. Check no stale data reappears after an in-flight response if testable. Capture redacted evidence and report PASS/FAIL/BLOCKED, without changing code or configuration. Automated tests and Vercel READY are not browser proof. No Production, hosted SQL, customer data, billing or pilot activation changes are authorised by this patch.
