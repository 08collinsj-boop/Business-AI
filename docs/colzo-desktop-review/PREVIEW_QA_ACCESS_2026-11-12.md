# PR #76 — approved Development key configuration and QA follow-through

12 November 2026 (UK). Authenticated visual acceptance remains blocked by expired pilot access.

## Configuration completed

The owner explicitly approved using the existing Development server key for this branch only. Verified the existing credential's project claim is `mvwseobgkexzpmmkgcxe` and its role is `service_role`, then copied it service-to-service without returning its value to chat, files, source, browser or logs.

- Vercel project: `business-ai`, `prj_d5DuC65u4hSITFRC54ygswiMW9ST`.
- Variable: `SUPABASE_SERVICE_ROLE_KEY`; type `sensitive` (non-readable after creation), target `preview` only.
- Exact branch: `feature/colzo-ai-desktop-command-centre-20261111`.
- Temporary variable ID: `416G38WZTXpjBems` (metadata only; this is not a credential).
- Re-read metadata confirmed that exact scope. No other branch or Production variable was edited.
- Vercel SSO protection remains enabled with `all_except_custom_domains`, confirmed after deployment.
- Deployment `dpl_8KUtvN1hPwfCuzsKogXuxB9N5U29` reached READY for exact commit `c3d1c4669763210f4713f1eaab6539d6cc9eca3f`. Deployment metadata identifies its environment as Preview.
- Deployment URL: https://business-hsae9nvwd-buisness-ai1.vercel.app/

Repository rules require Composio first. The variable was created through its active Vercel connection. An explicit `target: preview` attempt through the dedicated deployment connector was rejected before deployment: the API accepts omission for Preview, rather than that literal target. Official Vercel REST documentation confirmed the omitted target defaults to Preview. The successful exact-commit build used Composio with target omitted and its returned environment was verified as Preview.

## Live result and independent access check

Reloaded the actual application branch Preview in the existing legitimate browser session. It advanced beyond the previous generic server-credential failure and rendered:

> Your 14-day pilot has ended. Contact support@getbusiness-ai.com for help. Your account remains signed in and password recovery is available.

The source bootstrap loads legal state and authenticated business onboarding before displaying this expiry state. This is evidence that bootstrap now progresses beyond the former invalid-key failure; it is not a fresh password sign-in or MFA acceptance result.

A single read-only aggregate query against Development `public.colzo_pilot_access` found **2 grants total, 2 expired, 0 currently valid 336-hour grants**. No business IDs, customer records or personal data were retrieved. There is no existing active scoped pilot to use for continued workspace QA.

No grant was created, extended or reactivated. No authentication, MFA, DPA, membership, entitlement or tenant control was bypassed. No database write, schema change, billing change, pilot activation or Production change was performed.

## Continued review and verification

- Reopened and visually inspected the actual approved Stitch v4 Preview. Its briefing-first hierarchy, four compact metrics, matte graphite surfaces, restrained lime emphasis and attention/schedule relationship remain the comparison target.
- Reviewed the active native `#colzoOwner` desktop source and existing v4 CSS refinements. Remaining known differences from the reference include customer-count versus total-enquiry KPI semantics, weekly versus six-month trend, richer search/account controls, row-specific actions, suggested-draft inspector, and the 1024px rail versus drawer. These require product/data decisions or authenticated rendered inspection; unsupported functionality was not invented to match sample artwork.
- Full regression run at the exact deployed application commit: **1,726 passed, 0 failed, 0 skipped** (72.7 seconds). The npm test pre-step also built the React bundle successfully.
- Source verification passed: **422 JavaScript files**, syntax, secret-pattern and temporary-marker checks.
- `git diff --check` passed before this documentation-only update.
- Existing regression coverage includes expiry recovery preserving sign-in while withholding protected workspace access, desktop reading order, SVG safety, navigation, responsive source contracts and motion handling. Automated checks are not live visual acceptance.

No further CSS or behaviour changes were made without seeing the authenticated rendering. The native desktop workspace, fresh MFA, interactions and before/after captures at 1513×982, 1440×900, 1280×800, 1024×768 and 390×844 remain unverified.

## Remaining blocker and temporary configuration cleanup

Continuing live visual QA requires separately authorised access to a fictional QA workspace. The current instruction expressly excludes pilot activation, so this run cannot renew the expired grants or disable their enforcement. PR #76 remains draft and unmerged.

The temporary sensitive variable remains narrowly scoped while acceptance is pending. At completion, remove variable `416G38WZTXpjBems`, then rebuild the branch without it and retire any privileged QA deployments as appropriate; deleting project variable metadata alone does not remove credentials embedded in already-created deployment environments. Confirm the resulting Preview still has protection enabled and record cleanup evidence. Do not claim cleanup or visual acceptance completed in this run.
