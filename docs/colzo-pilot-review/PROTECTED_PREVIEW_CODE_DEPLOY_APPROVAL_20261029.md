# Proposed protected-Preview deployment — exact approval packet

**Prepared 29 October 2026. Proposal only; NOT authorised to deploy by this document.** Secure 14-day real-business pilot remains NO-GO.

## Exact target

- **Proposed runtime commit (immutable):** `547c1903ecd6fd37e1fadf2a48655af2a3aa676c` on `fix/colzo-pilot-release-gates-20261026`.
- **Full verified CI on that exact commit:** [Pilot Verification 40955618353](https://github.com/08collinsj-boop/Business-AI/actions/runs/40955618353) — `npm run verify`, **1453 tests passed, zero failures/skips**, bundle built, 368 JS files static/secret checked; completed successful.
- **Target Vercel project:** `prj_d5DuC65u4hSITFRC54ygswiMW9ST` (`business-ai`) to **protected Preview only**, backed by **Business-AI-Dev** Supabase `mvwseobgkexzpmmkgcxe`.
- **Currently approved READY deployment:** `dpl_WFU7RH8EJWTX28Ej3zUVSEtrXgo4`, immutable URL `https://business-cqef9gbgk-buisness-ai1.vercel.app/`, runtime `adecce31b88f5c1ffd623480524996cb5ae91581`.

## Verified source delta

The GitHub comparison `adecce31...547c1903` is **ahead by 49 commits**, with **43 changed files**: only **three application runtime sources**, all under `lib/`:
1. `lib/data-lifecycle-handler.js`: tenant/persisted-value confirmation for retention-policy reads and saves; no misleading success/audit.
2. `lib/data-subjects-handler.js`: tenant and lead validation of returned service-role export rows, safe lead ID validation, block non-atomic automated erasure in scoped pilot only.
3. `lib/legal-handler.js`: tenant/document/version confirmation for DPA; Auth-user identity confirmation for terms, privacy and acceptable-use reads/duplicate detection.

All other changes between those exact commits are tests and `docs/colzo-pilot-review/` acceptance/evidence/query files. **No SQL migration file, billing, Auth implementation, frontend layout, SSO or provider integration code changed in this comparison.** Only the contents at the exact commit should be deployed; not a moving branch ref.

## Separate precise approval sought — not granted

> I approve deploying exactly commit 547c1903ecd6fd37e1fadf2a48655af2a3aa676c to the existing protected Colzo Preview environment only, retaining Business-AI-Dev as the database, all existing SSO/MFA/deployment protection, disabled paid providers and disabled LIVE billing, without changing Production, aliases outside this protected Preview, accounts, grants, data, invitations or pilot activation.

Approval for any different SHA, environment or operation must be sought separately. This packet does not give blanket approval to change Auth identity, permissions, backup plans or live pilot records.

## Required preflight at execution

- Check repository current state, exact commit object and working tree; ensure no unexpected code/config drift.
- Read current Vercel Preview environment variable **names / nonsecret flags only** using authorised tools; do not print values or tokens.
- Ensure target is the Development Supabase URL/project, branch-specific Preview and deployment protection/SSO active.
- Confirm paid AI providers, paid integrations, Stripe LIVE, Meta publishing and new trials remain disabled.
- Confirm no migration is pending as part of the deployment; do not run privileged SQL.
- Refuse deployment if any condition cannot be verified or exact commitment cannot be pinned.

## Risks, rollback and verification

- **Risks:** Although scoped and CI-tested, this code changes user-visible responses for legal acceptances, retention saves and lead data exports; the blocked scoped DELETE is intentional and should surface an honest unavailable response. CI does not replace real authenticated browser/API checks.
- **Rollback:** Existing previously READY immutable Preview runtime `adecce31...` / deployment `dpl_WFU7RH8EJWTX28Ej3zUVSEtrXgo4` is a reference point. Revert only through an separately authorised exact Vercel Preview rollback/redeploy mechanism; do not silently change Production or other environment aliases. Database migration rollback should not be necessary because no migrations changed.
- **Post-deploy verification:** Capture new deployment ID, URL and commit readback. Confirm protected access remains enforced. Perform safe read-only anonymous protected-route denials and owner UI/GET paths where legitimate existing sessions permit; explicitly track missing QA MFA/AAL2 and DPA, foreign-ID issued-JWT tests, revoke/expiry, source restore. Do not claim pilot GO or activate businesses.

## Why the deployment matters

The code fixes are currently **not** part of the protected Preview runtime. Releasing them to Preview (with separate approval) is required before these specific corrections can be independently checked end-to-end on a deployed Colzo build. It is not permission to bypass the remaining live security, recoverability, operator or privacy gates.

**Owner action when ready:** approve exactly the quoted protected-Preview deployment operation, or decline. Do not ask for credentials, MFA codes or tokens in the chat.
