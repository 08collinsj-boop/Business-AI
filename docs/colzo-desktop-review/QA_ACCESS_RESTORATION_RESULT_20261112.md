# PR76 fictional QA restoration — 12 November 2026

The owner replied **“authorised”** after the explicit blocker that live visual QA required authorised fictional workspace access. Scope: existing Development project `mvwseobgkexzpmmkgcxe`, existing `QA Example Garden B — TEST ONLY`, temporary QA only. PR76 remains draft/unmerged. No Production, schema, billing, user, membership or role changes.

## Applied and verified

Executed `QA_ACCESS_RENEW_20261112.sql` atomically after checking the exact expired baseline, fictional workspace name, sole owner and absence of paid history. One grant row updated; one append-only `qa_access_restored` audit event added with the complete original row and replacement row. Original grant/audit history was not deleted. The application's exact-336-hour constraint was retained.

- QA business: `433f135d-720f-4687-8114-3dffe7361675`.
- Activated: `2026-11-12T00:42:57.803859Z`.
- Expires: `2026-11-26T00:42:57.803859Z`.
- Original expired window preserved in audit: `2026-10-28T22:50:58.480174Z` to `2026-11-11T22:50:58.480174Z`.
- Mutation execution: `log_wd4rh2-qCT-e`; independent readback: `log_-3LW7jVVDWpF` confirmed active, unexpired and exactly one restoration audit record.
- Restore the original expired QA row after testing using `QA_ACCESS_RESTORE_ORIGINAL_20261112.sql`. It fails closed if the renewed row has changed. It adds its own cleanup audit record. No cleanup is claimed yet.
- The unrelated Colzo demonstration grant was not modified.

## Browser continuation

The branch rebuild required refreshed authorised Vercel access. Composio's `vercel_mcp` route had no active connection; the already-authorised dedicated Vercel connection supplied temporary access. Deployment protection was not disabled. Do not record the temporary share token in evidence.

The existing browser account still showed the unrelated expired grant, so the actual Colzo login form was used for the restored QA identity through the secure browser authentication form. The user-submitted attempt returned **“Unable to sign in with those details.”** No credential values were returned or recorded. Do not infer a reset-link, MFA or grant failure from this message.

Current blocker: successful QA sign-in. MFA, the native desktop workspace, rendered reference comparison and corrections remain outstanding. No reset, MFA bypass, access-control code change or fabricated authenticated screenshot was performed. Browser is being handed back for direct credential correction. Once sign-in succeeds, continue the requested visual and regression work, restore the original QA grant, and remove the temporary privileged Preview configuration and retire privileged deployments as documented in `PREVIEW_QA_ACCESS_2026-11-12.md`.

The most recent completed application regression run at the unchanged application baseline passed 1726/1726 tests; build, validation of 422 JavaScript files and diff checks passed. This follow-up changes documentation/operational SQL only and does not claim a new rendered acceptance result.
