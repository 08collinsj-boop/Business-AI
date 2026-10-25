# Colzo pilot readiness execution — 25 October 2026

**Decision: NO-GO for genuine pilot onboarding.** The isolated app/website candidate passes automated regression, but actual recovery, operator integration, deployed security acceptance and privacy/account gates remain open. Nothing was merged or deployed. No genuine pilot account or invitation was created, no prospect was contacted and no paid resource/API was used.

## Completed engineering work

Verified the actual GitHub branch and PR state: PR #63 remains open, draft and unmerged at `4ef8bb3dcc6da6cea159428530f43fa370006ff8`. Both previously published commits remain in history. All eleven named PRs were inspected and their exact base/head changes inventoried in `PR_DEPENDENCY_AUDIT_20261025.json`.

App dependency order: #57 → #58 → #59 → #61 → #63. All are already ancestors of the pilot head. #60 is a separate descendant of #59 and is not an ancestor of the free-pilot head. Its customer-visible replies, composer and reply migration remain excluded and the free-pilot scope regression remains passing.

Website order: #49 → #50 → #52 → #54. #62 is based on `colzo-site-production` at the same tree/history position as #54's head and adds search/build protections. These branches were not ancestors of #63. They were integrated locally into `integration/colzo-pilot-readiness-20261025` by a genuine two-parent merge; no shared branch was merged or rebased.

Resolved four conflicts: homepage, pilot page, contact page and standalone website build test. Retained the editorial Graphite & Volt design, real workshop photo, mobile menu, supporting routes, search metadata and Preview noindex. Preserved the newer approval-only scope: exactly 14 days from activation, two users, no card, no automatic paid conversion, no telephone answering or AI Marketing. Removed a misleading Marketing-pilot inclusion from the incoming copy. Kept the newer safe contact content and restored its canonical metadata.

Actual live browser inspection then reproduced two additional homepage copy defects: the live website calls access a “Development preview” and says customers can track “replies”, although those replies are deferred. Added a failing regression and corrected the isolated homepage to existing approved account access and enquiry progress. Public live pages remain unchanged.

Both Vercel configs explicitly disable automatic deployments for the new integration branch. No authenticated app runtime, API/library, migration SQL, billing setting or customer portal implementation was changed in this integration.

## Commits and fresh verification

| Commit | Change | Fresh evidence |
|---|---|---|
| `4ef8bb3dcc6da6cea159428530f43fa370006ff8` | Original remote pilot head, preserved | Source/ledger/PR verified; existing tests included in integrated suite |
| `0cae8c54e2cc3f01e4d03b5a8542e2152d209b5f` | Merge website stack with scoped terms and deployment guards | 1,337 passed, 0 failures/skips/cancellations; app build and 345-file static checks passed |
| `9823f1940e28b56e7149d7682496d3f16de0f320` | Correct public account/portal wording | 1,338 passed, 0 failures/skips/cancellations; app build and 345-file static checks passed |

The two integration-copy tests first failed before the scoped corrections and passed after them. The third public-wording test failed against the observed copy and passed after the minimum fix. Final focused group: 3/3. Earlier focused website group: 21/21. Full `npm run verify` includes the migration/PGlite tests; none were excluded. Standalone website Preview/production build matrix, internal link/anchor resolution, sitemap uniqueness and Preview noindex checks passed in that suite. Diff whitespace checks passed.

An initial 1,294-test baseline run completed its tests, but its subsequent static phase overlapped the integration preparation. It is not used as an exact-head acceptance certificate. The later complete, unchanged-tree runs above supersede it. Previous native PostgreSQL concurrency/roundtrip results remain historical; no fresh native PostgreSQL race or genuine source-data restoration is claimed in this task.

## Actual Development database — read only

Project `mvwseobgkexzpmmkgcxe` is ACTIVE_HEALTHY, PostgreSQL 17.6.1.166, organisation plan free. Inventory: 16 Auth users, two MFA factors, three buckets and 12 Storage object metadata records. These aggregates do not prove which account owns the factors or whether Storage bytes are recoverable. The scoped grant table and private operator schema remain absent.

All 59 recorded SQL statement arrays exactly equal the archived capture. The fresh 57-file/59-entry comparator again finds 46 strict SQL matches and two same-version/name divergences:

- `20261008214459_pilot_block_unattended_marketing_publishing`
- `20261008215744_pilot_identify_and_block_automatic_marketing_publications`

The repository uses guarded DO blocks; the ledger directly adds constraints. Prior isolated findings about different repeat-application behaviour remain relevant; no history was silently repaired. Eleven source files and thirteen ledger entries lack strict matches. Missing dependencies, split strategy migrations, superseded usage-limit SQL, ledger-only clients/projects/quotes/complaints/review queue and Development-only WhatsApp remain preserved in the existing reconciliation evidence.

Fresh catalog counts: 71 public/Storage relations, 560 columns, 173 indexes, 413 constraints, 44 policies, 22 non-extension public functions, five triggers and seven extensions. Sorted Python JSON catalog hash is `dcc095adcd0d85a4382f797dc97b766db76dec393e2095c1510e78274452ed42`, matching the latest saved checkpoint using that method. This does not resolve the older differently computed `b4b8...` hash or constitute a source-to-restored catalog comparison. Live pg_cron 1.6.4 and pg_net 0.20.4 are present; neither was fabricated in a local reconstruction.

Managed backup inventory is empty; PITR is false. walg_enabled is not proof of an available recovery archive. No complete source dump, encrypted real-data bundle, Storage-byte export, successful decrypt/restore or real restored Auth/MFA test was obtained.

Precise blockers: no established secure direct/session-pooler export connection in this runtime, no authenticated complete object-byte export path, no operator-controlled encryption recipient/private backup destination, and no established isolated full Supabase stack with outbound providers disabled and all required recoverable configuration/secrets. No password/key was reset, token extracted or real Auth secrets exported to make progress. No psql/Docker runtime is installed here. Free local restoration is a viable proposed route, not a completed recovery test. Management SQL result access is not an acceptable substitute for a consistent private complete backup.

Continue with the existing ten-step private recovery procedure in `RECOVERY_AND_RECONCILIATION_20261024.md`: consistent complete DB/role snapshot, separately consistent Storage-byte inventory and hashes, recoverable Auth/runtime configuration, authenticated encryption to an operator-held key, verified decryption, isolated compatible restore, full records/bytes/schema/sequence/ACL comparisons and consented local Auth/recovery/tenant tests. Do not restore over shared Development or use synthetic rows as proof of genuine recovery.

## Security acceptance

Fresh advisor results: eight RLS-enabled tables with no policies and leaked-password protection disabled. All 24 table/role rows were checked with separate SELECT/INSERT/UPDATE/DELETE privilege calls: anon/authenticated have none on the eight tables; service_role has all four. Preserve that server-only design. Reviewed record/incident routes enforce server-resolved tenant membership/roles; this is not a complete deployed privileged-route certificate. Evidence: `RLS_SERVER_ONLY_AUDIT_20261025.json`.

Auth configuration read-only: minimum password length 12, email confirmation required, TOTP enrolment/verification and refresh rotation enabled; signup enabled; site URL still points at the older Pilot. No shared setting changed. Supabase's current official docs put managed leaked-password protection on Pro and above, so it cannot simply be enabled under the no-spend restriction. Keep it as a residual security finding requiring a documented decision; unique password-manager-generated passwords and MFA are useful controls but are not equivalent to the missing breach check. Do not introduce an ineffective client-only substitute.

The fresh synthetic suite covers exact 336-hour expiry including the London clock change, denied direct reads, active-tenant isolation, revocation/pending access, paid legacy compatibility, unprivileged operator denial, atomic provisioning/audit rollback, idempotency, reserved seats, wrong/unverified/reused invitation recipients and legacy-writer seat protection. Tests do not prove genuine Auth/session recovery, independent-backend races, exposed API/GraphQL/Storage behaviour or physical device acceptance.

## Vercel, browser and website

Read-only Vercel checks confirm the app's newest existing Preview is READY at `35a0edafab22753c2584c535a3950c70b02c4e96`: https://business-89p8aur0u-buisness-ai1.vercel.app/ . Its login screen loads in the browser; it lacks the later security commits and cannot certify this candidate. No exact `9823f19` Preview was created.

The site has an existing READY search-fix Preview at `8df7397a99840a01174787b0bec0d611ac010aa8`: https://business-ai-site-bln0stke5-buisness-ai1.vercel.app/ . Deployment metadata was inspected; no authenticated/site-device acceptance is claimed for it.

Live HTTP checks: homepage, /pilot/, /contact/, Privacy, Terms, DPA, subprocessors, robots.txt and sitemap.xml all returned 200. Live desktop homepage and help search were exercised; searching Bookings returned two guides. No marketing form or app login/reset was submitted, no AI provider called and no actual-record write tested. Responsive/mobile-menu behaviour is covered by synthetic DOM/CSS tests, not a physical iPhone or browser-emulated iPhone run. No Lighthouse score, keyboard-complete accessibility certificate or complete app E2E pass is claimed.

Current website gaps include old Marketing/Billing guide context, incomplete real operator identity and lack of an accepted exact-SHA app demonstration. These are scoped release-review items; a redesign was not expanded. Keep new interest optional and example-data only.

## Marketing, recruitment and legal

See `MARKETING_AND_RECRUITMENT_20261025.md` for exact Page findings, correct-video rejection, scheduled queue, prospect history, shortlist and unsent drafts. Key findings: 2446010869258438 is an illustrated promotional clip, not the approved walkthrough; it remained SELF and was not published. The current approved walkthrough file is 76 seconds. No public walkthrough URL can honestly be returned. The 24 October public promo remains https://www.facebook.com/reel/1106723508515376/ .

Hartlepool Chat's one-off correct Reel post remains pending; one earlier introduction is declined and James's Published tab says no posts. Its rules prohibit promotions/business adverts; a saved one-off exception is not permission for repeat/Page advertising. No duplicate/resubmission/new personal post. Seven Page posts remain queued for 26 October–1 November with distinct dates. No new pilot reply found in the searched inbox/Page threads. Warm personal contacts are prioritised; no outreach sent.

Authenticated iubenda account returned verified=false; list_sites returned empty. The existing privacy/terms/DPA documents need confirmed operator identity, a scoped pilot addendum, accurate enabled-provider/transfer review and an agreed tested retention/return/deletion process. Prepared owner guide and operator/privacy runbook; neither is legal certification or an adopted policy. No iubenda subscription/service purchased or verification state changed.

## Outstanding gates and owner actions

| Severity | Blocker | Precise next step |
|---|---|---|
| Critical | Genuine Development recovery incomplete | Privately establish source export/object/config access, encryption recipient/destination and isolated compatible runtime; run and verify the real recovery drill |
| Critical | Scoped SQL/operator workflow absent from shared Dev | After recovery/reconciliation review, prepare exact reviewed application proposal; obtain separate shared-SQL approval; retain current guards until acceptance |
| High | No matching accepted Preview | Approve the exact final candidate Preview only after prerequisite review; keep Production and old Pilot untouched |
| High | Real Auth/MFA/recovery/two-tenant acceptance missing | Authorise two synthetic identities/businesses and complete email, TOTP, reset/session and tenant/expiry tests; never use older Pilot factors as Dev proof |
| High | Physical iPhone/Safari/PWA not tested | On the exact approved Preview, test login/MFA, keyboard, scrolling, navigation, saved-record refresh, background/reopen and sign-out; record device/iOS/SHA/results |
| High | Privacy/operator/retention and provider gates incomplete | Verify existing iubenda account; confirm legal business details privately; review terms/DPA/provider transfers and retention/deletion with appropriate professional advice |
| Medium | Correct walkthrough absent publicly | Locate/review the exact approved 76-second asset in the publishing workflow; do not publicise the unrelated 22-second node |
| Medium | Recruitment not confirmed | James speaks privately to his two warm contacts; later select exact 3–5 businesses and approve their individual accounts/invitations |

No password, code, key or backup should be sent through chat. No immediate MFA interaction is requested against the stale Preview.

## Separate release decisions

| Area | Decision | Evidence |
|---|---|---|
| Engineering readiness | BLOCKED | Isolated integrated code verified; operator/recovery/deployed acceptance incomplete |
| Database recovery | BLOCKED | No genuine complete encrypted backup or restore |
| Security acceptance | BLOCKED | Synthetic negative paths pass; actual RLS/operator/MFA/recovery gates remain |
| Website readiness | BLOCKED | Local route/build tests pass; exact-SHA browser/mobile, legal and copy acceptance pending |
| Pilot account readiness | BLOCKED | No real accounts approved/activated; required workflow not released |
| Marketing readiness | BLOCKED | Queue preserved/drafts prepared; walkthrough rejected as wrong asset, group post pending, no confirmed recruits |
| Public paid launch | FAIL | Paid rollout deferred and release/privacy/recovery gates unmet |

Automated test PASS is only one gate. It is not permission to onboard customers, apply shared SQL or publish code.
