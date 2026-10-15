# Colzo v1 - controlled launch runbook

**Release state: NO-GO until every P0 gate below has dated, exact-SHA evidence.**
This plan coordinates Work's development with operator decisions. It does not authorise a merge, Production deployment, domain switch, live billing, paid infrastructure, migration, or legal acceptance.

## Scope and authoritative development paths

- Source: `08collinsj-boop/Business-AI`.
- Corrective development: `fix/colzo-composio-first-protected-writes-20261015`, [PR #10](https://github.com/08collinsj-boop/Business-AI/pull/10) (draft).
- Auth/UI design: [PR #12](https://github.com/08collinsj-boop/Business-AI/pull/12) (draft); **its standalone preview does not use the approved Dev Supabase**, so don't create real accounts there.
- Synthetic browser QA corrections: [PR #13](https://github.com/08collinsj-boop/Business-AI/pull/13) (draft).
- [Launch acceptance tracker #11](https://github.com/08collinsj-boop/Business-AI/issues/11).
- Target isolated development backend: Supabase `Business-AI-Dev` / `mvwseobgkexzpmmkgcxe`. Never assume other Vercel Preview branches are configured identically.
- Reference Production state recorded on 15 October: Git `main` `b1861051a696b0719c024481784672363f6f4bfc`, Vercel deployment `dpl_B1pREw9u11SF5XJ8guv2zh8Dhd4X`. **Re-verify both IDs at actual cutover.** They are code-rollback references, not database backups.

## MVP launch offer - keep it deliberately narrow

**Promisable only after live authenticated acceptance:** business registration/onboarding; tenant-scoped dashboard; public enquiry/quote request; AI receptionist using approved knowledge with human escalation; owner's lead inbox and customer follow-up; reliable booking request workflow; customers and owner support.

**Advertise only if separately certified:** project records, quotes/estimates, Marketing draft approval, scheduling, connected third-party social publishing, subscription billing. Do not promise AI phone answering, passkey/Face ID as universally available, automatic Meta publishing, Colzo Connect or otherwise unsupported integrations.

Existing documented prices (source `docs/STRIPE_BILLING_PILOT_SETUP.md` and `docs/ADDONS_MARKETING.md`): Starter £34.99/month, Pro £79.99/month, Business £159.99/month, optional Marketing £19.99/month. Existing 7-day £3.99 paid trial and separate free Pilot entitlement mode **must never be conflated**. Do not change prices or enable live checkout without explicit owner approval.

## P0 gates - must all be PASS, not simply "deployed"

| Gate | Acceptance proof needed | Owner of action |
| --- | --- | --- |
| G1: repository and preview | Exact candidate SHA has fully green `npm run verify`/browser tests; all calls same-preview `/api/*`, no old Pilot proxy | Work |
| G2: correct environment | Dev Supabase project ID confirmed in deployed `/api/public-config`; no production secrets/tokens present in browser | Work |
| G3: owner registration | Fresh owner registers, confirms email, logs in/out, resets password, passes MFA; no credential shared in chat; only approved redirect origins | Owner + Work |
| G4: business/legal setup | Owner creates one dev business/membership, DPA/legal gate honoured, interrupted onboarding resumes | Owner + Work |
| G5: core customer transaction | Synthetic customer submits a question, quote request and booking request; AI only uses approved facts, safe escalation, owner sees correct tenant's lead and action | Work |
| G6: protected writes and tenancy | Cross-tenant requests rejected; Clients/Projects/Quotes persistence where advertised; stale edits 409, quote status controls enforced; deletes unsupported unless authorised | Work |
| G7: accessibility and appearance | iPhone + desktop: no blue legacy auth screens, scroll clipping, obstructed buttons, fake active controls or misrouted navigation; design PR #12 incorporated | Work |
| G8: legal and operator identity | Owner verifies precise operator/trading name, address, contact route, all eight legal pages, Terms, Privacy, DPA versions, subprocessors, rights process and acceptance language; may need reacceptance | Owner + legal review |
| G9: security and recovery | Supabase auth/security advisor reviewed, relevant password protection on; tested isolated backup and restore; recovery point and rollback drill documented | Work + owner |
| G10: payments and compliance | Stripe TEST checkout/webhook/entitlement and portal PASS **if charging**; ICO self-assessment/registration obligations confirmed by owner; Vercel commercial hosting or approved alternative | Owner + Work |
| G11: production and data migration | No unsafe shared Dev/Pilot data writes; exact deployment and DB identities confirmed, migration necessity reviewed, backup tested before any data cutover | Owner + Work |
| G12: release approval | Owner signs off exact SHA, deployment target, cost ceiling, support route, trial/pricing wording, go/no-go and rollback owners | Owner |

## Browser acceptance script - synthetic data only

1. Open the **verified** dev preview (not any arbitrary deployment URL). Read `/api/health` and `/api/public-config`. Check exact Dev database before entering credentials.
2. Owner completes registration and email confirmation personally, creates a test business, confirms business ID is server-assigned, accepts only genuinely understood legal documents.
3. Sign out and sign in; exercise recovery, mobile scroll, MFA step-up and denied unauthenticated owner APIs.
4. Submit public enquiry, quote request and booking request using `QA TEST` labels and harmless contact details. Confirm right tenant records, action statuses, human handover, dates and no fabricated "booked" confirmation.
5. Create, edit and retry a **stale** Client/Project/Quote update. Require 409 conflict with original record preserved. Verify quote transitions and immutable sent/accepted terms.
6. Verify knowledge upload is review-only until approved; test AI fallback safely with synthetic content. Avoid real marketing publication without separate consent.
7. With synthetic rights-request fixture only, verify data export/anonymisation belongs to the correct tenant.
8. If charging at launch, complete **TEST mode only** checkout/webhook/portal lifecycle; inspect entitlements and cancel. No live cards.
9. Capture device dimensions, screenshots, network failures, console issues, tested SHA and feature results. Mark each P0 gate PASS/FAIL/BLOCKED; do not infer success from Vercel READY.

## Commercial and legal constraints

- The current Vercel team was recorded on Hobby; Hobby is not a commercially authorised solution for a paying launch. Obtain owner-approved compliant hosting before collecting paying customers; do not upgrade automatically.
- The ICO self-assessment previously indicated a Tier 1 data protection fee, but **payment/registration is not verified**. Owner must confirm current obligations, do not pay or submit declarations without approval.
- All eight `legal/*.html` public documents displayed "Business AI" as of 15 October; they need deliberate Colzo brand/operator/version review, not blind string replacement.
- Preview Stripe credentials/checkout are **not independently certified**. Do not copy old Pilot/Production billing secrets into a design preview to make tests pass.
- The Dev Supabase backup API reported no listed managed backups and PITR disabled as of 15 October. A historical `pilot_backup_20261010` logical snapshot is **not** a full database disaster recovery plan.

## Prelaunch freeze and approvals

- Select one SHA and pin deployment; stop uncoordinated concurrent changes to that release branch.
- Obtain screenshot and test evidence from PRs #10, #12, #13; merge only after reviewing branch compatibility and rerunning the entire suite.
- Confirm all P0 items explicitly. Make go/no-go decision **in writing** with costs, data/identity, support, and rollback owner.
- Do **not** migrate real records, repoint the public domain or merge to Production on automated test success alone.

## Release and rollback (requires separate explicit authorisation)

1. Record original Production deployment SHA/ID, domain mapping, environment variables (names and scopes, not secret values), Auth project ID and database backup evidence.
2. Stage the release to the approved environment; verify owner sign-in, protected API denial and one permitted synthetic customer enquiry before enabling public onboarding.
3. Start with only a small supervised invited-business group. Support and monitor failures rather than advertising unsupported features.
4. If serious errors occur, suspend new onboarding/outbound automation using existing supported controls and **roll back application deployment** to the recorded healthy version; confirm public enquiry and owner access after rollback. Do not disable tenant Auth/RLS as a shortcut.
5. If a schema/data migration occurred, deployment rollback alone is insufficient. Use the pre-verified recovery procedure only after confirming the risk of losing post-backup customer writes; never restore a database casually or against Production without approval.
6. Log incident and recovery evidence, close the launch gate until regression tests pass.

## Evidence template

```text
Gate:
Result: PASS / FAIL / BLOCKED
Git SHA:
Deployment URL:
Supabase project ID:
Test type: static / synthetic browser / authenticated dev / TEST billing
Device and viewport:
Steps and expected vs observed:
Screenshot or log references:
Data touched: synthetic only / none
Verified at (UTC):
Reviewer / unresolved risks:
```

**Go/no-go rule:** One unresolved P0 is NO-GO for paid/public release. A private synthetic demonstration is not a customer launch.