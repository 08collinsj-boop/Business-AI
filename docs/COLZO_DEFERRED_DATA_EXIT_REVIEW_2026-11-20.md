# Colzo data-exit deferred public tables — evidence handoff
**20 November 2026 | Internal fictional-data engineering review | NOT an approved export, deletion or real-customer pilot**

This is the explicit, non-executable review of the 13 public tables intentionally omitted from the current **40/53** draft export. It builds on `COLZO_DATA_EXIT_AND_RECOVERY_PREFLIGHT_2026-11-16.md` and `COLZO_TENANT_DATA_EXIT_SCOPE_2026-11-14.md`. Do not change allowlists, activate the disabled endpoint, publish this as a customer promise, or run deletion based on this document.

| Deferred public table | Provisional handling / review needed |
| --- | --- |
| `business_audit_events` | Evaluate audit/incident and statutory holds, redaction, requester entitlement, independent review |
| `business_referrals` | Two-party links: confirm both businesses' rights and keep foreign tenant information out |
| `businesses` | Assess tenant root identity, dependency closure and ownership of each field |
| `colzo_pilot_access` | Privileged pilot entitlements; consider operational retention and secret-free receipt |
| `colzo_whatsapp_demo_threads` | Assess whether demo content can identify people; isolate fictional test data and retention |
| `customer_enquiry_access` | Verify access-link/token and security field redaction; do not expose live tokens |
| `customer_profiles` | Preserve shared users across businesses; do not export unrelated profile data |
| `marketing_meta_oauth_states` | OAuth state and security data must never be returned as raw tokens |
| `pilot_free_access_config` | Global settings; document platform exclusion, never infer tenant ownership |
| `platform_incident_controls` | Global security controls; review operational retention and platform exclusion |
| `public_enquiry_rate_limit_buckets` | Security/abuse telemetry; review exclusion or privacy-preserving aggregate only |
| `stripe_webhook_events` | Payment-event data and statutory/contractual retention; legal/operator review required |
| `user_legal_acceptances` | User-associated/shared legal consent records, retention and tenant relationship review |

**These dispositions are proposals for human review, not final legal/technical decisions.** An omission is not automatically safe erasure. Conversely, a field in an included table is not automatically entitled to export.

## Implemented non-executable check

`lib/colzo-deferred-public-export-review.js` reuses the canonical `DEFERRED_PUBLIC_DATA_CLASSES` risk classification for each deferred name and `assessDeferredPublicExportReview` checks that the recorded 53-table public scope and 40-table draft allowlist have not widened or drifted silently. It rejects unknown/duplicate/malformed public scope inputs, unexpectedly included deferred tables, unrecognised new tables, missing reviews and unknown review receipts. Even a complete synthetic review returns `completeDataReturnVerified:false`, `deletionAuthorised:false` and `pilotApproved:false`. No SQL, Storage, network, customer rows, or executable erasure exists in this module.

## Historical isolated verification and adoption boundaries

- Detached test candidate parent: PR #82 `7fee001d4b14c5b5291b984df64ae0acc25be31d`. No branch push, PR update or Vercel deployment.
- Local isolated fixture with matching 53/40 table names: `node --test tests/colzo-deferred-public-export-review.test.mjs` **5/5 PASS**, `node --check` PASS. Local `git hash-object` values matched the two published GitHub blobs.
- **Not run:** the repository-wide `npm test && npm run verify:local` (the source checkout is not available in this executor), live database metadata, protected authenticated browser, controller authorisation and independent review.
- Before adoption: establish a verified Vercel ignore-build guard for a new isolated branch *without changing Production behaviour*; attach candidate, run full repository tests, review source drift and update evidence. Never infer GO from a standalone fixture.

## Full-checkout verification update — 20 November, 20:18 UK

The historical limitations above have been superseded for repository execution, while remaining intact as earlier evidence. Draft PR #83 attaches the complete candidate chain to `qa/colzo-data-exit-review-20261120`, stacked on unchanged draft #82. Application/test commit `610fffffc173f0da36315cb12a5f9d77cdf47f15` adds a reproduced projection-drift regression: adding a column, wildcard, narrowing or malformed projection now rejects review completion against the canonical allowlist. Review receipts still require own documented fields; no export or deletion was activated.

- Clean lockfile install `npm ci`; full original candidate verification: 1,994 passed. RED projection regression: 10 passed / 1 failed. Corrected focused suite: 11 passed.
- Final application-code `npm run verify`: **1,995 passed**, zero failures/skips; **472 JavaScript files** and secret/temporary-marker checks passed. Node 24.22.3 / npm 11.19.1. Published source matched the tested working tree exactly.
- Chromium layout: 375/390/430 phones, 1366/1440 desktops passed. Native workflow/logout: seven sizes passed. MFA: four sizes passed. These are fictional fixtures, with keyboard geometry explicitly simulated, not physical Safari or actual authentication factors.
- Separate PR #80 `fd42097d`: 17 pure demo checks and four browser sizes passed; no provider writes. Not combined with this branch.
- Exact-branch build-ignore gate installed/read back in both linked Vercel projects before branch creation. Twelve environment/branch cases passed. Actual app/site attempts were **CANCELED** because the ignore command returned exit 0; no new READY Preview. Production and the existing protected #82/#81 deployments remain unchanged.
- Read-only Development metadata: 53 public plus two private base/partitioned tables, all RLS enabled. Six no-policy INFO findings remain consistent with prior deny-by-default ACL evidence; leaked-password protection WARN remains open. No database/Auth/RLS changes.
- Hosted browser currently shows sign-in, with no private content in DOM. Preserve the unchanged deployed #82 owner MFA, workflow, 340/454px reflow and logout evidence; this run does not claim new authenticated browser acceptance. A fresh hosted rerun requires secure sign-in and genuine MFA.

This documentation update does not change application behaviour. Full data return, deletion, recovery, role/token, operational/legal and deferred physical-device gates below remain open. **External pilot NO-GO.**

## Approved source baseline

The metadata reviewer compares the canonical public table and ownership pairs and the exact draft-export field projections with SHA-256 fingerprints pinned to the independently reviewed PR #83 source at `390e182f`. Putting the same change in the canonical source and in a caller override cannot clear a baseline mismatch. Table declaration order is ignored. Field projection strings are compared exactly.

An intentional change to either canonical declaration requires explicit approval of the exact scope or field diff before the corresponding fingerprint is updated. Record the reviewer, approval reference and approved commit in the PR. Review ownership and the sensitivity and entitlement of each changed field alongside the existing deferred classification. Keep the source change and fingerprint change together for review. Leave a mismatch failing closed while approval is pending. Updating the fingerprint does not authorise real data return, deletion or pilot use.

## Remaining data-return / deletion blockers

1. Confirm an actual controller instruction, identity/address/privacy/DPA decisions, lawful retention holds, operator and independent reviewer.
2. Complete consistent owner-authorised, tenant-scoped return including shared identities, Auth/MFA, Storage **actual bytes**, Vault, outside providers, secure encrypted delivery and customer receipt. Current two-read draft reconciliation is not an atomic snapshot.
3. Prove independent compatible DB/Auth/MFA/Storage restore in a separate authorised environment. Preserve earlier Chromebook/USB integrity evidence but keep full restoration **DEFERRED/OPEN**.
4. Design a reviewed **inert first** deletion dry run: compare scoped expected counts, foreign-tenant protections, shared-user preservation, legal holds, provider revocation and post-exit residuals. Do not create executable deletion SQL without fresh explicit approval and recovery acceptance.
5. Keep the external pilot **NO-GO** until all real-world acceptance and legal/operational controls are evidenced.

Physical iPhone Safari testing remains a **separately deferred** release gate; neither this workstream nor isolated tests waive it.
