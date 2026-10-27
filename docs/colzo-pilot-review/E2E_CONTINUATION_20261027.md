# Protected Preview acceptance continuation — 27 October 2026

**Secure 14-day business pilot: NO-GO. Existing single-account demonstration results remain accepted within their original scope.**

Started from PR #65 head `1605da032255a1d0d2e2b03df59b6702c54277b7`, on the existing `fix/colzo-pilot-release-gates-20261026` branch. This is a focused continuation, not a replacement audit or recreated demonstration.

## Exact live target

- Preview: https://business-2ziloe07w-buisness-ai1.vercel.app/
- Deployment: `dpl_3ct98f45wju5DL1K9ek8nZE4X37B`, READY at the starting SHA.
- Project/team: `prj_d5DuC65u4hSITFRC54ygswiMW9ST` / `team_rCWQ41TMWjGseuzS4IDTsbZ4`.
- SSO remains `all_except_custom_domains`; an independent unauthenticated request returned HTTP 302 to Vercel SSO. No bypass/share link or security configuration was created.

## Actual checks completed

| Check | Result |
| --- | --- |
| Secure sign-in to existing demonstration | PASS; actual owner dashboard loaded, with four existing enquiries and five bookings. No new credentials or sessions were fabricated. |
| MFA mapping | Development demonstration identity still has zero verified factors; the older Development identity has one. Account Security rendered “Not enabled” for the demonstration. The older identity's MFA is not counted for this account. No enrollment/settings change. |
| Billing | Read-only view; no Stripe customer/subscription linked and no checkout controls. Misleading Marketing-included wording reproduced and corrected in source below. |
| Marketing | Actual request resolved to “You do not have permission for this action.” No generation, schedule or publish action submitted. |
| Automations | Actual request resolved to the same denial. No strategy save, enablement or run submitted. |
| Knowledge uploads | UI explicitly says file uploads are unavailable in this pilot and directs users to manual facts. No file selected or upload attempted. |
| Team | Existing owner row loaded. No invitation created or sent; no seat/membership modification. |
| Integrations | Website Assistant explicitly unavailable; no connection flow opened or provider operation submitted. |
| Privacy page | Current Preview still renders the unconfigured operator legal/trading name, geographic address and contact-email notice. No identity/address invented or published. |
| Sign-out | PASS; actual sign-out returned to Welcome back with no owner workspace. This does not prove revocation of every previously issued access token. |
| Data/grant preservation | Read-only before/after: four demonstration leads, five bookings, one grant, one private grant-audit event, zero pilot invitations. Original activation and expiry unchanged. |

The original demonstration grant remains active from `2026-10-27T18:08:54.676335Z` until `2026-11-10T18:08:54.676335Z`, exactly 336 elapsed hours. No other workspace received a grant. Evidence: `log_YoAvxOYtTtSK`, `log_XqeGENaeNPF-`, `log_Z32YZalAEE1p`, `log_SjUep1FwFgmr`; unauthenticated SSO check `log_v0F6gUbO62lj`.

Prior accepted FAQ/refusal/quote/pending-booking/retry/customer-persistence, user-confirmed password reset and physical Safari results were carried forward, not recreated or relabelled as newly run. They concern their previously recorded deployments and scope.

Two browser calls timed out; after resetting the automation connection, the existing signed-in tab was recovered and the checks above completed. No timeout is counted as a pass. Composio archive/remote download attempts also timed out; a read-only local Git clone supplied the exact source commit for regression work.

## Small source correction and regression results

Billing incorrectly promised “Starter and AI Marketing” merely because `pilot_free_access` was true, although the scoped Marketing server denies access. Replace that sentence with: “Your approved pilot features are available at no charge. Feature availability follows the current pilot scope.” Paid-plan rendering, entitlements, billing state and API controls are unchanged.

The new three-case renderer regression reproduced the misleading claim before the fix, then passed. Initial focused checks: 14 passed. The required full run exposed four pre-existing stale blue-colour expectations from the earlier Volt conversion: public-chat focus, directory-submit focus, directory border/search border, and owner focus. Updated those assertions to the actual approved Volt `#c8ff2e`, preserving their accessibility/layout requirements. No further product styling changed. Corrected focused checks: 48 passed.

Final `npm run verify`: **1,412 passed; zero failures, skips or cancellations; build passed; static verification passed for 360 JavaScript files, secret patterns and temporary markers.** Tests use isolated fixtures, not real providers. No native PostgreSQL suite was repeated because SQL did not change and its prior verified results are retained.

The correction is published with this record on the existing branch. It is **not deployed or live-reaccepted**. Both Vercel configurations still disable this branch's automatic deployment; cron configuration remains empty. PR #65 remains draft/unmerged.

## Genuine remaining gates

1. **Managed MFA acceptance on the intended pilot owner:** the current demonstration account has no verified factor. Its prior explicit MFA deferral is not a real-pilot security pass. Enrollment/new credential setup requires the account owner; no protection was weakened.
2. **Managed two-active-business isolation, session rotation/revocation and expiry/revocation boundaries:** remain unverified. Only one approved demonstration grant exists. Existing synthetic/native results remain evidence, not managed-token acceptance. Completing active-B/boundary fixtures would require separately scoped disposable demonstration access or controlled fixtures; this task expressly forbids activation and preserves existing grant timestamps. No invitation/third-seat/expiry mutation was attempted.
3. **Current-host recovery redirect:** read-only Auth config still uses the earlier `business-fbk9vnos6` Preview and its recovery route. Neither the current immutable Preview nor its recovery route is allowlisted. Prior successful reset remains accepted on the earlier host; current-host recovery is not accepted. No recovery email or Auth write performed. Any correction must preserve the existing allowlist and all unrelated security settings, under the separate Auth approval boundary already recorded in the release handoff.
4. **Operator/pilot documentation:** live operator identity/contact details and the approved pilot data-return/retention arrangements remain incomplete. No customer-data onboarding signoff is claimed.
5. **Final business selection/authority and activation:** intentionally outside this task. No real pilot is activated or invited. Complete the gates above before a separate activation decision.

Full actual-source backup/restore remains explicitly deferred to public launch, not falsely reopened as newly completed or demanded in this narrowed continuation. No Production, old Pilot, grant, billing-history, provider, Auth or SSO setting changed. No merge, deployment, real-data test write, invitation or charge.
