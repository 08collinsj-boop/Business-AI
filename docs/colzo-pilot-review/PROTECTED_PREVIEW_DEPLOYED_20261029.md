# Protected Colzo Preview — exact approved deployment and verification, 29 October 2026

**Completed authorised action:** the user explicitly approved deploying `547c1903ecd6fd37e1fadf2a48655af2a3aa676c` to the existing **protected Development Preview only**. This was a scoped deployment approval, not approval for Production, real-business activation, privileged SQL, Auth changes or live grant/revoke.

## Immutable deployed runtime

| Field | Verified |
| --- | --- |
| Vercel team | `team_rCWQ41TMWjGseuzS4IDTsbZ4` (`buisness-ai1`, Hobby plan) |
| Vercel project | `prj_d5DuC65u4hSITFRC54ygswiMW9ST` (`business-ai`) |
| New deployment | `dpl_CSB9HYBCGvrtJXX9xSiYcGia93GU` |
| New deployment URL | `https://business-ff79ht5as-buisness-ai1.vercel.app/` |
| New Preview branch alias | `https://business-ai-git-fix-colzo-pilot-release-gat-63d24f-buisness-ai1.vercel.app/` |
| Target | `null` on the Vercel deployment, i.e. **Preview**; no production target |
| Readback runtime commit | `547c1903ecd6fd37e1fadf2a48655af2a3aa676c` |
| Git origin/branch | `08collinsj-boop/Business-AI`, `fix/colzo-pilot-release-gates-20261026` |
| Deployment state | `READY` (independent post-build Vercel readback) |
| Previous immutable deployed runtime | `adecce31b88f5c1ffd623480524996cb5ae91581` / `dpl_WFU7RH8EJWTX28Ej3zUVSEtrXgo4` — preserved for reference |

The branch PR head at deployment initiation was a later documentation-only commit. The deployment API request pinned **the exact separately approved full 40-character source SHA**, verified the SHA was an ancestor of the still-open draft PR, targeted the pre-existing project, supplied a GitHub source with the pre-existing Colzo release branch, and did not set `target=production`. The new deployment's Vercel readback independently matched that exact SHA.

No branch merge and no migration run. The last full GitHub Actions test-only workflow at the pinned runtime SHA [40955618353](https://github.com/08collinsj-boop/Business-AI/actions/runs/40955618353) previously completed with **1,453 tests passed, zero failed/cancelled/skipped**, successful bundle and static checks. This was not rerun because no code changed between verification and deployment.

## Security and environment preflight

Vercel project inspection returned `ssoProtection: { enabled: true, deploymentType: all_except_custom_domains }`, and the new deployment retained this project-level protection. New deployment aliases list contained one **Preview** branch alias, not a Production/custom domain. Vercel team plan is Hobby; no paid plan or build machine requested.

**Branch-specific Preview environment metadata and selected nonsecret configuration values only** were inspected before deployment; all keys were already scoped to the approved Colzo branch:
- `SUPABASE_URL=https://mvwseobgkexzpmmkgcxe.supabase.co`
- `COLZO_EXPECTED_SUPABASE_PROJECT_REF=mvwseobgkexzpmmkgcxe`
- `COLZO_SCOPED_PILOT_ACCESS=true`, `TENANCY_AUTH_ENABLED=true`, `FRONTEND_AUTH_ENABLED=true`
- `BILLING_ENABLED=false`, `PILOT_FREE_STARTER_MARKETING=false`
- `MARKETING_AUTOPUBLISH_ENABLED=false`, `META_PUBLISH_ENABLED=false`, `VOICE_RECEPTIONIST_ENABLED=false`
- `PUBLIC_ENQUIRY_RATE_LIMIT_MODE=database`

No secrets were decrypted, printed or changed; existing preview secrets/configuration remained in place. No live provider, Facebook publishing, Stripe LIVE or paid service was enabled.

## Actual post-deploy checks

1. **Vercel source and build:** deployment `READY` on exact approved commit, build logs show `npm run build` / `node scripts/build-colzo-react.mjs` and React content bundle **228,622 bytes before compression**, "Deployment completed", build-cache upload success. npm warning lines were not errors.
2. **Vercel protection:** SSO/deployment protection still `enabled`; anonymous GETs to `/`, `/api/health`, `/api/legal`, `/api/data-lifecycle`, `/api/data-subjects`, `/api/colzo-records` and `/legal/privacy.html` returned **HTML authentication-interstitial content** rather than an unprotected API JSON response or an application page. HTTP status was 200 with `text/html` for those interstitials — **200 here does NOT mean the underlying application handler passed or was called**. Distinct per-request HTML digests are expected from dynamic login challenge content. This is a bounded anonymous protection check, not complete SSO/owner-session acceptance.
3. **No release data change:** fresh Development SELECT-only query after deployment confirmed QA fictional grant still `active`, unchanged `expires_at=2026-11-11 22:50:58.480174+00`, QA sessions = **0**, verified QA MFA factors = **0**, current QA DPA records = **0**. No attempted account sign-in, factor enrollment, DPA acceptance, grant update or user record mutation.
4. **Production not targeted:** Vercel creation/readback `target=null` and no production/custom-domain alias on this deployment. The project is the previously verified protected Development Preview. No Production operation was made.

## Required remaining live acceptance

- **BLOCKED:** private, independently authenticated QA account sign-in, correct user/tenant identity confirmation, MFA enrollment/AAL2 and normal DPA acceptance. Original owner's previous successful AAL2 on older runtime is historical evidence, not a new-runtime/QA pass.
- **BLOCKED:** genuine issued-JWT two-account API/foreign ID reads and mutations, AAL1 denial vs AAL2 success, booking/action/customer changes and verification under a legitimate session.
- **BLOCKED:** approved exact live revoke followed by denied access; original fictional QA grant's natural expiry must remain unchanged and be observed after **11 November 2026 22:50:58 UTC**. The existing 12 November follow-up is retained.
- **BLOCKED:** live source/Auth/Storage recoverability; Supabase management previously reported zero listed backups/PITR disabled, and no actual full isolated restore.
- **OWNER DECISIONS:** real operator/contact/public address disclosure, monitored support, pilot terms and data-return/deletion/retention obligations. No user-specific details or false promises supplied.
- **NOT AUTHORISED:** first real-business activation/invite, Production launch, repo merge or privileged changes.

**Release state after deployment:** fictional-data demo **GO** (prior authenticated evidence, now new code deployed but full new owner browser acceptance pending). Secure real-business 14-day pilot **NO-GO**. Production launch **NO-GO**.

**The next minimum practical user-only step** is private QA recovery/sign-in and MFA/AAL2 through the protected Preview, with no passwords, recovery links, QR codes, one-time codes or JWTs copied to GitHub or chat. Continue independently testable engineering and recoverability preparation without using someone else's credentials or bypassing SSO.
