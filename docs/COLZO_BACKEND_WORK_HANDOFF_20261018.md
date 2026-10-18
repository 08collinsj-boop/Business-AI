# Colzo backend Work handover - 18 October 2026

## Scope

UI is complete and must not be redesigned. Focus on backend acceptance, security, data integrity and public launch readiness.

- Repo: https://github.com/08collinsj-boop/Business-AI
- Draft PR: https://github.com/08collinsj-boop/Business-AI/pull/26
- Branch: feature/colzo-complete-ui-motion-20261017
- Verified head: 4bb6a3b29fc4d79f0357358567da6a5efcba78ab
- App preview: https://business-43tuh3wgs-buisness-ai1.vercel.app/
- Public-site preview: https://business-ai-site-d2d92b9qq-buisness-ai1.vercel.app/
- Dev Supabase: mvwseobgkexzpmmkgcxe

Never merge, deploy Production, alter real customer records, cut over domains, charge payments, buy infrastructure, send external messages or disable deployment protection without explicit approval. Existing owner account and business have already been created. Never recreate them. Let the user perform manual Microsoft Authenticator MFA.

## Verified engineering

- New guard in api/operations.js fails closed before invoking a backend handler when the effective Supabase target fails the existing approved-project check. The original Business AI authentication source remains unchanged and its immutable hash regression still passes.
- Four added regression tests in tests/colzo-operations-preview-target.test.mjs. The mismatch test reproduced the original failure, then passed after the fix.
- npm run verify: 767 tests passed, zero failed, 244 JavaScript files checked. git diff --check passed.
- Commit: https://github.com/08collinsj-boop/Business-AI/commit/4bb6a3b29fc4d79f0357358567da6a5efcba78ab
- Exact-SHA app and site preview deployments both READY. Deployment readiness is not end-to-end certification.
- Earlier commit 1c5aa86 added checks that project/quote enquiry IDs belong to the authenticated business. Two-tenant live testing still pending.
- Protected-host launch preflight previously returned UNVERIFIED. Do not mistake an access-control wall for an API authentication pass.

## Work tasks, in priority order

1. Open the latest app preview in the authorised cloud browser, verify its effective browser-safe public configuration points to the Dev Supabase ID above, and check the health endpoint. User must complete owner sign-in and MFA if requested; do not collect secret codes.
2. Exercise real Dev persistence with controlled synthetic records only: Enquiries, Customers, Projects, Quotes, Bookings, Actions, refreshes, edits, status transitions, stale 409 checks, draft discard and audit events. Record fixture IDs and any cleanup. Do not touch the unintended synthetic Dev booking titled "Unsaved motion check" until a separate cleanup decision.
3. Validate two-tenant isolation and owner/admin/member permissions with authorised synthetic accounts. Check guessed record IDs, forged business IDs, linked enquiry ownership, and authenticated backend enforcement. Do not recreate the existing owner or business.
4. Functionally accept AI receptionist, Business Knowledge, handovers, Marketing grounding/drafts/approval, onboarding, account recovery/AAL2, Customer Portal, billing in TEST only and team settings. Keep phone and WhatsApp paid providers disabled and do not send real messages.
5. Audit API routes outside the guarded dispatcher, particularly direct enquiries, leads, bookings and voice. The dispatcher protection alone does not cover them. Preserve all protected original Business AI modules and fix any verified issue only after writing a failing regression test.
6. Recheck Dev SSL enforcement, database network allowlists, RLS advisor results, secure backups, isolated restore readiness and logs. Do not change network restrictions or pay for plan upgrades without an impact review and approval.
7. Review eight Colzo legal pages, operator identity, DPA, support contact, commercial hosting eligibility, Stripe TEST, ICO/privacy compliance, domain cutover plan and tested rollback. Never promote or merge without final owner signoff.
8. Produce exact-SHA evidence: signed-in route coverage, screenshots if available, PASS/FAIL/UNVERIFIED findings, test summaries, fixture changes and remaining blockers.

## Release rule

Keep PR #26 in draft. Vercel READY and passing synthetic tests alone are insufficient for public or paid launch.

