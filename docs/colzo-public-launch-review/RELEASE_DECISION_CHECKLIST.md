# Colzo - public launch release decision checklist

**Owner decision: NO-GO. Draft review evidence, 16 October 2026.**
This branch contains **no public website or contractual changes**. It is
separate from Work's functional testing PR #19. No charges, customer writes,
publication, merger, domain cutover or Production deployment is approved.

## Two independent workstreams

**Work: app acceptance.** Use existing 08collinsj account and its already
configured Microsoft Authenticator and business. Check actual Dev project
identity before private login. Do not recreate accounts or bypass MFA.

**This review PR: business/public-launch readiness.** Check the site promises,
commercial offer, legal wording, privacy/ICO obligations, hosting licences,
support capability, backups, recovery and rollback without interfering with
Work's feature implementation.

## P0 gate table

| Gate | Status as of audit | Proof required before public sign-off | Responsible |
| --- | --- | --- | --- |
| Exact candidate | PARTIAL | SHA for tested branch equals Vercel READY deployment; all tests green | Work |
| Preview security | BLOCKED | Open protected preview with owner-controlled sign-in and check app's real /api/health and /api/public-config are bound to Business-AI-Dev | Work + owner |
| Existing account/MFA/business | USER-CONFIRMED, not current-build certified | Existing 08collinsj login, Microsoft Authenticator and business membership work on exact current preview | Work + owner |
| Enquiry to owner | BLOCKED | Harmless QA enquiry appears in correct business with contact details and no cross-tenant leak | Work |
| Booking workflow | BLOCKED | QA booking request saves, returns to right tenant, does not falsely claim confirmation | Work |
| Customers, Projects, Quotes | BLOCKED | Real Dev create/edit/refresh, tenant checks, 409 conflict and quote lifecycle | Work |
| Knowledge/AI receptionist | BLOCKED | Approved knowledge only, uncertainty/escalation, no fabricated service/prices | Work |
| Marketing | BLOCKED | Reviewable drafts, entitlement/approval safety, no external publication without user permission | Work |
| UI and accessibility | PARTIAL | Confirm all customer-visible screens, safe areas, keyboard and focus, 12 flagged Stitch fixes | Work |
| Legal operator and contracts | BLOCKED | Eight full Colzo documents, operator identity, valid service address/contact, version and reacceptance decisions | Owner with qualified review as needed |
| Commercial website and pricing | BLOCKED | Remove unsupported promises, verify all plan entitlements and actual Stripe TEST prices; free Pilot and £3.99 paid trial distinct | Owner + Work |
| Hosting permissions | BLOCKED | Pro/compliant commercial hosting approved or another licensed host; verify feature/config parity and costs before switch | Owner |
| Privacy and ICO | BLOCKED | Complete owner-factual ICO assessment or documented exemption, privacy/retention/providers/rights route | Owner |
| Security | PARTIAL | Dev advisor shows 8 RLS INFO with no policies and 1 leaked-password WARN. Verify intent and compensate or resolve; NEVER open RLS broadly | Work + owner |
| Data recovery | BLOCKED | Backups include schema, tenant data and required storage objects, with tested isolated restore and measured loss/downtime | Work + owner |
| TEST payments | BLOCKED | End-to-end test checkout/webhook/entitlement/retries/refund/cancellation if paid public launch; no real cards | Work + owner |
| Support & incident response | BLOCKED | Monitored email/contact and documented escalation, logs and response owners | Owner |
| Final authority | BLOCKED | Owner expressly approves final SHA, environment, total budget, launch copy, contract versions, rollback | Owner |

One unproven P0 keeps public/paid onboarding closed. "READY", synthetic
tests, a mocked success screen, or screenshots alone are not certification.

## Recommended first public offer

Limit initial public promises to **features independently proven in Dev**.
Prospective v1 scope: business onboarding, web AI enquiry handling with
approved knowledge and human handover, owner enquiries/actions, customer
records and booking requests. Projects, Quotes and Marketing can be advertised
only after their authenticated persistence and permissions are verified.

**Not launch-committed:** real AI phone answering, existing-number WhatsApp,
universal Face ID/passkeys, automatic Meta/Instagram publishing, instant booking
confirmation, a promised support SLA or paid checkout without independent
certification. No newly added charges or third-party messages are authorised.

## Rollout plan (separate approval needed)

1. Freeze a specific tested SHA and collect owner/browser results.
2. Record current Production SHA/deployment ID/variables by names and
   scopes, current API/backend project IDs and rollback target. Never
   copy secrets into report documents.
3. Verify full recoverable backup, including database AND storage; run
   an isolated restore drill. App rollback alone cannot undo DB writes.
4. Align approved Colzo branding, customer-facing legal agreements,
   subscriptions/entitlements, privacy, domain and support.
5. Owner signs an explicit GO / NO-GO decision with cost ceiling and scope.
6. Only then deploy to an authorised environment, monitor a supervised
   initial cohort, and suspend onboarding/outbound publishing if needed.
7. Record all issues, measured resolution times and recovery evidence.

## Owner-only decisions

- Exact sole trader legal identity, trading name and approved legal-service
  correspondence address. Do not automatically expose a home address.
- Which support mailbox/domain is actively monitored, data-rights contact,
  policy versions, effective dates and any existing-user reacceptance plan.
- Commercial hosting method and cost ceiling. Vercel Hobby is restricted
  to non-commercial personal use by its current terms.
- ICO data-protection-fee self-assessment facts/payment if due. No registration
  or payment has been performed through this review.
- Launch model: invited testing only versus public free access versus paid
  plans. Do not silently convert historical Pilot customers into paid plans.
- Stripe TEST approval for QA-only payment lifecycle. Live charging requires
  separate explicit go-ahead.

## Technical acceptance for Work

- Compare active preview config and Supabase Dev ID before owner login.
- Check request/response status and persistence for each real Dev UI flow.
- Capture mobile screenshots of approved and 12 flagged Stitch screens,
  plus console/network failures and inaccessible controls.
- Verify tenant membership, no leaked service-role secret in browser,
  authentication failure behaviour, MFA and protected writes.
- Run full npm run verify, Chromium matrix and any new regression tests;
  record exact commit SHA and route-level pass/fail.
- Report blockers, disabled features and deployment protection separately.

## External references checked for this plan

- Vercel commercial use: https://vercel.com/docs/limits/fair-use-guidelines
- ICO data fee self-assessment: https://ico.org.uk/for-organisations/data-protection-fee/data-protection-fee-self-assessment/
- ICO privacy transparency: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/
- GOV.UK sole trader identity: https://www.gov.uk/become-sole-trader/choose-your-business-name
- Supabase database backup/restore limits: https://supabase.com/docs/guides/platform/backups

**This is a readiness and responsibility plan, not an independent legal,
security or disaster-recovery certification.**
