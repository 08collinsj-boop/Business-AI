# Colzo development handback — 18 October 2026

**Release recommendation: NO-GO. Authentication recovery is incomplete.** The approved UI was preserved. This session completed safe local engineering, Preview configuration preparation and read-only Dev security/recovery checks. It did not complete authenticated feature acceptance.

## Source, commits and checked deployments

Repository: 08collinsj-boop/Business-AI. Continue draft PR [#26](https://github.com/08collinsj-boop/Business-AI/pull/26), branch `feature/colzo-complete-ui-motion-20261017`. Initial remote head was `e1e5847c8f6516d33b4c945a9b6a859059984029`; no newer work was overwritten. A clean isolated local worktree was used because the previous checkout was stale. Publication used Composio Git trees/commits and non-forced reference advances, checking the remote head before each advance. Local and remote trees matched.

| Commit | Verified change |
| --- | --- |
| `09e01587466af7f1f95e27b0618adb97e6d6afee` | Extend Preview target protection to direct APIs; reject unsafe public browser keys |
| `e4957cadea90a69892a3579bbe1b864c4b1c1a1a` | Separate website Preview targets the configured app Preview; unavailable state when unconfigured |
| `66bd21488c5f56c2545b037e1f5f2fe0f7d6de73` | Preserve owner, customer-account and directory destinations in website shortcuts |
| `0171574d1194e463c8f36aaea30bfaf41f20495a` | Include the referenced legal surface stylesheet in the separate website output |

Latest **checked runtime candidate**, exact SHA `0171574d1194e463c8f36aaea30bfaf41f20495a`:

- App: https://business-9l1bil562-buisness-ai1.vercel.app/ (`dpl_GMB7VjM49oKfnHRLN3KptR4LgDN1`, READY/Preview).
- Website: https://business-ai-site-9eae3w5y0-buisness-ai1.vercel.app/ (`dpl_2S4gxMJFRckxMikegBerp81nVMDN`, READY/Preview).
- Stable app branch alias: https://business-ai-git-feature-colzo-complete-ui-m-5f0407-buisness-ai1.vercel.app/ . Its target changes with future branch deployments.

These are **not fully working authenticated previews**. The app still shows the temporary authentication error. A READY build is not acceptance. The following documentation-only commit may create newer automatic Previews; the URLs above identify the tested code rather than assuming those later builds work.

## Authentication — FAIL / external credential-provisioning blocker

The original Preview's actual application `/api/public-config` returned HTTP 503, `Colzo development environment unavailable`, through the authorised Vercel fetch connector. This is application evidence, distinct from the outer Vercel 401 wall. The branch-specific guard correctly rejected inherited configuration. Supabase Dev Auth, Database and REST were all `ACTIVE_HEALTHY`.

Exactly seven Dev settings existed on `feature/colzo-account-journey-graphite-volt-20261016`, with none assigned to the current branch. Five non-secret settings have now been added **only** to the current branch's Preview scope:

| Key | Current branch result |
| --- | --- |
| `SUPABASE_URL` | Saved: `https://mvwseobgkexzpmmkgcxe.supabase.co` |
| `COLZO_EXPECTED_SUPABASE_PROJECT_REF` | Saved: `mvwseobgkexzpmmkgcxe` |
| `FRONTEND_AUTH_ENABLED` | Saved: true |
| `TENANCY_AUTH_ENABLED` | Saved: true |
| `COLZO_WHATSAPP_PERSISTENCE_ENABLED` | Saved: false |
| `SUPABASE_PUBLISHABLE_KEY` | **UNPROVISIONED in this branch scope** |
| `SUPABASE_SERVICE_ROLE_KEY` | **UNPROVISIONED in this branch scope** |

A before/after comparison of all 42 existing app environment entries confirmed their names, IDs, targets, branches, storage types and stored values were unchanged. The resulting inventory had 47 entries: only these five additions. No old branch, shared Preview, Pilot or Production entry was changed. Deployment Protection remains enabled. Evidence: [masked Vercel settings](evidence/20261018/preview-dev-settings.jpg).

Vercel stores the older branch's two keys as write-only Secrets. The connector requires a supplied value to create a new entry; it has no secret-by-ID duplication field. The native UI offers Edit, Rotate, disabled Copy, View History and Delete. Edit targets one Preview branch. Moving that entry would remove the older branch's assignment. No raw secret was revealed, copied, exported into a file, logged or put into source/screenshots.

**Owner action needed:** In Vercel project `business-ai` → Environment Variables → Add Environment Variable, create the two missing keys as **Secret**, target **Preview only**, Git branch **`feature/colzo-complete-ui-motion-20261017`**. Enter the existing **Business-AI-Dev** values privately from the authorised Dev provider/secret store. Do not rotate existing keys, move the older entries, use Production/Pilot values or broaden targets. Never paste them into chat. The native form has been prepared with both key names, blank secret values and only this Preview branch selected; Production and generic Preview are unselected. See [private entry form](evidence/20261018/private-dev-key-entry.jpg). Then create a fresh Preview of this branch (or allow Work to do so). Environment changes do not update existing deployments.

After the five settings and committed fixes, the checked candidate returned:

| Check | Actual result |
| --- | --- |
| `/api/health` | PASS: HTTP 200, `status=ok`; shallow configuration check only |
| `/api/public-config` | FAIL: HTTP 503, `Authentication is unavailable`; no key returned |
| Branch Dev URL/auth settings | PASS in Vercel configuration; effective public config remains unavailable |
| Browser-safe key / SDK initialisation | UNVERIFIED: branch Dev key not provisioned, no successful SDK bootstrap |
| Browser app | FAIL: Colzo login visibly reports temporary authentication unavailability |
| Existing account/Microsoft Authenticator MFA | UNVERIFIED on this candidate; historical successes are not a current retest |
| Sign-in/logout/returning session/refresh/dashboard | UNVERIFIED: do not enter owner credentials before preflight succeeds |
| Browser console | Two error entries captured on the earlier checked signed-out candidate; no error-free claim |

Dev Auth initially allowed only Pilot/older corrective-branch redirect patterns. After verifying Auth healthy and the frontend’s explicit redirect parameters, the current verified Colzo branch alias was added to the Dev allowlist: `https://business-ai-git-feature-colzo-complete-ui-m-5f0407-buisness-ai1.vercel.app/**`. Both existing patterns and the default Site URL were preserved; readback confirmed every other returned Auth setting unchanged. This does not allow arbitrary Preview hosts. Use the stable alias for the owner-controlled email verification/recovery check; disposable deployment URLs remain unapproved. The default Site URL still points to Pilot, so flows without an explicit redirect and email-template handling require review. Email confirmation/recovery round trips remain UNVERIFIED. No recovery email was sent, password changed, factor reset, account/business recreated or terms accepted.

## Engineering verification

### Preview API guard

Before the fix, regression tests demonstrated that direct routes could enter authentication/backend handling without the approved-target preflight. Eight direct handlers now reject a mismatched target before authentication/provider access: Bookings, Actions, History, Pipeline, Settings, Business Onboarding, Business Configuration and Voice (including its status/calls/webhook dispatcher). Stripe's Web Request webhook checks the target before reading the payload; signature/raw-byte semantics remain intact. Public Enquiry already had the target guard and its regression remains passing.

`api/leads.js` is immutable. It remains byte-identical; `/api/leads` and `/api/leads.js` are routed through the guarded Operations dispatcher to the original handler. Four protected-module hash checks remain intact: auth, Leads, Billing handler and Customer Portal handler. No auth bypass, RLS relaxation or Pilot proxy was introduced.

All 11 direct-route/rewrite regressions pass. On the hosted security candidate, the authorised browser displayed `{"error":"Authentication is required"}` at `/api/leads`. Connector fetches of protected owner APIs returned a provider `deployment_authentication_required` result, so those connector 401s are **UNVERIFIED application HTTP status**, not tenant-isolation proof. Real role and cross-tenant acceptance remains open.

### Browser-key disclosure boundary

Previously public-config returned any nonempty configured key. Eight regressions now verify rejection of secret API keys, service-role JWTs, user JWTs, malformed/arbitrary strings and a browser key equal to the server credential, while allowing publishable-key and legacy anon-JWT shapes. Responses are no-store and do not return rejected keys. Shape/role validation is not cryptographic JWT validation or proof that a publishable key belongs to Dev; successful SDK/Auth checks are still required.

### Website navigation

The separate website Preview's existing script changed app links to `/`, returning users to the website. It now uses the branch-scoped non-secret `COLZO_APP_PREVIEW_URL` setting on **business-ai-site**, preserving Production routing and the approved layout/styles. Unconfigured/invalid Preview targets produce an honest unavailable link. Build injection validates an HTTPS Vercel app origin with no credentials, query, fragment or non-root path.

A live browser found three additional owner/customer shortcuts still pointing at the website. A failing regression preceded their correction. All seven app-target links were subsequently inspected on the hosted candidate: owner links go to the verified app branch alias, customer account retains `/customer/account`, and the directory retains `/customer`. Clicking website Sign in reached the Colzo app, which correctly still displayed its unresolved auth error. Four navigation regressions and both configured/unconfigured static-site build variants pass.

## Functional acceptance matrix

**Automated PASS means repository fixtures/mocks or static checks, not a real customer workflow.** All current authenticated Dev flows remain UNVERIFIED because of the P0 auth blocker. Existing real records were not loaded or changed for acceptance.

| Feature | Current evidence | Live acceptance / remaining work |
| --- | --- | --- |
| Dashboard/KPIs/activity/quick actions | PASS: Pipeline/value-dashboard, controller and UI regressions | UNVERIFIED: reconcile actual tenant totals and links |
| Enquiries/manual leads/status/follow-ups | PASS: manual-lead, lead, history, AI handling and handover fixtures | UNVERIFIED: create/edit/refresh/escalation and public submission |
| Customers/search/profiles | PASS: Colzo records, protected writes, directory-state fixtures | UNVERIFIED: actual CRUD/search/linked record persistence |
| Projects/status/progress/enquiry links | PASS: protected writes and tenant-owned enquiry references | UNVERIFIED: real saves, refresh, stale conflict and second tenant |
| Quotes/GBP/drafts/lifecycle | PASS: exact-version atomic update, stale 409, lifecycle, accepted/sent locks | UNVERIFIED: real draft→sent→accepted/declined lifecycle; no sending |
| Bookings/calendar/edit/cancel | PASS: validation, tenant links and unsaved-warning regressions | UNVERIFIED: actual persistence, availability/conflicts; source has date-order validation but no overlap query or compare-and-swap update |
| Actions/reminders/follow-ups | PASS: tenant-scoped creation/completion and automatic-follow-up fixtures | UNVERIFIED: real persistence/reminders; no external notifications sent |
| AI receptionist | SIMULATED: grounding, escalation, allowance release and provider-failure fixtures pass | No paid calls. Live phone operation is separately gated and not certified |
| Business Knowledge/manual facts/approval/uploads | PASS: source approval, provider policy, grounding and failure fixtures | UNVERIFIED: real approval/retrieval/private upload round trips |
| Marketing/drafts/review/schedules | SIMULATED: approval, grounding, scheduler, publication safety and allowance fixtures pass | No generation, publishing, scheduled execution or existing schedule edits performed |
| Customer Portal | PASS: ownership/record exposure fixtures; protected source unchanged | UNVERIFIED: independent customer sessions, access links and live boundaries |
| Business details/services/hours/onboarding | PASS: membership-derived tenant, admin/owner validation and wizard fixtures | UNVERIFIED: real saves; preserve existing owner/business |
| Account/security/MFA/recovery | PASS: gate/session/step-up/security-method fixtures | UNVERIFIED: current owner MFA, renewal/logout, email recovery; narrow redirect correction verified in configuration only |
| Team/permissions/business switching | PASS: server-side role and access-refresh fixtures | UNVERIFIED: real owner/admin/member/two-business sessions; no invitations sent |
| Billing/subscriptions | SIMULATED: signature, mapping, entitlements, concurrency fixtures pass | Stripe TEST end-to-end UNVERIFIED; no live or TEST provider transaction performed |
| Referrals/review requests | PASS: referral/review and tenant-link fixtures | UNVERIFIED: real reward/review workflows; no email/message sent |
| Public profile/Connect/directory | PASS: public routing, visibility and directory fixtures | UNVERIFIED: real public tenant data exposure and supported search coverage |
| Notifications/support/feedback | PASS: existing preference/feedback/control regressions | UNVERIFIED: delivery and support-inbox operation; no external submission |
| Connected services/Meta/phone | SIMULATED/UNVERIFIED: gate/OAuth/token safety fixtures | No integration activated, token rotated or provider request made |
| WhatsApp inbox | UNSUPPORTED in this branch as an operational provider feature; separate PR17 foundation | Persistence remains false; no send/call/provider operation |
| Biometrics/passkeys | Capability/feature gated; existing security-method fixtures pass | UNVERIFIED on actual supported hardware; no universal Face ID claim |

No broad feature PASS, complete end-to-end certification or physical-device performance claim is made.

## Dev security audit — read-only metadata

Scope was exactly Supabase `mvwseobgkexzpmmkgcxe`. Database/schema inspection was read-only. The sole Supabase configuration write was the narrowly scoped Dev redirect-allowlist addition described above; no credentials, MFA factors, other Auth settings or database rows changed.

- PASS: all **52 public base tables** have RLS enabled; no public views were returned.
- PASS: effective privilege queries found **no anonymous SELECT/INSERT/UPDATE/DELETE**, and **no authenticated INSERT/UPDATE/DELETE**, on those 52 tables. Authenticated SELECT grants are limited to designated member-visible tables; policy predicates use membership `auth.uid()`/roles rather than editable user metadata.
- PASS: **10 public SECURITY DEFINER functions** inspected have fixed search paths and no `anon` or `authenticated` execution privilege.
- PASS (schema only): composite tenant foreign keys protect booking/action enquiry links, project/quote enquiry links, handovers, publications and several other relationships. This does not replace real API tests.
- Advisor: **8 INFO** RLS-enabled-without-policy findings on server-only/default-deny tables and **1 WARN** leaked-password protection disabled. No permissive policies were added to silence these. [RLS advisory](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- PASS (configuration only): minimum password length 12, confirmation required, TOTP enrollment/verification enabled, refresh-token rotation and password-change reauthentication enabled; JWT lifetime 3600 seconds.
- UNVERIFIED: real token expiry/revocation/renewal and MFA enforcement against current sessions. Provider session timebox/inactivity timeout are both zero; assess before launch.
- Remaining hardening: database SSL enforcement is **off**. IPv4/IPv6 access allows all addresses. The network API reports entitlement **allowed**, so no paid-plan assumption was made for that setting. Narrowing access or enforcing SSL needs a client/connection impact assessment; neither was changed.
- Consistency follow-up: customer-access/history links include single-record foreign keys in some legacy tables rather than composite tenant keys. Protected original modules were not modified; review with synthetic fixtures before any migration.

Advisor INFOs are not evidence of exposed tables, and a clean grant/policy inventory is not proof of independent two-tenant HTTP isolation.

## Reliability, cost and recovery

- Supabase backup inventory: **zero listed managed backups**, PITR false, WAL-G true. WAL-G alone is not a restorable backup. No backup or restore was attempted, and existing logical snapshots were left untouched.
- `docs/PILOT_DISASTER_RECOVERY.md` provides an isolated-target recovery sequence, storage verification, smoke tests, deletion reconciliation and explicit cutover. Its historical Pilot risk acceptance does not certify this Colzo public release.
- A safe future drill needs an approved isolated target, verified logical/provider backup including roles/schema/data and Storage coverage, documented recovery point, restored auth/tenant/feature tests, measured recovery duration, and an explicit cutover decision. No existing database may be overwritten to perform the drill.
- Existing tests cover AI-provider fallback and allowance release, knowledge failures/timeouts, publication safeguards and incident controls. No real provider outage was induced. Several direct DB/Stripe calls lack explicit application timeouts; expand bounded timeout/idempotency testing before scale.
- Marketing cron is configured daily; source requires a long secret and existing approval/entitlement checks. The cron, scheduled content and publishing workers were **not invoked**. Existing historical scheduled content needs investigation after auth recovery.
- Durable public enquiry rate limiting is supported; effective runtime mode/salt were not certified. In-memory mode alone is insufficient distributed abuse protection for launch.
- Logs are sanitised in new failures; complete alerting, operational monitoring and retention acceptance remain UNVERIFIED.
- **Additional charges incurred by this session: £0.** No upgrade/trial, payment, paid AI request, voice call, WhatsApp send, email, social post or paid service activation was performed. GitHub-triggered Preview builds used the existing Hobby project. No Production deployment, alias, domain, billing mapping or customer record was changed.

## Website and legal readiness

Current repository evidence supersedes older reports that said all eight pages still displayed Business AI. Titles/primary branding now say Colzo. They remain Pilot-oriented and are not approved public-launch contracts.

| Document | Remaining issue |
| --- | --- |
| Legal centre | Default identity-unconfigured notice; public-launch readiness unresolved |
| Terms | Pilot/B2B scope, operator identity, actual supported offer, pricing/cancellation/version approval |
| Privacy | Confirm actual data flows, recipients, retention, support and transfer safeguards |
| DPA | Confirm contracting processor identity, operational Article 28 commitments and owner acceptance |
| Acceptable Use | Final owner/legal review and acceptance version consistency |
| Storage | Recheck actual storage/tracking against deployed behaviour before launch |
| Subprocessors | Verify actual providers, downstream model routing, contracts, regions and transfer arrangements |
| Data deletion | Already says trading as Colzo, but hard-coded operator/contact still differs from other pages' unconfigured fallback; contains existing `Business-AI Pages` provider-app name |

The website uses the existing support@getbusiness-ai.com inbox and Business AI domains/canonical URL. Do not invent a replacement or change DNS. Confirm operator-approved legal name/address/direct contact, support readiness, legal versions and ICO position. No personal service address was added or exposed by this session; no agreements were approved or accepted.

The independent static website's `/api/legal-public` returns **404**; its legal script cannot populate identity from that backend, so default identity notices remain. Resolve deliberately without proxying arbitrary private APIs or publishing an unapproved address. The separate website returned HTTP 404 for the legal pages’ referenced Colzo surface CSS. A failing build regression preceded a minimal output-allowlist correction, preserving the established stylesheet and appearance. Configured and unconfigured site build tests verify the asset is included. The final website Preview returned HTTP 200 for `/assets/colzo-surfaces.css`, compared with HTTP 404 before the fix.

**BLOCKED BY COST / commercial hosting decision:** Vercel dashboard shows Hobby. Current [Hobby documentation](https://vercel.com/docs/plans/hobby) restricts it to non-commercial personal use. Public commercial operation needs an owner-approved compliant hosting arrangement; no purchase/upgrade made. [Supabase leaked-password protection](https://supabase.com/docs/guides/auth/password-security) requires Pro or above; it remains BLOCKED BY COST. Do not infer that Supabase Free itself prohibits commercial operation.

The Supabase changelog was checked; the relevant upcoming November 10 legacy TLS cipher removal requires modern clients. No related JavaScript SDK migration was needed for this batch.

## Actual tests and browser results

- Initial `npm run verify`: **767 pass, 0 fail**, 244 JavaScript files checked.
- Red-before/green-after regressions: direct Preview routes, public browser-key disclosure, separate website navigation and customer shortcuts.
- Final `npm run verify`: **791 pass, 0 fail, 0 skipped/cancelled**, 24.67 seconds for tests, React production build successful; **247 JavaScript files** and secret/temporary-marker checks passed.
- `git diff --check`: passed. All protected-module hash checks passed without updating expected hashes.
- Focused website regression/build run: **12 pass, 0 fail**.
- Exact runtime SHA GitHub check-runs returned only successful **Vercel Preview Comments**, not an independently rerun application CI suite. Local results above are not mislabelled GitHub CI.
- Cloud Chromium: masked settings verified; actual Leads auth error observed; latest website's seven app links inspected; clicking Sign in reached Colzo; unresolved temporary auth error observed.
- Separate twelve-script Chromium fixture runner was **not executed in this session**; browser automation was limited to the authorised cloud browser. Repository Node/jsdom mocks passed. No fresh 12/12 browser claim.
- Mobile Safari, real iPhone/Android/tablet, assistive-technology and authenticated mobile/desktop workflows: **UNVERIFIED**. No layout, transition or animation redesign and no frame-rate certification.

## Data ledger

**Synthetic Dev records created/modified/deleted in this session: none.** Database access consisted only of read-only schema/policy/privilege queries. Configuration/health reads and the one Dev redirect-allowlist update are recorded above. No owner/customer row content was required for the audit. The earlier five labelled acceptance records and the unintended `Unsaved motion check` booking remain untouched; their cleanup is pending an explicit decision. No new account/business/MFA factor or invitation was created.

## Priorities and owner decisions

### P0 — launch blockers

1. Provision the two existing Dev keys privately in the exact current Preview branch; fresh deployment; public-config 200/exact Dev URL/browser-safe key and SDK preflight; owner personally signs in/MFA; verify logout/refresh/returning session/dashboard.
2. Verify Dev email/recovery on the newly allowlisted stable branch alias and inspect the unchanged default Site URL/email-template behaviour; no automated recovery communications during this session.
3. Run synthetic real persisted feature journeys and independent two-tenant/owner-admin-member API tests. Verify guessed/forged IDs, cross-links, stale updates, accepted quotes and audit access. Do not use unrelated customer data.
4. Establish and rehearse safe recovery, complete SSL/network/abuse protection assessment, and resolve material security failures before public exposure.
5. Final operator/legal identity/version/contact/ICO approval and a compliant commercial hosting decision. Spending remains prohibited.
6. If charging, independently certify Stripe TEST checkout/webhook/portal/entitlements, pricing and cancellation. Never use live payments.
7. Exact release/rollback evidence and separate owner approval; no merge/domain/public release authorised.

### P1 — important follow-ups

- Booking overlap/availability and stale-edit policy; avoid promising conflict prevention until implemented and tested.
- Database/Stripe bounded timeouts and idempotency, session expiry/renewal, durable abuse controls, monitoring, support and recovery exercises.
- Static website identity delivery; consolidate confirmed legal identity without inventing values. The missing legal stylesheet output has been corrected.
- Legacy link consistency and constrained migration review, historical Marketing schedule investigation, full accessibility/mobile/browser acceptance.

### P2 — separately certify before advertising

Live AI phone service, operational WhatsApp, universal biometrics, broader social automation, unsupported directory/Connect capabilities and any other provider-dependent feature. Keep honest unavailable/capability-gated states.

**Owner decisions actually needed now:** privately enter the two Dev secrets; later verify legal/contact identity, approve any spending/commercial hosting/paid security or restore target, decide old synthetic-record cleanup, and authorise release only after acceptance. Routine development fixes above were completed without asking for design or implementation permission.
