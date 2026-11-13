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
