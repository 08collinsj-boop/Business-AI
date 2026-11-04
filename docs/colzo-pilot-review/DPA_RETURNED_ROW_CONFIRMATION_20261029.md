# DPA returned-row confirmation — 29 October 2026

**Scope:** New source-level fail-closed safeguard on the existing draft PR #65, **undeployed**. This is synthetic acceptance of the server's result-validation logic, not proof any owner has signed the current DPA.

## Original RED bug evidence

`lib/legal-handler.js` read `business_legal_acceptances` with a server-derived `business_id`, fixed `dpa` key and version filter, but selected **only `accepted_at`** and treated any returned timestamp as a valid current DPA. The server's privileged database connection bypasses RLS, so the application must not rely exclusively on request query filters if a returned row is malformed or inconsistent.

Added `tests/colzo-dpa-response-tenant-verification.test.mjs` using fictional Auth users/businesses and intercepted fake database responses. Before the fix, **three required negative assertions failed**, observing `dpa_accepted:true` for (1) a foreign business, (2) an outdated document version, and (3) a non-DPA document key. Correctly scoped current DPA and missing-acceptance cases passed. This is a reproducible response-confirmation defect, **not** evidence that a live Supabase query actually returned another business's row.

## Small correction

- Request `business_id`, `document_key`, `document_version` and `accepted_at` in the existing read.
- Require exactly one object row for the exact server-derived business, `dpa` key and current document version, with a valid acceptance timestamp.
- Otherwise return the ordinary not-accepted state with null acceptance time, preventing false-positive owner readiness.
- Do **not** modify DPA text, add acceptance automatically, change legal identity, grants, account information, Auth, MFA or any existing record.

Source test commit: `b48a1cc456292857ca748a271011687906cc8e47`.
Source correction commit: `1bb76292dc9568ce88459b848b2d8499ad9a87ab`.

Both committed files were independently read back from GitHub and matched the tested local source.

## Executed focused verification

`node --test tests/colzo-dpa-response-tenant-verification.test.mjs tests/legal-compliance.test.mjs tests/batch2-hardening.test.mjs tests/batch1-ux.test.mjs`

**19 tests passed, zero failed**, including all five nested DPA checks and existing legal/owner experience assertions.

The broader regression/build/static verification is a **separate gate**; previous CI runs do not cover this new handler commit and must not be recycled as a pass at this head. A new complete test-only workflow run is required before claiming full CI readiness.

## Remaining separate mandatory acceptance

- The genuine QA owner has not independently completed private password recovery, the correct account sign-in, MFA/AAL2 or DPA acceptance through the normal user interface.
- Live issued-JWT two-business API controls, revocation/post-revoke denial and natural expiry remain unverified.
- Operator identity/support configuration remains incomplete without owner-only decisions; this handler's existing requirement for configured provider identity before DPA acceptance was preserved.
- Actual source/Auth/Storage backup and isolated restore remain unverified; Development lists zero backups and PITR disabled.
- This change is undeployed; protected Preview still runs the separately approved older immutable runtime.

**Release state:** fictional-data demonstration GO with historical evidence; secure real-business 14-day pilot NO-GO; Production launch NO-GO. No runtime deployment, merge, real customer operations, data deletion, grant, Auth modification, new cost or Production write.
