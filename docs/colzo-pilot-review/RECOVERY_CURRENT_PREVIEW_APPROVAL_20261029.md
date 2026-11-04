# Exact Development Auth correction — NOT APPLIED

Target: `mvwseobgkexzpmmkgcxe` / Business-AI-Dev only.
Read-only baseline independently retrieved 29 October 2026 from the active authorised connection.

Payload: [RECOVERY_CURRENT_PREVIEW_20261029.PROPOSED.json](RECOVERY_CURRENT_PREVIEW_20261029.PROPOSED.json).
UTF-8 SHA256: `09020ea9585b225b92abe03e4a27ed709c597b08852d2b04232bca3a01419e14`.

Only two fields:

- Change `site_url` from `https://business-cqef9gbgk-buisness-ai1.vercel.app/` to `https://business-ff79ht5as-buisness-ai1.vercel.app/`.
- Preserve all 12 existing redirect entries in their existing order, append exactly the new root and `/?auth=recovery`, yielding 14. No wildcard added.

Why: the deployed application constructs its recovery return URL from the current origin. Current new-origin recovery destination is not allowlisted. This configuration mismatch is observed; no actual reset failure was reproduced and no password/email flow was submitted here.

Effect/risk: affects the shared Development project's default Auth destination and allowed return destinations, including other Development users using the default. It neither changes their credentials nor weakens MFA/SSO. Business AI Production and Pilot projects are outside scope. Prior default remains allowlisted.

On separate explicit approval: freshly reread complete config, require the original two values still match this baseline, verify exact payload hash/target, submit only these two keys once, read back and compare all other config fields without printing secrets. Abort on drift; do not merge unknown redirects or edit other fields. If write outcome is unclear, read back before retrying. Verify a genuine recovery only with the actual account owner's private participation; preserve sessions unless the expected recovery flow itself changes them.

Rollback proposal: exact original two values are in `RECOVERY_REDEPLOY_20261029.PROPOSED.json`. Rollback is another shared Auth change and requires approval; do not apply automatically or discard concurrent edits. No redeployment is required for this server-side Auth change.

This packet requests neither real-business activation nor grant/revoke, role changes, account replacement, MFA changes, SSO changes or an email send.
