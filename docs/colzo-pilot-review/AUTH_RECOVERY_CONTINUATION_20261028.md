# Development Auth correction and account acceptance continuation — 28 October 2026

**SECURE 14-DAY PILOT: NO-GO.** Auth redirects are corrected. A genuine Security Centre request-transport defect is fixed in source and tested, but not deployed. Owner-operated recovery/MFA and a genuinely authenticated second identity remain outstanding.

## Exact approved Auth change completed

Started from existing PR #65 head `545965c00ce50b417332829304058c2d46dea4bf`, clean locally and matching remote. Protected deployment `dpl_AdmMxMJx2bxeoZJ69RVPq3xVr1Qi` was freshly verified READY at runtime SHA `7a51d607164edb5ea61b1447fa193976d133ac29` on https://business-8yir63npg-buisness-ai1.vercel.app/. Development Auth/db/rest were ACTIVE_HEALTHY. Project/team/SSO matched the approved release.

Applied `PREVIEW_AUTH_REDIRECT_20261028.PROPOSED.json` once to Business-AI-Dev `mvwseobgkexzpmmkgcxe`, under the user's new explicit approval. The historical filename and bytes are retained for traceability; the proposal is now APPLIED.

- `site_url` now equals the exact protected Preview root.
- Appended only that root and `https://business-8yir63npg-buisness-ai1.vercel.app/?auth=recovery`.
- All seven prior redirect entries remain in their original order; total is nine.
- Complete before/after Auth configuration diff contained exactly `site_url` and `uri_allow_list`. Every other Auth field was unchanged, including MFA, SMTP, templates, JWT/session/rotation and provider settings.
- SSO remained `all_except_custom_domains`; Production deployment ID was unchanged. No hosting configuration or runtime deployment was performed in this continuation.

Evidence: preflight `log_rSW-MdoAdk_T`; one patch write `log_LBSbwDJXrj7Y`; fresh readback `log_ytjuVRXs213w`; full diff/SSO/Production verification `log_m4Bn1VKu_wJ4`.

## Actual revoked-session request test

The secure sign-in intended for the older test identity instead authenticated the existing demonstration owner again. Read-only Development timestamps confirmed which account actually signed in; the older identity's timestamp did not change. This is **not a cross-tenant leak or two-user pass**. No credential value was observed or copied.

Used the resulting two real sessions at separate origins of the same approved deployment: the immutable Preview and its verified protected branch alias. Global sign-out through the real UI on the branch-alias origin removed all demonstration-owner Auth sessions and refresh-token rows. Read-only backend result was zero/zero, `log_MqRrakqAm0Y9`.

The original immutable-origin browser still displayed its pre-existing signed-in workspace. A Security Centre Refresh request returned `Authentication is required`; this was not counted as token-rejection evidence because investigation found a request-transport defect, below. A subsequent normal Billing request through the main application's correct transport caused the original browser to return to Welcome back. The retained session was not restored and no protected Billing data was returned. This exercises revocation rejection through a real existing browser session without exposing or fabricating JWTs. It is a protected-read test, **not** a completed AAL2 write, raw refresh-token reuse, expiry-after-login or two-user API-tampering test.

## Genuine blocker fixed in source

`assets/security-center.js` attached only the standard Authorization header. The protected Preview's approved transport uses `X-Colzo-Supabase-Authorization` because of hosting-layer handling of Authorization. Thus incident-control/security-audit requests did not follow the same verified transport as the main app.

Added a focused regression against the actual Security Centre request function. Before the fix, the Preview-header expectation and cross-origin rejection cases failed. The smallest correction selects the already server-approved Preview header, removes the competing standard header on that path, and rejects another origin before attaching a bearer. Ordinary deployments keep standard Authorization. The server's JWT verification, membership, grant and MFA checks are unchanged. No authentication bypass, styling or MFA enrollment logic changed.

- Focused security/transport/Auth checks: **20 passed**.
- Required full regression after this relevant behaviour change: **1,417 passed; zero failures, skips or cancellations**.
- Build passed. Static/secret/temporary-marker checks passed for **361 JavaScript files**.
- The prior 32 managed database checks were not repeated; their accepted results remain evidence within their recorded scope.
- Correction is published on the existing PR #65 branch but **NOT DEPLOYED or live-reaccepted**. The current runtime remains the explicitly approved `7a51d607`. Both branch automatic-deployment safeguards remain unchanged.

## Genuine password recovery status

The corrected Preview's real Forgot password action opened its real recovery-request form. An attempted secure email-only recovery submission was rejected by automatic browser approval review **before any user prompt or email submission**: the secure UI inaccurately labelled this recovery action “Sign in to continue,” making the flow deceptive/uncertain to the reviewer. The rejection was not a user decline. No retry via API, another browser surface or an indirect route was attempted.

Read-only `recovery_sent_at` remained null, `log_3-MYbXG4_0Jt`. Therefore no recovery email was sent in this continuation, inbox delivery/branding and reset completion are **NOT VERIFIED**, and no token/link/password was inspected. Current sender and subject already use Colzo; source configuration is not inbox-delivery evidence. Previous user-confirmed recovery belongs to its earlier recorded run and does not complete this new-host journey.

The current visible recovery form is ready for the owner to operate directly. The owner must request the message, open the genuine link and complete new-password entry/confirmation/submission privately. Browser credential-change rules also require the owner to perform authenticator enrollment. No recovery or MFA pass is claimed before evidence.

## Existing-account and data status

- Demonstration owner: zero verified MFA factors; existing grant retained. The older identity has one factor and no approved scoped grant. No older account's factor is substituted for the intended owner.
- Second-user sign-in was not established in this continuation; no second workspace was activated, no account was recreated and no invitation was sent.
- Four existing demonstration leads, five bookings, one pilot grant, one private grant-audit event and zero pilot invitations remain. No stored business/customer record or grant expiry was changed.
- No merge, Production change, account removal, new paid provider, customer email or charge.

## Exact operator/contact and lifecycle decisions needed

These are owner decisions, not values the agent may invent. Existing drafts and the live public-identity endpoint remain incomplete.

| Required input/decision | What must be supplied or approved |
| --- | --- |
| Published operator identity | Exact authorised legal name, trading name and business structure for public display. Confirm the display values; prior conversation identity is not publication approval. |
| Published service address | Exact geographic/service address and explicit permission to publish it. Do not infer or expose a home address. |
| Support route | Confirm whether the already documented `support@getbusiness-ai.com` is the owned, monitored support inbox, and verify delivery. Supply/approve a support telephone number: the current identity-readiness implementation requires one. |
| Conditional registration details | Company number and VAT number only if applicable; do not invent incorporation or VAT registration. |
| Data return | Agreed export format, who handles requests, identity/authority verification and the time allowed to request/receive return after the pilot. |
| Retention/deletion | Concrete post-pilot retention period, deletion handling/timing, treatment of backups and necessary audit/legal retention, and the responsible operator. Current 365/730-day settings are review periods, not automatic deletion promises. |
| Participation documents | Approval of the completed pilot addendum and its precedence alongside the existing terms/privacy/DPA; real-business authority and named-user scope remain a separate onboarding decision. |

## Remaining work

1. Owner completes genuine recovery and MFA privately; then verify delivery, successful reset, post-reset sign-in, correct-account challenge/AAL2 and denied privileged actions before MFA.
2. Separately approve deployment of the new exact tested Security Centre correction before live-reaccepting that corrected transport. Do not deploy an unapproved newer SHA.
3. Establish the correct authorised second fictional identity/session and a separately approved usable fictional workspace arrangement, without silently designating the older workspace or activating a real pilot. Then run the positive own-tenant and negative cross-tenant browser/API tests. Prior managed-role checks are not substituted.
4. Complete the remaining real-token refresh/replay/AAL2-write tests and the security-gated full fictional journey, then assess onboarding against the supplied operator/lifecycle decisions. No real business is presently signed off for activation.
