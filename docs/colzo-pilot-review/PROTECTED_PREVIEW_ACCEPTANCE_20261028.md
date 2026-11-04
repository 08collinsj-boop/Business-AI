# Exact Preview deployment and remaining acceptance — 28 October 2026

**SECURE 14-DAY PILOT: NO-GO.** The approved Security Centre correction is deployed and live-accepted. MFA/AAL2, genuinely authenticated two-business acceptance, complete live-token replay/expiry and genuine recovery completion remain incomplete. No real business is signed off for activation.

## Deployment completed

- Runtime: `adecce31b88f5c1ffd623480524996cb5ae91581`, exactly the newly approved commit.
- Preview: https://business-1xljgk1nb-buisness-ai1.vercel.app/
- Deployment: `dpl_DE8GfJEB2B77XpzZaSnWvjbxc6L5`, READY, Preview (`target:null`), alias assigned.
- Branch alias remains `business-ai-git-fix-colzo-pilot-release-gat-63d24f-buisness-ai1.vercel.app` and now resolves to this deployment.
- Project/team and 23 branch-specific Development settings matched the previous verified configuration. Auth/db/rest healthy. Provider overrides remained empty, billing/voice/Meta/autopublishing disabled and broad free-pilot access disabled.
- SSO remains `all_except_custom_domains`; Production remains `dpl_B1pREw9u11SF5XJ8guv2zh8Dhd4X`.
- Full Auth configuration is byte-equivalent after canonical JSON sorting to the preflight configuration: SHA256 `7e9eb6efdfb6b3bdd1bfead1af5c89ffb3183e333edad8d814626258ec6992a2`. All nine redirect entries, MFA and other Auth settings remain unchanged.

Evidence: fresh preflight `log_xLCgeOAqmjc3`, safe environment comparison `log_YnjzqjYIDu8X`, deployment `log_iQ-z409Mcxkl`, READY/postflight `log_DWbK84ZuWf1W`, final preservation/head verification `log_Gd4h2nvHwjHF`.

## Executed live browser/account checks

| Check | Actual result and scope |
| --- | --- |
| Owner sign-in | Secure email/password authentication reached the real owner dashboard on the exact new Preview: four enquiries, five bookings and two open actions. Account timestamps confirmed the intended demonstration owner. |
| Security Centre correction | Authenticated Incident Centre refresh returned All systems available and the five server-returned controls. Security activity refresh returned its empty business audit view without the prior missing-auth error. No safety control was modified. |
| Customers | Two saved fictional customers loaded. Search found QA Alex Example; the profile showed the saved fictional contact, notes and related enquiry. No customer record changed. |
| Billing | Authenticated refresh returned Pilot access, no linked Stripe customer/subscription, and read-only payment safety. No checkout or paid operation was attempted. |
| Sign-out | Real UI Sign out removed all demonstration-owner sessions and refresh-token rows. A subsequent page reload showed Welcome back. Read-only backend count was zero/zero at that checkpoint. |
| Fresh reauthentication | Owner signed in again after sign-out to prepare private MFA enrollment. The final one owner session is intentional, not failed revocation. |
| Missing-auth API | `/api/incident-controls` and `/api/customer-portal?business_id=<older-business>` returned Authentication is required. These are missing-application-auth requests, not a two-user JWT test. |
| Public identifier manipulation | `/api/public-business?business_id=<older-business>` returned Business not available, exposing no tenant data. This does not replace bidirectional authenticated isolation. |
| Recovery without session | New Preview `/?auth=recovery` rendered This reset link is invalid or expired. No password was entered or changed. No genuine delivered/used recovery token was tested. |

Sign-out/record checkpoint: `log_pgPHtB2OGiCj`: four leads, five bookings, two customers, one private grant-audit event, zero pilot invitations, zero owner sessions/refresh rows. Reauthentication/account/MFA checkpoint: `log_0XVjFm5H5kYz`: demonstration owner zero verified factors, one session; older identity's sign-in timestamp unchanged.

## Two-user and replay limitations

An attempted secure sign-in for the older second identity was rejected by automatic approval review before any prompt or credentials were submitted: the request did not explicitly constrain the intended account and risked authenticating the wrong tenant. No workaround, different credential surface, forged token or administrative sign-in bypass was used. Explicit owner selection of the second identity is required before retrying that sign-in.

The older workspace has no scoped grant. It was not activated. Full positive own-workspace and negative cross-workspace browser/API checks need a usable, explicitly authorised fictional second-workspace arrangement. Prior 32 managed database role checks remain accepted only within their documented scope.

Previous retained-browser protected-read rejection after global logout remains evidence from the previous continuation. This deployment adds verified logout/session-row removal and reload denial. Raw revoked access/refresh-token replay, changed-permission live-token acceptance and AAL2 privileged writes remain unverified; no tokens were extracted from the browser.

## Expiry evidence

Read-only live grant verification (`log_1ijI4NKH5KJa`) retained the original start `2026-10-27T18:08:54.676335Z` and expiry `2026-11-10T18:08:54.676335Z`, exactly 336 hours. The live owner accessed the active grant. Its expiry was not shortened or changed.

Added and executed one isolated clock-controlled test against the actual records handler and shared Auth/entitlement code. With the same retained synthetic request and immutable fictional grant, reads worked one millisecond before expiry; GET/POST/PATCH failed at expiry and one millisecond after, including a supplied foreign tenant ID. No post-expiry customer storage call or write occurred. A newly verified request could not revive the expired workspace; mocked Auth revocation and removed membership were independently denied. Fixture records/timestamps were retained.

Result: **one new isolated acceptance test passed**, no network/live database. This is automated handler evidence with mocked upstream Auth/storage, **not a live browser/JWT expiry pass**. Existing 1,417 regression tests/build/static checks and 32 managed database checks were not rerun in this deployment-only continuation. There is no new runtime-code change; this follow-up adds tests and documentation only.

## Recovery and private MFA actions

Auth still targets the previously approved `business-8yir63npg` Preview, preserving the user's current instruction to leave all Auth settings unchanged. The new immutable Preview recovery URL is not among the nine allowed redirects. Its source sends an explicit same-origin recovery redirect. Genuine recovery on this new host cannot be marked passed from configuration or an earlier-host user-confirmed reset.

Prepared `RECOVERY_NEW_PREVIEW_20261028.PROPOSED.json`: append only the exact new-host `/?auth=recovery` entry; preserve all nine current entries, site URL and every other Auth field. **NOT APPLIED**; requires separate explicit approval. The earlier recovery-request auto-review rejection remains in force; no recovery email was sent by an alternate route.

The intended owner is signed in at Account security with Set up authenticator ready. The owner must privately click it, scan the generated QR in their authenticator, and enter/submit the current code. No QR/secret was generated or inspected in this continuation. Verified-factor, challenge and actual AAL2/privileged-operation checks must follow before MFA passes.

Operator/contact and data lifecycle requirements are documented separately in `OPERATOR_LIFECYCLE_INPUTS_20261028.md`. Live `/api/legal-public` still has empty fields and `identity_configured:false`.

No merge, Production/Auth configuration change, record deletion, pilot activation, invitation, new account, safety-control mutation or charge occurred. No different commit was deployed. The follow-up documentation/test commit is not a new runtime deployment.
