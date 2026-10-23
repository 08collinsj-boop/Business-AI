# Colzo: per-business free pilot access - draft release gate
Date: 23 October 2026
Target branch: feature/colzo-scoped-pilot-access-20261023
Based on free-pilot QA branch qa/colzo-free-pilot-scope-20261023 (2337495db537d44ad8f66f017347495807e3e09f)

**Status: Development draft only. NOT APPROVED to deploy, merge, invite testers or apply SQL.**
This change does not create pilot accounts, trigger messages, activate Stripe or change Supabase.

## Behaviour
- The feature flag COLZO_SCOPED_PILOT_ACCESS must equal "true"; otherwise the existing paths remain intact.
- Scoped mode can only grant access on Vercel Preview connected to Supabase Dev project mvwseobgkexzpmmkgcxe, with the legacy broad PILOT_FREE_STARTER_MARKETING flag not "true".
- Each existing verified business ID requires a single manually approved, active database grant.
- Grant duration is exactly 14 x 24 hours from activation. Missing, revoked, invalid, not-yet-started and expired grants fail closed.
- Enquiry reservations reuse the existing atomic server-side billing usage RPC with a business-specific activation period and Starter's 250-enquiry limit.
- The free scoped pilot permits up to two staff seats and does not initiate payment collection.
- AI Marketing is deliberately blocked in the new scoped mode; this does not silently grant the paid add-on.
- The scoped billing endpoint returns owner-readable status and refuses POST checkout. Authenticated business-membership checks remain unchanged.

## Staged schema - NOT a migration
The proposed SQL is at docs/colzo-pilot-review/scoped-pilot-access.STAGED.sql, deliberately **outside** supabase/migrations to prevent automatic application. It includes RLS, denies direct browser-role privileges and grants server SELECT only. It has never been run against Dev or Production.

## Essential blockers before any real invitation
1. Perform a private, independently restored backup of shared Dev data, Auth/Storage and essential configuration; reconcile known migration-ledger drift before any DDL.
2. Review and approve the SQL in isolation, install on a disposable database and test permissions, grants and recovery before touching Dev.
3. Create a controlled, audited operator approval process for grants. There is intentionally no public self-grant endpoint, and no real invite or user account was created.
4. Verify a fresh exact-SHA Preview and two real independent authorised accounts, signup confirmation, MFA, owner/member permissions, iPhone Safari, cross-tenant denials, expiry and review-flow behaviour.
5. Verify all app routes respect expiry. **This draft gates AI enquiries and protected add-ons only; other screen/record access is not automatically suspended by pilot expiry.**
6. Update the public/signup copy. Existing free Pilot banner is tied to the legacy broad flag, so do not claim this scoped mode is an end-to-end, self-service trial.
7. Final acceptance with legal, hosting, billing, support and operational decision recorded. Production, older Pilot, DNS and paid providers remain out of scope.

## Verification
- RED: billing integration tests initially failed before the scoped access branch was wired into billing and add-ons.
- GREEN: 11 new scoped tests passed; targeted billing/add-on/onboarding/Stripe group: 75 passed; React build and static validation passed.
- Full test suite is NOT certified: the remote Composio runner timed out before completion during large batch testing. Smaller batches should be run and GitHub CI reviewed before changing readiness status.
- Do not infer real-account acceptance from synthetic tests.

## Safe release/rollback
This branch is intended for an unmerged **draft** pull request. Never enable COLZO_SCOPED_PILOT_ACCESS while the table is absent or incomplete. If an approved Preview is misconfigured, unset its flag and retest. Do not drop tables or erase customer records to roll back.
