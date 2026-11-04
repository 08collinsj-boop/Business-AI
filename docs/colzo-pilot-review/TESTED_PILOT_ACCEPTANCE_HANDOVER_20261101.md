# Colzo — 1 November 2026 pilot code acceptance handover

**14-day real-business pilot: NO-GO until genuine signed-in acceptance and owner/operator signoff.** This is a **documentation-only release packet**, not deployment, privileged database write, invitation, customer-data export, paid-provider activity or production authorisation. The original 26 October addendum and 31 October clarification reserve full backup-and-restore certification for **public launch**, not the limited pilot.

## Exact current verified release identifiers

| Item | Verified value |
| --- | --- |
| GitHub repository | `08collinsj-boop/Business-AI` |
| Existing PR and branch | [#65](https://github.com/08collinsj-boop/Business-AI/pull/65), `fix/colzo-pilot-release-gates-20261026`, OPEN / DRAFT / UNMERGED |
| **Newest exact cumulative runtime-tested code** | **`b46f668426de386f3444639da6f6cc8036f81f2a`** |
| Exact successful workflow | [41300511060](https://github.com/08collinsj-boop/Business-AI/actions/runs/41300511060) — **1,598/1,598 Node PASS, 17/17 isolated native PostgreSQL checks PASS, full build/static/secret checks 387 JS files PASS, zero failed/skipped/cancelled** |
| Currently deployed older code | `f6a1d4a5eb474683d9cbb93b602c3fe637423ef5` |
| Current immutable protected Preview | `dpl_2DaFUff2NKLP35xS32KXjPdnzLbX`, https://business-dgt8c4dmz-buisness-ai1.vercel.app/ |
| Preview project and team | `prj_d5DuC65u4hSITFRC54ygswiMW9ST`; `team_rCWQ41TMWjGseuzS4IDTsbZ4` |
| Current Vercel protection | SSO enabled `all_except_custom_domains`; deployment `target=null` (Preview) |
| Only approved Development Supabase | `mvwseobgkexzpmmkgcxe` |
| Commercial boundary | £0 new spending; no paid providers, public publishing, charges or real-business activation |

**Do not deploy the docs-only PR tip, moving branch, or this document commit as though it were the exact tested runtime.** Any **new** deployment requires separate explicit owner approval naming exact code SHA `b46f668426de386f3444639da6f6cc8036f81f2a`, protected Preview only, pinned `gitSource.sha`, unchanged SSO/provider restrictions, `target=null`, unchanged Production, and exact SHA/state readback. Keep the currently approved f6 immutable origin as rollback.

## Verified Nov 1 customer-portal bugfix — code-only, not installed

Read the existing `lib/customer-portal-handler.js` and `tests/colzo-customer-portal-tenant-joins.test.mjs`. Although existing PostgREST service-role queries filtered `customer_profiles` by the authenticated user and `customer_enquiry_access` by customer ID and checked some cross-business joins, it did not verify that the **returned** profile belonged to the user, did not verify the returned access-link's `customer_user_id`, and used a POST optimistic display-name fallback without confirming persisted identity/name. Deliberately contradictory synthetic responses could therefore leak another customer's profile name, expose a wrongly attributed access grant, or report a profile update that was not saved. **No real Supabase cross-user leak was observed or claimed.**

- Added 19 synthetic tests in `tests/colzo-customer-portal-identity-save-confirmation.test.mjs` as test-only commit `998105790085d52b42d015a5b015b85d96a42b66`: own/empty controls, foreign/missing/malformed profile, foreign/missing/malformed/invalid access grant, normal POST and empty/foreign/missing/wrong-name/multiple/malformed saved replies, legacy Production behavior.
- Exact [RED workflow 41300326326](https://github.com/08collinsj-boop/Business-AI/actions/runs/41300326326): **1,582 PASS / 16 expected new FAIL**; 17 native isolated PG checks passed. Original existing tests remained passing.
- Minimal code correction **`b46f668426de386f3444639da6f6cc8036f81f2a`** modifies only `lib/customer-portal-handler.js` and uses existing Colzo Development Preview guard `isColzoRecordVersionEnabled()`: profile GET/insert/race read verifies returned `user_id`; customer access query includes/verifies `customer_user_id` and valid lead ID **before linked private enquiries are queried**; profile POST requires exactly one persisted same-user row with exactly requested trimmed display name before acknowledging success. Successful normal own/empty results preserved; no customer payload logged or new permission created. Legacy Production behavior unchanged.
- Exact [GREEN workflow 41300511060](https://github.com/08collinsj-boop/Business-AI/actions/runs/41300511060) independently inspected: **1,598 PASS, 0 fail/skipped/cancelled; 17 native PG booking checks; build/static/secret verification 387 JS files PASS**. Independently re-fetched handler blob `6e59b3ee3878c3fed8ddec867de76f29c249a78f` and confirmed new read and saved-state guards. These are synthetic mock-response tests, not live OAuth/JWT acceptance.

Earlier cumulative fixes, also **NOT DEPLOYED**: Leads GET, Feedback GET/POST/PATCH, Human Handover GET/PATCH, Value Dashboard GET, Team owner member/invitation GET. Prior exact test records in [Oct 31 cumulative packet](CUMULATIVE_SECURE_PREVIEW_CANDIDATE_A33F0510_20261031.md).

## Remaining steps to PILOT GO, in order

1. **Existing approved deployed f6 — no deploy needed first:** legitimate original owner private sign-in/MFA; test ordinary versioned enquiry save and stale two-tab refusal with full reload/persisted winner, bookings conflict, Knowledge approval, manual Marketing draft persistence, Security Centre, legal DPA pages and protected routes. Do not use agent-shared MFA secrets, impersonated QA or real records. Correct evidence needed from actual browser/API responses.
2. **Independent fictional QA identity:** have legitimate QA account-holder complete its own private MFA/AAL2 and current DPA consent; verify business membership and account isolation without access to password, factors or session tokens. This cannot be inferred from original owner's MFA.
3. **G3 actual two-business session isolation and role denial:** with independently issued authentic sessions, demonstrate own vs foreign customer/enquiry/booking/action/quote API reads/writes, anonymous denial, owner/member/AAL1-vs-AAL2, and **retained JWT replay after separately approved targeted revocation**. Previous synthetic tests are not live acceptance. Do not grant extra Auth privileges automatically.
4. **Only if separately approved:** deploy exact candidate `b46f668426de386f3444639da6f6cc8036f81f2a` to **Development protected Preview only**; read back exact code SHA and SSO; verify lead save/read, feedback, handovers, value dashboard, team access and new customer portal profile/access, plus original core workflows through a legitimate browser. No Production merge or alias, no card/provider/publishing.
5. **G4:** preserve original natural expiration instants **10 Nov 18:08:54Z and 11 Nov 22:50:58Z**, with the existing **12 Nov** acceptance task. Do not shorten fixture expiry or prematurely revoke the original test fixture. Any separate disposable targeted revoke requires its own exact approval; no SQL writes without it.
6. **Pilot G5 (NOT public full restore):** preserve previously executed [fictional 50-category tenant export rehearsal](EXPANDED_QA_TENANT_EXPORT_ACCEPTANCE_20261029.md) as evidence of restricted data-return tools, including 44 data and six count-only categories, 12 negative serializer and 7 spreadsheet formula tests. Do not repeat just for a new pass count. Still obtain operator signoff on business-verified data-return request/delivery, monitored support, retention/deletion policy and transparent disclosure that **full disaster recovery is unverified** (no RPO/RTO promises). Full source DB/Auth/Storage-byte backup and independent restore are **PUBLIC-LAUNCH only**.
7. **G7:** confirm real operator identity and approved contact details/legal text, DPA/consent and support monitoring, permitted features (no publishing/paid features), 14-day grant/expiry, and named business-owner consent; obtain separate explicit real-business activation/invitation approval after technical gate acceptance. No automatic payment conversion.

**NO-GO still applies because live authenticated/operational gates are unverified, not because full backup is deferred.** The existing Preview and Production were not modified during this engineering work.
