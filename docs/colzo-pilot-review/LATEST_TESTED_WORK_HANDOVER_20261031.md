# Colzo — latest verified code and Work handover, 31 October 2026

**Status: NO-GO for a genuine 14-day business pilot.** This document is evidence and an optional future protected-Preview deployment packet, **not deployment approval**. Do not merge PR #65, promote Production, change Supabase Auth/RLS/grants/fixtures, access private MFA secrets, export customer data, create paid infrastructure, enable paid providers/publishing, or activate a real business without the relevant separately scoped authorisation.

## Exact, immutable identifiers

| Purpose | Verified value |
| --- | --- |
| Repository | `08collinsj-boop/Business-AI` |
| Existing release PR | [#65](https://github.com/08collinsj-boop/Business-AI/pull/65), OPEN/DRAFT/UNMERGED |
| Working branch | `fix/colzo-pilot-release-gates-20261026` |
| **Latest cumulative tested code commit** | **`800043210e2ea8f0cd54084e57c99b9f388946e5`** |
| Exact GREEN workflow | [41250742687](https://github.com/08collinsj-boop/Business-AI/actions/runs/41250742687) — **1,554/1,554 tests, 17/17 native PG checks, build and static verification passed** |
| Existing installed Preview **code**, older than candidate | `f6a1d4a5eb474683d9cbb93b602c3fe637423ef5` |
| Existing approved immutable Preview | `dpl_2DaFUff2NKLP35xS32KXjPdnzLbX`, https://business-dgt8c4dmz-buisness-ai1.vercel.app/ |
| Vercel project / team | `prj_d5DuC65u4hSITFRC54ygswiMW9ST` / `team_rCWQ41TMWjGseuzS4IDTsbZ4` |
| Supabase authorised Development project | `mvwseobgkexzpmmkgcxe` — no other target |
| Preview-only deployment target, **if separately approved later** | `target=null`, pin exact `gitSource.sha`, SSO `all_except_custom_domains` unchanged |
| Cost / providers | £0 additional spend, no paid providers, no publishing/scheduling |

**Important:** This file is a documentation-only descendant of the exact tested code commit. Do **not** deploy the subsequent moving docs-only branch tip as though it had been the subject of exact-SHA CI evidence. The existing Preview is READY and SSO-protected; code fixes newer than `f6a1d4a5` are **not installed**.

## What has been completed (do not repeat gratuitously)

1. Previous Work ran legitimate original-owner MFA, live booking overlapping/adjacent confirmation and stale editor rejection with persisted winner, knowledge approval, manual Marketing edit/approval persistence, and previous owner customer/action/quote tests. At `f6a1d4a5` Preview, the physical Leads API versioned-save correction is installed but **current-runtime authenticated owner enquiry valid/stale save has not yet been completed**.
2. Lead GET tenant provenance and malformed upstream response defence at `c6f8f220`: synthetic RED [41248585267](https://github.com/08collinsj-boop/Business-AI/actions/runs/41248585267), GREEN [41248733811](https://github.com/08collinsj-boop/Business-AI/actions/runs/41248733811) (1,525 tests +17 PG).
3. Pilot feedback GET/POST/PATCH provenance and persisted write confirmation at `c5054cce`: synthetic RED [41249587819](https://github.com/08collinsj-boop/Business-AI/actions/runs/41249587819) 9 new failures as expected, GREEN [41249727184](https://github.com/08collinsj-boop/Business-AI/actions/runs/41249727184) (1,538 tests +17 PG).
4. Human-handover GET/PATCH provenance and persisted status/actor confirmation at `80004321`: 16 fictional tests in `tests/colzo-handover-tenant-confirmation.test.mjs`. [RED 41250580636](https://github.com/08collinsj-boop/Business-AI/actions/runs/41250580636): **1,543 pass, exactly 11 new expected failures**, 17 PG checks pass. [GREEN 41250742687](https://github.com/08collinsj-boop/Business-AI/actions/runs/41250742687): **1,554 pass, zero fail/skipped/cancelled; 17 native PG checks pass; build/static/secret checks pass (384 JS files)**. Only `lib/handover-handler.js` and the new test file changed in this stage; guarded to Colzo Development Preview, legacy/Production behaviour preserved. No migrations, Auth changes or private data used.

**Do not overclaim:** Those simulated contradictory service-role responses are defence-in-depth tests, **not evidence that live Supabase was leaking tenants**. A passing build is **not authenticated live acceptance**.

## Next execution order when browser/Work is available

1. **Already installed f6, no new deployment needed:** Legitimate original-owner private sign-in/MFA on the protected immutable Preview; run native enquiry notes/status valid save, two-tab stale 409 and winner persistence after reload, action save, booking conflict HTTP-level result if safely visible, Knowledge approval and manual-only Marketing draft save/review persistence. Avoid doing live changes outside existing fictional fixtures. No publishing/schedules/providers.
2. **Independent fictional QA access:** Existing QA identity holder privately finishes legitimate sign-in, MFA/AAL2, and current DPA acceptance. Do not access seed/QR/codes. Use its *own* legitimate session, never substitute a synthetic token or the original owner.
3. **True two-issued-session G3:** Prove cross-tenant read/write denial, role restrictions, retained-JWT replay after legitimate revocation, with redacted actual HTTP response evidence. No privileged permission shortcut or fabricated real session.
4. **Candidate deployment only after specific additional approval:** Consider exact `800043210e2ea8f0cd54084e57c99b9f388946e5` to the existing protected **Development Preview only** (no Production alias), after rechecking its exact workflow, Vercel project/team/SSO, original Production ID, and obtaining a separate owner authorisation naming that exact SHA. Independently read back READY, SHA, project, SSO, `target=null`, no provider/Production change. Keep current `f6` immutable deployment as rollback. Focus live smoke on lead read/save, feedback GET/POST/PATCH and handover GET/PATCH, plus legacy owner flows.
5. **Pilot G5:** Verify fictional tenant-scoped data return/export without cross-business data, accountable owner-support route and approved retention/deletion and request-verification terms. Explicitly disclose to the participating business that full disaster-recovery verification is unfinished, with no guaranteed RPO/RTO. The complete source database/Auth/Storage-byte backup and independent restore are a **PUBLIC LAUNCH gate, NOT a blocker of the controlled 14-day pilot**. Keep the recovery evidence as future-launch work; do not create paid resources, export sensitive data or imply a real backup exists.
6. **Lifecycle G4:** Preserve original grant expiries **10 November 18:08:54Z and 11 November 22:50:58Z** and existing 12 November scheduled natural-expiry acceptance. A disposable-fixture revoke needs *separate exact approval*. Natural expiry cannot be fast-forwarded to claim live proof.
7. **Operations G7:** Complete support/incident monitoring, correct DPA/Privacy operator and contact details, data return/deletion and retention plan with accountable owner; then separately approve one named real-business 14-day Starter-equivalent + manual Marketing pilot, never automatic paid conversion.

For precise previous evidence, use [latest human handover PR comment](https://github.com/08collinsj-boop/Business-AI/pull/65#issuecomment-6550332459) and [earlier deployment packet](https://github.com/08collinsj-boop/Business-AI/blob/7c191eda857dbd07a336719d2fae753343b4be5e/docs/colzo-pilot-review/PROTECTED_PREVIEW_PACKET_C5054CCE_20261031.md). Stop only at genuine private access/authorisation boundaries, but **do not declare GO before G1–G7 actual evidence is complete**.
