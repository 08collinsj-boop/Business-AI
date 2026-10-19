# Colzo backend Work handover - 18 October 2026

## Latest continuation — read this first

Current continuation: [COLZO_BACKEND_ACCEPTANCE_20261019.md](COLZO_BACKEND_ACCEPTANCE_20261019.md). Authentication configuration is recovered; see also [COLZO_AUTH_RECOVERY_CLEANUP_20261019.md](COLZO_AUTH_RECOVERY_CLEANUP_20261019.md). The current SHA526c9a1 Preview returns public-config 200 with frontend authentication enabled and the expected Dev project. The cloud browser renders Colzo sign-in without the temporary-unavailability error; this session has not verified owner login or MFA. The historical missing-credential findings below are superseded. Actions safe-ID and Actions/Bookings save-confirmation fixes pass 890 automated tests, zero failures, plus static verification. No customer records, Production settings or UI appearance changed; no spending.


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

## P0 - Colzo Preview owner authentication unavailable (18 October)

The owner reports Authentication is temporarily unavailable on the latest motion Preview. The exact message originates from initializeAuthentication() in index.html when the public auth configuration cannot be obtained or the browser-side Supabase SDK cannot be initialised. Supabase Dev Auth, DB and REST services are healthy.

Repository evidence in docs/COLZO_LIVE_PAGE_QA_20261017.md confirms motion-branch automatic previews lack the branch-specific Dev configuration; seven secure Preview values were configured on PR19 branch feature/colzo-account-journey-graphite-volt-20261016, NOT on feature/colzo-complete-ui-motion-20261017. The newest motion Vercel deployment reports READY, but the inner /api/public-config status cannot be observed anonymously due to Vercel Deployment Protection 401. The branch mismatch is a confirmed configuration gap and likely cause of the symptom, NOT yet a confirmed runtime 503.

Work: Open Vercel business-ai project prj_d5DuC65u4hSITFRC54ygswiMW9ST with its authorised cloud browser. Safely provision the same seven Dev-only Preview settings for the current motion branch without altering the original PR19, shared Preview, Pilot or Production values. Required key names include SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, TENANCY_AUTH_ENABLED and FRONTEND_AUTH_ENABLED, plus the other existing branch-specific flags. Do not show raw secrets in chat or logs, or copy Production/Pilot credentials. If a secret cannot be securely transferred by authorised tooling, stop that step for the owner to handle in the provider UI.

After settings are saved, redeploy the CURRENT motion branch as a new Preview. Vercel environment updates do not change already-built previews. In a legitimately authorised protected browser, verify GET /api/public-config returns HTTP 200, frontendAuthEnabled=true and supabaseUrl=https://mvwseobgkexzpmmkgcxe.supabase.co, with a browser-safe publishable key present but not copied into output. Verify GET /api/health independently. Then owner may privately sign into EXISTING 08collinsj account and complete Microsoft Authenticator MFA. Do not recreate either.

If /api/public-config is HTTP 200 yet the UI error remains, inspect failed JS SDK requests, CSP, browser errors and the effective response body before making a code change. Never remove the fail-closed database guard or bypass deployment protection.

Previous independently verified signed-in Dev reference (old PR19 screens): https://business-dcgot7hjq-buisness-ai1.vercel.app/. This is an interim older UI reference and does not establish current live availability.

### Runtime evidence

- Colzo motion Preview: READY at a0673ff5 but current application auth/config routes UNVERIFIED behind deployment protection.
- Supabase Dev Auth/REST/DB: ACTIVE_HEALTHY.
- Synthetic guard tests: 10/10 passed in this investigation.
- No Production changes, deployment protection changes, secret access or account/MFA reset.

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

