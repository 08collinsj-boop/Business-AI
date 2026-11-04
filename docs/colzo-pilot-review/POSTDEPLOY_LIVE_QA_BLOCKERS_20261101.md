# Colzo — 1 November live protected Preview acceptance checkpoint

**Status: Preview READY; actual signed-in pilot acceptance INCOMPLETE; real-business pilot NO-GO.** This is read-only postdeployment evidence, not new deployment, signed-in account acceptance, operator consent or an invitation. Full DB/Auth/Storage backup-and-restore remains a PUBLIC-LAUNCH requirement, not a controlled 14-day pilot blocker.

## Exact verified runtime

- **Deployed immutable Preview:** `dpl_2RhfdShRXxLgFxoPxMgK61rhyADM`; https://business-ltgfd32zi-buisness-ai1.vercel.app/
- **Exact deployed code:** `b46f668426de386f3444639da6f6cc8036f81f2a` (confirmed by Vercel readback), **not** a later docs-only branch tip.
- Vercel project `prj_d5DuC65u4hSITFRC54ygswiMW9ST`, team `team_rCWQ41TMWjGseuzS4IDTsbZ4`, `target=null`, state `READY`.
- Project SSO protection `enabled=true`, deployment protection `all_except_custom_domains`; Dev branch env check **PASS**: expected Development Supabase URL/ref, TENANCY_AUTH_ENABLED and FRONTEND_AUTH_ENABLED true, COLZO_SCOPED_PILOT_ACCESS true; billing and autopublishing disabled, broad Starter Marketing flag disabled, provider/scheduler keys empty. These were compared as booleans only; no secrets printed.
- **Production remains on previous immutable version** per preflight. PR #65 OPEN/DRAFT/UNMERGED.
- [Exact code CI 41300511060](https://github.com/08collinsj-boop/Business-AI/actions/runs/41300511060): **1,598/1,598 tests PASS, 17/17 isolated PostgreSQL checks, build/static checks PASS**. CI is synthetic, not live API acceptance.
- Vercel runtime error log request failed due to logs API error; a narrower aggregation returned no rows. **Do not claim error-free application operation from an empty log result.**

## Read-only independent QA identity preflight, Development PostgreSQL

One explicit `BEGIN READ ONLY` / `ROLLBACK` query selected only counts and a boolean timestamp match for the **pre-existing approved fictional QA user and QA business**. No tokens, credentials, email, secrets, session IDs, customer data or OTP factors were selected.

| Check | Result |
| --- | --- |
| Existing fictional QA Auth user | 1 |
| Matching QA business membership | 1 |
| Matching active scoped pilot grant | 1 |
| Verified QA MFA factor count | **0** |
| QA session count | **0** |
| QA AAL2 session count | **0** |
| QA business DPA acceptance count | **0** |
| QA user DPA acceptance count | **0** |
| Original QA grant expiry `2026-11-11 22:50:58.480174 UTC` unchanged | **true** |
| Overall active scoped pilot grants | 2 |

**Independent QA sign-in/MFA/AAL2 and current DPA acceptance are BLOCKED by legitimate QA account-holder private authentication**, not completed. A historical original-owner MFA result does not satisfy independent QA acceptance. No credential recovery or enrollment was attempted on the user's behalf.

## Legal service identity preflight

Read the exact deployed candidate's `lib/legal-public-handler.js` source and compared branch-specific Preview environment variable presence/boolean values without disclosing the address, names, phone or secret contents.

- Legal operator name, trading name, operator type, address, contact email and phone are populated as configuration keys.
- `LEGAL_OPERATOR_ADDRESS_PUBLIC_CONFIRMED` is **not `true`**. The handler therefore suppresses the address and computes `legal.identity_configured=false` under the currently observed configuration.
- This requires explicit owner approval of what address may legally be published. **Do not flip public confirmation, print or disclose the current address, or claim operator legal readiness without that approval.** Monitored support delivery and participant data-return/retention agreement also still need actual evidence.

## Authenticated browser/runtime availability

- Attempted to inspect connected Opera Browser. The connector explicitly reported **browser not connected** and indicated the owner must enable 'Allow AI connection' and sign into Opera. No authenticated browser, original-owner session or independently QA-issued token was available to this execution context.
- A web fetch attempt to the new protected Preview was inaccessible; terminal HTTPS request failed DNS resolution. This does **not** disprove Vercel's authoritative READY state and does not count as a successful protected-page HTTP test.
- **Not run:** original-owner actual Preview enquiry normal save/reload and stale two-tab 409, customer portal profile update and access readback, new team/value/feedback/handover HTTP smoke, two-business actual issued-session tenant/role denials, token replay after revocation, end-of-grant actual enforcement.
- **Preserve** original 10 and 11 November natural-expiry fixtures for existing 12 November scheduled acceptance. No grant revoke, expiry edit or privileged SQL is authorised as a shortcut.

## Smallest next acceptance execution sequence

1. **Private user action:** Connect a capable authenticated browser with approval for the AI connector. The current connected Opera browser is unavailable. First log into immutable SSO-protected Preview using the legitimate original owner, complete private MFA outside the agent's view, then allow read/authorized in-app test steps on existing fictional records only. Do not paste passwords, tokens or OTPs in chat.
2. On current **already deployed b46f** Preview test versioned enquiry valid and stale updates, persistence after reload, customer profile name save and no false-success, lead/feedback/handover/team/value non-destructive API reads, Knowledge approval and manual-only Marketing drafts, current legal pages, session sign-out.
3. **Separately** the existing QA account-holder privately signs in, enrolls/verifies MFA/AAL2 and accepts the current DPA through the legitimate application UI. Read-only count checks may subsequently confirm state.
4. Then conduct **real issued-session** owner vs QA tenant isolation/roles, anonymous rejection, approved revocation/replay as applicable, and observe genuine natural grant expiry at the existing November timestamps. Do not mistake mock JWT tests for genuine replay acceptance.
5. Confirm exact legal operator identity/approved public service address, monitored support route, controlled tenant return and retention/deletion agreement and transparent full-recovery limitation. Full backup/restore is **for public launch**, not pilot.
6. Finally obtain separate authorization for **one named real-business pilot owner and 336-hour free activation**. Verify its access path given Preview SSO remains protected; do not bypass protection, charge, publicly publish or merge the PR.

**Current decision:** Code deployed and build verified; QA and owner live workflows NOT RUN; full pilot GO has NOT been reached. No Production, invoice, grant, Auth, RLS, user record, real customer or SSO changes in this checkpoint. £0 extra spending.
