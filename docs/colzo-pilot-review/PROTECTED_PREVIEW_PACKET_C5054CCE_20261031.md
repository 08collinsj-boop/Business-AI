# Colzo protected Preview update packet — prepared 31 October 2026

**REVIEW-ONLY; NOT A DEPLOYMENT APPROVAL.** Real-business pilot remains NO-GO. Do not deploy, merge, promote, issue a public share-link, alter SSO/environment/Auth/RLS/grants, export live data, invite a business or enable billing/paid providers without the separately required authorisation.

## Immutable code and current safe runtime

| Property | Pinned value |
| --- | --- |
| Repository | `08collinsj-boop/Business-AI` |
| Existing draft PR | [#65](https://github.com/08collinsj-boop/Business-AI/pull/65) — keep OPEN, DRAFT, UNMERGED |
| Existing working branch | `fix/colzo-pilot-release-gates-20261026` |
| Candidate runtime **exact Git commit** | `c5054ccefdf909a7528f16f6895ff6cea6684612` |
| Tested GitHub workflow | [41249727184](https://github.com/08collinsj-boop/Business-AI/actions/runs/41249727184) — completed SUCCESS at exact candidate |
| Existing approved protected Preview runtime | `f6a1d4a5eb474683d9cbb93b602c3fe637423ef5` |
| Current Preview deployment ID | `dpl_2DaFUff2NKLP35xS32KXjPdnzLbX` |
| Current Preview immutable URL | https://business-dgt8c4dmz-buisness-ai1.vercel.app/ |
| Vercel team | `team_rCWQ41TMWjGseuzS4IDTsbZ4` |
| Vercel project | `prj_d5DuC65u4hSITFRC54ygswiMW9ST` |
| Only authorised Supabase target | Development project `mvwseobgkexzpmmkgcxe` |
| Project SSO baseline | enabled; `all_except_custom_domains`; preserve exactly |
| Deployment target if later explicitly approved | Existing protected **Preview** only, `target=null`, never Production |
| Cost and provider constraint | £0 additional spend, existing resources only, billing/paid marketing/public publishing/voice disabled |

**Never deploy a moving PR head.** This document is a later docs-only child of the exact tested code commit if committed on this branch; use the SHA above rather than the eventual document commit SHA.

## Exact tested new code and justification

Previous approved Preview `f6a1d4a5` already includes the direct native enquiry versioned-save fix, action save confirmation and tenant-read safeguards. After that approval:

1. `c6f8f220bfa5e16a97e36dbcd246034ced6d3fbc`: `lib/colzo-leads-handler.js` rejects foreign/missing-business and malformed/non-array successful service-role read representations in Colzo Development Preview. [GREEN CI 41248733811](https://github.com/08collinsj-boop/Business-AI/actions/runs/41248733811) passed 1,525 Node tests and 17 native PG checks.
2. `26207bfd301ae3a661fca742341be1827999d694`: test-only `tests/colzo-feedback-tenant-save-confirmation.test.mjs` reproduced nine contradictory feedback API read and mutation responses ([RED CI 41249587819](https://github.com/08collinsj-boop/Business-AI/actions/runs/41249587819): 1,529 pass, 9 expected fail; 17 native PG checks passed).
3. `c5054ccefdf909a7528f16f6895ff6cea6684612`: `lib/feedback-handler.js` on Colzo Development Preview validates returned feedback business provenance, response shape, submitted create representation before success audit, and exact PATCH status/business/record. No automatic retry if the write may already have committed; no private data in errors. Production/legacy feedback behavior remains unchanged. [Exact GREEN CI 41249727184](https://github.com/08collinsj-boop/Business-AI/actions/runs/41249727184): **1,538/1,538 tests passed, zero fail/skipped/cancelled, 17/17 isolated native PostgreSQL checks passed, React build plus local/static secret checks passed on 383 JS files.** Source blob SHA `15684a9ee852a215be708986f208612a8e70047e`.

No migration, database, Supabase Auth, SSO or project setting change is included. Synthetic upstream-fault regressions do **not** prove actual tenant leakage or live signed-JWT isolation. Candidate is not yet deployed; old runtime remains the rollback candidate.

## Suggested order once Work/browser becomes available

**Step A — before installing more code:** In already approved `f6a1d4a5` protected immutable Preview, use legitimate private owner login and current MFA to finish authenticated normal + stale enquiry-save acceptance. Capture actual 200/409 when supported, winner persistence after full reload, action save, overlapping/adjacent bookings, Knowledge approval and manual Marketing draft persistence; no scheduling/publishing/provider calls. Do not redo successful isolated tests. If owner access cannot be legitimately restored, mark blocked.

**Step B — separately approve and install only if appropriate:** Before any deployment, re-read PR head, this exact candidate and its CI, inspect the original project/protection/Production IDs, and obtain the owner's explicit approval for *exact* `c5054cce` **protected Development Preview only**. Use exact `gitSource.sha` and branch on the existing Vercel project with target Preview. Do not change environment/configuration, alias Production, SSO protection or login redirects, or create a paid resource. Read back deployment ID, commit SHA, intended project, READY, `target=null`, SSO unchanged and Production deployment ID unchanged. Retain old `f6a1d4a5` immutable URL.

**Step C — focused new-runtime acceptance:** Under legitimate issued owner session on new immutable origin, check own enquiry and feedback GET, normal feedback POST/PATCH, readback after reload, atomic stale-vs-valid enquiry updates, action save, Booking, Knowledge and manual-only Marketing, and missing-auth denial. Record network HTTP status when truly observable. **Do not claim the contrived upstream-malformed cases occurred live.**

**Step D — independent account/security/recovery:** Fictional QA identity must independently complete private MFA/AAL2 and current DPA through legitimate UI; original owner consent is not a substitute. Only then test two issued sessions, tenant/role/missing-session/retained-JWT replay; preserve original 10/11 November expiry fixtures and existing 12 November natural-expiry task. A genuine private source DB/Auth/Storage-byte backup and **isolated restore** still require exact owner-approved scope, protected destination and zero-cost environment. Review monitored support, privacy incidents, data return/deletion, legal commitments and post-trial handling before separately approving one named business invitation.

## Approval boundaries / explicit next decision

No deployment is requested by this document itself. A later owner decision must be specific to this SHA and protected Development Preview, not generic authorisation to continue. Real-business pilot must remain **NO-GO** until G1–G7 genuine acceptance and separate named-business activation authority are recorded.

[Full sanitised findings on PR #65](https://github.com/08collinsj-boop/Business-AI/pull/65#issuecomment-6550189912).
