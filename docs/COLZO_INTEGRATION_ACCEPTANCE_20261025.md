# Colzo integration and acceptance checkpoint

25 October 2026. **NO-GO for real business onboarding.**

## Published isolated code

Branch: `integration/colzo-free-pilot-readiness-20261025`.

- Starting pilot head: `4ef8bb3dcc6da6cea159428530f43fa370006ff8`, PR #63 open/draft/unmerged.
- Website source: `8df7397a99840a01174787b0bec0d611ac010aa8`.
- Integration merge: `a3f7f32877f74a3459611605dbdf2459f8b35dae`.
- Public-copy correction: `c3e1ee7888d53747f2c66219e55d9637a7b4389e`.
- Tested/published code tree: `f0bbfa1e0ff439c7e9447f4922e61294278061f7`.

The Git data API normalised commit timestamps to UTC. The initial local commits `cd7125d` and `2a92c6e` therefore differ from the published commit hashes. Both uploaded trees exactly matched local Git trees. The published branch was then fetched and verified again at `c3e1ee7`; this is not reliance on hash-name similarity.

## Integration scope and order

| Stack | Verified order / action |
| --- | --- |
| Application | #57 → #58 → #59 → #61 → #63; already in the pilot head |
| Deferred replies | #60 deliberately excluded; release-scope gate passes |
| Website | #49 → #50 → #52 → #54 → #62; combined with the pilot head locally and published only to the new isolated branch |

Four actual merge conflicts were resolved in homepage, contact, pilot-interest and site-build tests. Preserve newer editorial/mobile design, existing informational routes and preview noindex protection; preserve approval-only signup and all scoped-pilot guards. No app API/library/React/auth code or migration differs from PR #63's starting head. Both Vercel configs explicitly disable automatic deployment for the integration branch. No shared branch was merged and no deployment was created.

Public-copy regression tests first failed 3/3 for Development-access wording, deferred replies and lost human-support guidance. Corrections remove Development-only public access guidance, describe customer progress truthfully, distinguish legacy paid billing from free pilot access and restore account/privacy/support routes. Pilot pages state limited places, approval, exactly 14 days, no card and no automatic conversion.

## Fresh tests

| Check | Result |
| --- | --- |
| Initial focused integration | 33 pass / 2 fail / 0 skip; canonical/contact and pilot-preparation conflicts corrected |
| Focused integration after correction | 35 pass / 0 fail / 0 skip |
| First integrated full suite (`cd7125d` local tree) | 1,334 pass / 1 fail / 0 skip; contact pilot-interest wording corrected |
| New public-copy tests, red phase | 0 pass / 3 fail / 0 skip |
| Copy plus legacy-route focused green phase | 16 pass / 0 fail / 0 skip |
| Full `npm run verify` at local `2a92c6e` | 1,338 pass / 0 fail / 0 skip / 0 cancelled; build and static checks pass |
| Full `npm run verify` after fetching published `c3e1ee7` | 1,338 pass / 0 fail / 0 skip / 0 cancelled; build and static checks pass |
| App build | 228,622-byte React bundle before compression |
| Static checks | 345 JavaScript files; secret-pattern and temporary-marker checks pass |
| Source whitespace check | Pass |

An earlier baseline run overlapped source integration; it is excluded as exact-SHA acceptance evidence. Native PostgreSQL concurrency/restore evidence remains historical and was not rerun here. Current executable staged SQL/PGlite cases run in the full suite remain synthetic, not actual Development recovery or real Auth acceptance.

## Read-only Development and recovery

52 public tables, 59 recorded migrations, 16 Auth users, 12 Storage object metadata records. Pilot grant table and private operator schema are absent. The managed backup list is empty, PITR is false; `walg_enabled` does not prove a usable backup.

All 59 complete statement arrays exactly match the archived SQL. Fresh 57-file/59-entry comparator output is byte-identical to the archived audit: 46 matching files/ledger entries, 11 unmatched files, 13 unmatched ledger entries and two same-version/different-SQL pairs. Those pairs are `20261008214459` and `20261008215744`; repository guarded DO blocks differ from direct ledger constraint additions. Reapplication behaviour differs. No ledger history was repaired.

Prior dependency analysis and diagnostic reconstruction remain valid historical evidence, with the limits documented in `colzo-pilot-review/RECOVERY_AND_RECONCILIATION_20261024.md`. Full schema equivalence, extension replay, actual records/Auth/Storage restoration and independent recovery sign-off remain blocked.

No complete source export connection, authenticated Storage-byte read path, recoverable secret/configuration references or operator-controlled encryption recipient/private destination is configured for this run. The available SQL/metadata tools do not establish a private complete backup workflow. No Auth secrets, password hashes, tokens or customer records were exported into reports or GitHub. No source password reset or temporary export role was used.

An existing-machine local restore can avoid new hosted charges. Current official documentation describes a container runtime and an experimental native Linux/macOS runtime. This workspace has no established Supabase CLI/container/PostgreSQL service stack; no genuine source restore was attempted. Runtime preparation alone would not resolve source/key access. The existing private recovery procedure remains the required route: consistent full dump plus roles/ACLs, separately verified Storage bytes, essential configuration/secret references, encrypted private bundle and decryption check; restore with all outbound mail/webhooks/schedulers/providers blocked, then compare rows/checksums/files/catalogue/effective permissions and real Auth/MFA/recovery behaviour.

## Security findings

Eight RLS/no-policy information findings remain. All eight deny anon/authenticated direct SELECT and writes: incident controls, clients, projects, quotes, complaints, legacy pilot configuration and review outbox. No permissive policy is warranted simply to silence an advisory. Fresh focused queries returned no browser-executable public SECURITY DEFINER function and no public RLS-disabled table with browser CRUD grants. This is a narrow catalogue check, not complete API/Storage/GraphQL acceptance.

Leaked-password protection remains disabled. Official Supabase documentation states the feature needs Pro or above. No upgrade or shared Auth-setting change is authorised. Record the residual risk and review an approved no-cost security approach before release; do not represent this warning as fixed.

## Preview, browser and website limits

The latest inspected application Preview is READY at `35a0edaf`, not the integrated code or current PR #63 head: `https://business-89p8aur0u-buisness-ai1.vercel.app/`. Its login screen renders in the cloud browser. No authenticated account flow, MFA, password reset, real save or tenant journey was passed. No authentication bypass was used.

The site Preview at `8df7397` and older pilot-branch site Preview at `e83b6c5` are not integrated acceptance targets. No updated Preview was deployed. Browser mobile emulation and physical iPhone/Safari/PWA acceptance are outstanding; CSS/DOM regression checks do not replace them.

The live homepage/pilot interest pages render and explain that pilot onboarding is pending. The live homepage still has the Development-preview/deferred-reply wording corrected only on this isolated branch. The public Privacy Notice renders but still displays the missing operator-identity notice. The connected iubenda account returns `verified=false` and no sites. Legal pages exist independently of iubenda. See the legal proposals document; no claim of legal compliance is made.

## Marketing and recruitment observations

Page has seven followers. Video API: 24 October promo 46 views, four shares/one reaction from Page-feed inspection; 22 October Reel 176 views. Browser content library additionally showed 28 versus 138 viewers, zero follows and zero comments for those Reels; unequal ages and differing metrics prohibit a creative/conversion conclusion. Seven scheduled posts from 26 October through 1 November remain intact, with distinct actual scheduled timestamps.

The approved one-off Hartlepool Chat post is now publicly visible, including James's approved wording and promo Reel. Verified browser URL: `https://www.facebook.com/groups/510955662396144/?multi_permalinks=3553952911429722&hoisted_section_header_type=recently_seen`. The group description says no business adverts; preserve the one-off exception and do not repost. Page library also lists prior posts in Hartlepool Business Advertising, Tyneside Local Business and North East Small Businesses; this does not grant permission for additional posts.

Walkthrough candidate `2446010869258438` remains SELF/Only me, ready/publishing complete, 22.133 seconds. Direct browser permalink says content unavailable; it is not in the Page draft list. The saved approved `Colzo-Guided-Demo-Updated.mp4` is 76 seconds. Exact approved content was not established, so no visibility change/publication occurred and no new public walkthrough link exists.

Recent matching Gmail searches returned no messages after 22 October; Page conversations have latest updates on 9–11 October. These narrow results do not prove absence of all responses. Existing declined/unresponsive statuses are preserved. Warm shortlist and natural drafts prioritise James's uncle/second contact; neither was contacted.

## Decisions and next actions

| Area | Release decision | Required next step |
| --- | --- | --- |
| Engineering | BLOCKED | Actual recovery/reconciliation, operator integration and final-SHA authenticated acceptance |
| Database recovery | BLOCKED | Secure source/object/config export and encryption destination; genuine isolated restore/sign-off |
| Security acceptance | BLOCKED | Real Auth/MFA/recovery/two-tenant acceptance plus residual-risk review |
| Website | FAIL | Isolated copy fixes await approved release; operator identity and browser/mobile acceptance unresolved |
| Pilot accounts | BLOCKED | Operator integration and exact business/user approval after gates pass |
| Marketing | BLOCKED | Queue and existing promo/group checks pass; exact walkthrough publication unresolved |
| Public paid launch | BLOCKED | Pilot acceptance plus separately deferred paid features/billing/legal/release approval |

James must arrange secure Development export/Storage/config access and an encryption recipient/private destination without sending secrets in chat; confirm real operator identity and retention/support decisions; complete iubenda verification; later perform account-specific MFA and physical iPhone acceptance; select exact pilot businesses and approve invitations only after release gates pass. Confirm the exact approved walkthrough asset before any new publication.

Prepared documents: owner guide, pilot operations/checklist, warm outreach/demo drafts and legal correction proposals, all dated 25 October 2026. They are drafts, not activated workflows or legal commitments.

No shared Development records/schema/Auth settings, Production, older Pilot, DNS, payment settings or Page identity changed. No real account, invitation, cold outreach, group post, reschedule, paid API call, paid resource, merge or deployment was performed. External writes were limited to the isolated Git branch/objects and draft review evidence.

