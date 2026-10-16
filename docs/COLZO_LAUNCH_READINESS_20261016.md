# Colzo public launch evidence - 16 October 2026

**Decision: NO-GO for public/paid release. Development work may continue.**
This document is an evidence tracker, not permission to merge, switch domains,
take live payments or run an onboarding campaign.

## Candidate and boundaries

- UI development: feature/colzo-account-journey-graphite-volt-20261016, draft PR #19, based on protected-writes PR #10.
- Dev backend: Business-AI-Dev (mvwseobgkexzpmmkgcxe).
- Seven branch-only Preview credentials created on 16 October, including Dev URL, sensitive server key, browser-safe publishable key, tenancy/auth requirements and disabled WhatsApp persistence. Shared Preview and Production settings were not edited.
- Production, Pilot, customer data, messaging, billing, and published legal agreements remain untouched.
- Supabase Dev Security Advisor (16 October 21:17 UTC): eight INFO RLS-enabled-without-policy findings (including server-only Colzo tables) and one WARN for leaked-password protection. Do not add permissive RLS rules to silence this.
- Supabase leaked-password protection requires a paid Pro plan or higher. No upgrade has been authorised.
- Vercel Hobby is limited to non-commercial use under current terms. No upgrade has been authorised.

## Verified automated checks

- Full repository test suite and local secret/static checks were executed against this candidate before any push.
- Native Chromium screens use synthetic fixtures only and cover iPhone and desktop sizes.
- The native Projects runner had an async fixture-wait defect; saved-record browser QA had an ambiguous Edit/Add note selector. Both test defects have been corrected, without modifying the backend.
- The read-only Colzo public launch preflight now checks 18 conditions. Added Colzo owner shell presence and anonymous access denial on business-onboarding, saved-record, and dispatcher API routes. It uses GET requests only and never treats missing routes, redirects or success as secure access denial.
- Vercel access protection blocks unauthenticated preview checks. Protection must stay enabled, and a protected preview returning 401 does not verify that underlying APIs were each tested.

## Release gates

| Gate | Status | Evidence still needed |
| --- | --- | --- |
| G1 source/build | PARTIAL | Automated tests pass; exact-SHA hosted route checks |
| G2 Dev identity | PARTIAL | Dedicated Dev credentials verified; browser confirms effective public-config project |
| G3 account recovery/MFA | BLOCKED | Real authorised Dev login, recovery email and AAL2 |
| G4 onboarding/legal | BLOCKED | Real business creation and DPA/legal acceptance |
| G5 enquiry/AI/booking | BLOCKED | Synthetic public transaction reaches correct Dev tenant |
| G6 tenancy and writes | BLOCKED | Authenticated Dev two-tenant verification, stale 409 and quote lifecycle |
| G7 UI and accessibility | PARTIAL | Synthetic mobile QA passes; screen-reader checks and flagged Stitch screens |
| G8 operator/legal identity | BLOCKED | Eight Business AI-branded legal pages require Colzo-specific owner/legal version review |
| G9 security/recovery | BLOCKED | Auth security plan, backup and isolated restore rehearsal |
| G10 hosting/billing | BLOCKED | Commercial host approval, Stripe TEST checks if charging, ICO obligations |
| G11 production cutover | BLOCKED | Exact Production and database baseline, restorable backup and rollback drill |
| G12 owner release approval | BLOCKED | Exact SHA, cost ceiling, support path and signed go/no-go |

## Remaining manual approval and tests

1. The owner signs in privately on a verified Dev deployment; do not disclose password or authenticator codes here. Before entering credentials, verify the preview public-config project identity.
2. Review the full eight legal pages, operator and trading identity, support contact, address, DPA and acceptance versions. Avoid blind string replacement, automatic legal acceptance and unsupported claims.
3. Select compliant commercial hosting with a known cost ceiling, independently check ICO and backup requirements. No spending is authorised.
4. Complete an end-to-end synthetic customer enquiry and booking transaction, tenant isolation, permissions and billing TEST acceptance in Dev only.
5. Fix and re-review the 12 flagged Stitch screens; design approval is not evidence of working features.

**Go/no-go:** One unresolved P0 is NO-GO for public paid release. Passing synthetic tests and a Vercel READY build are not sufficient.
