# User-level legal acceptance identity confirmation — 29 October 2026

**Scope:** draft Colzo PR #65; synthetic test of Legal Centre server response validation. No actual account, legal acceptance or customer data was accessed or changed. Application correction is **undeployed**.

## Reproduced before the fix

`lib/legal-handler.js` used the server role for GET and POST-preflight queries to `user_legal_acceptances`. It filtered the query by the authenticated user ID but omitted `user_id` from the returned fields, then trusted every returned document/version row.

Synthetic fixture regression `tests/colzo-user-legal-acceptance-tenant-verification.test.mjs` deliberately returned three otherwise current terms/privacy/acceptable-use acceptance rows belonging to a different fictional Auth user. **Two negative expectations failed** against the pre-fix code:

1. Foreign-user records were wrongly reported as meeting the current user's legal acceptance requirements.
2. The `accept_user` action wrongly skipped creating the signed-in user's three documents because returned foreign records appeared to match the same document versions.

The correctly matching current-user acceptance case passed. These are **inconsistent-response simulations**; no claim is made that the real Supabase API returned foreign records.

## Minimal correction

- Include `user_id` in both authenticated user acceptance reads.
- Ignore records whose returned `user_id` differs from the Auth-verified user when constructing the accepted-document state.
- Only treat existing rows as duplicates when the returned user ID matches before deciding whether a current-user `accept_user` write is needed.
- Preserve the fixed document/version allowlist and existing owner DPA checks.
- No change to legal text, acceptance versions, database migrations, Auth, real user consent, account state or provider configuration.

Regression test commit `337b780235f6dd87fec5cc1a88ec5102d589e21d`; correction commit `298413cdbd8a9c42f934a453fd3783d794db5f2f`. Both exact files were fetched back from GitHub and matched the tested source.

## Verification scope

The first GREEN attempt identified a mistake in the **test harness**, which incorrectly required a user-filter query parameter on a legitimate POST INSERT. The harness was corrected so that this assertion applies only to GET, and the tests were rerun. This adjustment did not weaken the foreign-user assertions.

Focused command:

`node --test tests/colzo-user-legal-acceptance-tenant-verification.test.mjs tests/colzo-dpa-response-tenant-verification.test.mjs tests/legal-compliance.test.mjs tests/batch1-ux.test.mjs tests/batch2-hardening.test.mjs`

Final focused result **23 passed, zero failed**, including all current-user and foreign-user cases, DPA status, and existing legal UI contract checks.

**Full CI on this new code head remains a separate required gate**; earlier 1449-pass workflow on `1e40a699` did not include the new fix. Verify the current head through the existing test-only Pilot Verification workflow and record its result before any release claim.

## Release boundary

No new deployment, merge, legal acceptance on behalf of anyone, shared Development change, Supabase Auth configuration change, grant/revocation, record deletion, provider enablement, charge or Production change.

Fictional-data demonstration retains historical GO. Secure real-business 14-day pilot remains **NO-GO** pending legitimate QA owner private sign-in/MFA/DPA consent, actual issued-JWT two-tenant API negative tests, approved revoke, natural expiry, complete backup/restore, operator and lifecycle decisions. The new code has not been deployed.
