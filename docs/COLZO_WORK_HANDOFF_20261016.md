# Colzo - Work mode development and launch-readiness handoff
Updated: 16 October 2026. This is a development brief, not permission to release publicly.

## User-confirmed facts

- The existing 08collinsj account and its business were created on 15 October 2026.
- Microsoft Authenticator TOTP MFA worked during existing account sign-in on 15 October.
- Do not create another owner/business, reset passwords or replace MFA factors.
- The user approves the Graphite & Volt direction and wants all customer-facing screens implemented, including auth, onboarding, navigation and hidden states. The 107 ready Stitch designs are accepted as visual references, not proof of working features. Twelve flagged screens still require fixes and approval.
- Do not change Pilot/Production, migrate data, purchase infrastructure, make payments or publish external content without explicit approval.

## Authoritative paths

- GitHub repository: 08collinsj-boop/Business-AI
- UI draft PR #19: branch feature/colzo-account-journey-graphite-volt-20261016
- Parent protected-writes draft PR #10: fix/colzo-composio-first-protected-writes-20261015
- WhatsApp foundation draft PR #17 is independent and not launch-certified.
- Business-AI-Dev Supabase project ref: mvwseobgkexzpmmkgcxe
- Vercel project ID: prj_d5DuC65u4hSITFRC54ygswiMW9ST, team ID: team_rCWQ41TMWjGseuzS4IDTsbZ4
- Seven Preview-only variables are scoped to the exact UI feature branch. They contain the Dev backend URL, secured Dev keys, tenant/auth flags and WhatsApp persistence OFF. Never reveal raw keys.
- Read docs/COLZO_LAUNCH_READINESS_20261016.md and docs/COLZO_V1_CONTROLLED_LAUNCH_RUNBOOK.md.
- Look up the newest draft PR SHA and associated preview URL; never assume an old preview points to the tested branch.

## Completed local evidence

- Full npm run verify: 681/681 passed.
- Fifteen synthetic Colzo Chromium QA browser scripts passed, covering account gates, onboarding, auth, MFA, native Home, Enquiries, Bookings, Actions, Projects, Customers, Quotes, settings, motion, visual styling and saved-record fixture writes.
- Two brittle browser QA assumptions were corrected in this batch: the approved subtle lime sign-up background glow and the 180 ms onboarding radio selection border transition.
- These tests intercept network and simulate data. They do not establish real signed-in Dev account acceptance or production legal/hosting readiness.

## Work mode P0 execution order

1. Open GitHub PR #19, determine exact commit SHA and matched Vercel Preview deployment. Keep Deployment Protection ENABLED. Offer secure browser sign-in to the user if Vercel/Colzo authentication blocks access. Never request passwords, emailed codes or Microsoft Authenticator codes in chat.
2. Once authorised to open the app, verify its own /api/health and /api/public-config. The exposed Supabase URL must be precisely https://mvwseobgkexzpmmkgcxe.supabase.co, and both owner/front-end and tenancy auth must be enabled. If unknown or wrong, STOP using the 08collinsj account on that preview.
3. Sign into the EXISTING 08collinsj owner/business and Microsoft Authenticator, with user-controlled MFA. Confirm tenant membership and business switching. Do not repeat registration or business creation.
4. Exercise each customer-facing route on iPhone and desktop, including signed-out, errors, empty states, modal sheets, navigation back paths, scroll, accessibility and disabled features. Compare with approved Stitch references. Keep the 12 flagged visual references unapproved pending corrections.
5. With harmless clearly labelled Dev QA data only, verify customer, project, quote, lead/enquiry, booking request, action and their saved edit/refresh flows. Confirm real persistence, server-side tenant control, stale updates 409 and quote status lifecycle. Test cross-tenant access only with independently authorised test users. Never forge sessions, disable RLS or access real customer records unnecessarily.
6. Test AI receptionist only against approved knowledge and human escalation; test Marketing drafts and review without posting, scheduling live publishing, sending WhatsApp or incurring paid API usage.
7. Continue implementing missing Graphite & Volt customer screens and corrections in isolated code; preserve approved Home/Bookings design references, exact auth/MFA/consent guardrails and existing backend.
8. Draft (but DO NOT publish or approve) Colzo-accurate content for eight legal pages currently carrying Business AI wording. Owner must verify operating identity, address, legal terms, versions and contact details.
9. Review commercial hosting, backup/restore, ICO, Stripe TEST and security advisories without paying or changing live infrastructure. Supabase Dev reports one leaked-password-protection WARN and eight RLS INFO findings; do not solve them by weakening access.
10. Rerun npm run verify, all fifteen synthetic browser scripts and permitted authenticated Dev acceptance tests. Record exact SHA, preview, reproducible evidence, screenshots, remaining limitations and final public GO/NO-GO in the draft PR. Never merge or deploy to Production without explicit owner approval.

## Deployment protection warning

Outer Vercel access-wall HTTP 401 responses do NOT demonstrate that Colzo protected endpoints enforce tenant authentication. The updated launch preflight only accepts API denials when the app's own health and shell are reachable. When protection blocks checks, report UNVERIFIED.

## Required handback to user

Report exact SHA, Preview URL, working vs failing route list, before/after screenshots, accepted vs flagged Stitch coverage, synthetic vs real authenticated evidence, test totals, outstanding P0 blockers, spending/data changes and the specific owner actions required.

Public paid launch remains NO-GO until all release gates have real evidence.
