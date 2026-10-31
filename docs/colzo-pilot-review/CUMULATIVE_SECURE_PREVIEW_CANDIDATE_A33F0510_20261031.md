# COLZO — protected Preview cumulative security release packet — 31 October 2026

**NOT DEPLOYMENT AUTHORISATION. Real 14-day business pilot remains NO-GO.** This handover explicitly distinguishes tested but not deployed code from previously approved live Preview. No PR merge, Production change, Supabase Auth/RLS/SQL/grants, private secret, paid service, public domain alias, customer invitation or real-business pilot activation is authorised by this document.

## Exact current release identifiers (independently read back)

| Field | Value |
| --- | --- |
| Repository | `08collinsj-boop/Business-AI` |
| Existing PR | [#65](https://github.com/08collinsj-boop/Business-AI/pull/65) OPEN/DRAFT/UNMERGED |
| Branch | `fix/colzo-pilot-release-gates-20261026` |
| **Exact cumulative code candidate tested** | **`a33f051004b5a47c16677e8609dab3b8d64da322`** |
| Exact verification at candidate | [GitHub Actions 41251612323](https://github.com/08collinsj-boop/Business-AI/actions/runs/41251612323) **SUCCESS: 1,579/1,579 Node tests; 17/17 isolated native PostgreSQL; build/static/secret checks on 386 JS files** |
| Current approved immutable Preview deployment | `dpl_2DaFUff2NKLP35xS32KXjPdnzLbX` |
| **Currently deployed older code** | **`f6a1d4a5eb474683d9cbb93b602c3fe637423ef5`** |
| Current protected immutable Preview URL | https://business-dgt8c4dmz-buisness-ai1.vercel.app/ |
| Vercel project / team | `prj_d5DuC65u4hSITFRC54ygswiMW9ST` / `team_rCWQ41TMWjGseuzS4IDTsbZ4` |
| Protection / target | SSO `enabled=true`, `deploymentType=all_except_custom_domains`; current deployment target `null` (Preview only) |
| Approved sole Supabase Development project | `mvwseobgkexzpmmkgcxe` |
| Commercial boundary | £0 extra spend; no paid marketing generation, automatic publishing, paid voice or payment activation |

This document, when committed, is a **docs-only child of tested code**. Do not deploy its commit SHA, a moving branch ref or a PR alias instead of the exact code SHA above. Existing f6 Preview remains the rollback reference.

## New verified fixes after previous handover

**Value/ROI dashboard:** The service-role handler correctly filtered queries by tenant but previously did not return/check tenant IDs; deliberately contradictory upstream rows could distort per-business metrics, and successful null/object replies were treated as zero records. New `tests/colzo-value-dashboard-tenant-confirmation.test.mjs`, test-only commit `c7ce2c01d43b2840f0d87e6a22c30e3856029188`. [RED 41251171558](https://github.com/08collinsj-boop/Business-AI/actions/runs/41251171558): 1,556 pass, **13 expected new failures**. Fix `203c8a96db201728658956fb590d9babeedc1ef0`: Colzo Dev Preview queries add `business_id` and fail closed on missing/foreign/malformed rows before computing metrics; legacy/Production unchanged. [GREEN 41251307007](https://github.com/08collinsj-boop/Business-AI/actions/runs/41251307007): 1,569/1,569 tests, 17 native PG, build/static PASS.

**Team owner reads:** `GET /api/team` (shared dispatcher) filtered memberships/invitations by business but lacked returned-row provenance verification. New `tests/colzo-team-read-tenant-confirmation.test.mjs`, test-only commit `579651c6d206bb274be94923fff92523e6508634`. [RED 41251481802](https://github.com/08collinsj-boop/Business-AI/actions/runs/41251481802): 1,572 pass, **7 expected new failures**. Fix `a33f051004b5a47c16677e8609dab3b8d64da322`: Colzo Dev Preview queries return business IDs for both lists, verify every row's tenant and array shape, strip extra internal business ID before returning original team response. Legacy Production behavior unaffected; no invite or membership mutations. [GREEN 41251612323](https://github.com/08collinsj-boop/Business-AI/actions/runs/41251612323): 1,579/1,579 tests, 17 native PG, build/static/secret verification 386 JS files PASS, 0 failed/skipped/cancelled.

**Earlier tested but not deployed:** Lead GET tenant/malformed reply guard (`c6f8f220`), Feedback GET/POST/PATCH saved representation and tenant safeguards (`c5054cce`), human-handover GET/PATCH tenant/actor/status guard (`80004321`). New candidate `a33f0510` includes all three. All are synthetic fault-injection defense-in-depth; **not evidence of actual PostgREST leakage and not live signed-in acceptance**.

## Correct next execution

1. **On already deployed f6 Preview, no redeploy needed:** legitimate original-owner private sign-in/MFA; current-runtime native enquiry normal versioned save and stale two-tab 409, preserved winner after complete reload, direct Leads route, action save, Knowledge/manual Marketing persistence, booking HTTP-level conflict evidence where legitimately visible. Use existing fictional QA records only; do not submit customer data or publish Marketing.
2. Independently authenticate existing fictional QA account through its legitimate private MFA/AAL2 flow, record current DPA acceptance by that account-holder only. No session impersonation or inspecting OTP/QR/setup seed. Then real two-issued-session role, tenant, JWT replay and revocation acceptance, with redacted HTTP evidence. Synthetic isolation tests cannot replace this.
3. **Only with separate explicit exact-SHA approval** may a release operator deploy code `a33f051004b5a47c16677e8609dab3b8d64da322` to the **existing SSO-protected Development Preview only**: pin gitSource.sha, verify intended team/project/Dev Supabase, keep `target=null`, preserve SSO/aliases/paid provider restrictions and rollback f6, assert READY and exact SHA postflight and Production deployment untouched. Then run authenticated targeted smoke on lead read/write, feedback/handover, value dashboard, team member/invitation lists and core workflows. Never interpret CI tests as live proof.
4. G4 preserve original natural expiry fixtures 10 Nov 18:08:54Z and 11 Nov 22:50:58Z for existing 12 Nov check. Do not fast-forward or revoke original fixtures; a disposable fixture revoke still needs exact separate authorisation.
5. **Pilot G5:** Verify fictional tenant-scoped data-return/export, request authority checks, owner-approved retention/deletion terms, accountable support and disclosure of unverified disaster recovery. The **full real source database/Auth/Storage-byte backup and isolated restore is a PUBLIC-LAUNCH gate, not a controlled 14-day pilot GO blocker**, as the original 26 October addendum and 31 October owner clarification state. Do not promise recovery guarantees, bypass network grants, disclose secrets or create paid resources.
6. G7 verify monitored contact/support coverage, incident response, user notice/DPA terms, data-return/deletion and retention operational signoff; activate a single named 14-day free Starter-equivalent core + manual Marketing workspace **only under separate approval** and after all gates pass. No automatic paid conversion.

Fresh read-only Supabase Dev advisors at packet creation: six RLS-enabled/no-policy INFO notices on restricted tables, and one WARN 'Leaked Password Protection Disabled'. Neither is proof of an active exploit; do not add broad policies or purchase a paid upgrade without specific review.

Evidence in [PR #65](https://github.com/08collinsj-boop/Business-AI/pull/65#issuecomment-6550457955). **Release remains NO-GO**.
