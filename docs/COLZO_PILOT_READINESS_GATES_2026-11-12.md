# Colzo — release decision checklist (12 Nov 2026)

This checklist distinguishes *ready-to-test code* from *safe to onboard real customers*. It is the shortest credible route to the first fictional, then the first genuine pilot; it is not a promise of a one-hour launch.

## Verified engineering baseline
- Draft PR #76 and #77 must stay **draft and unmerged**. Never alter Production, Stripe/billing activation, real customer data, or pilot expiry/grants without separately approved change scope.
- Last known baseline before native My Work UI: 1,835 automated checks passed at commit `d024ccc5`; the exact My Work commit and CI result are tracked on PR #77 separately.
- Colzo's existing authenticated business Actions, Bookings, Enquiries, Projects, company membership summary, Knowledge and approval workflows exist, but deployment readiness is *not* live acceptance.
- The proposed paid Business plan includes **25** Colzo staff seats in code; no atomic 25-seat admission or real 20-user onboarding has been accepted.
- The native Company screen and My Work screen are navigation and application shells; *individual task assignment* and *independent staff ClickUp OAuth* remain gated and **inactive**.

## Hard NO-GO gates
1. **Real Development backup:** Acquire an encrypted full database backup of `mvwseobgkexzpmmkgcxe`, verify a genuine independent restore, and explicitly account for Auth, Storage and Vault/secrets. Synthetic PostgreSQL restore rehearsals are insufficient. Do not expose credentials or sensitive rows in logs.
2. **Scoped SQL and application configuration:** Review the *exact* ClickUp migration and staged assignment/admission schemas after the backup; obtain explicit authorisation separately for each change. Verify schema, RLS/grants and reversible impact before installing on Development. Do not promote to Production.
3. **Real ClickUp connection:** With fictional ClickUp tenant and credentials, verify genuine OAuth state/replay protection, connection/revocation, task and list reads, task create/update, idempotency/conflict handling and no token exposure. Company-connection credentials must not permit employees to impersonate the authorising ClickUp account.
4. **Live staff security:** Authenticate independent fictional owner, admin, member and second-business accounts; verify MFA/AAL2, invitations/seat concurrency, tenant isolation, expected version conflicts, logout/session replay, session revocation and fail-closed errors. Tests require genuine browser/API evidence, not only mocks.
5. **Desktop/mobile acceptance:** Compare authenticated Colzo desktop UI against the approved Stitch reference; verify mobile "business on the go", data persistence, touch targets, keyboard navigation, real API states and screen transitions. Keep the approved feature boundary and record screenshots/evidence without showing customer data.
6. **Operating controls:** Confirm real support owner and monitored email, pilot disclosures/consent, privacy notice and DPA, retention and customer export/deletion, incident/rollback ownership, pilot time windows and exact limits. Obtain GO decision for a named scope before inviting external participants.

## Safe minimal sequence
- Keep iterating on native UI, server validations, documentation and synthetic verification in PR #77.
- Perform the Development restorable-backup gate independently with the operator. Any unsatisfied gate keeps the decision **NO-GO**.
- Only after the separate migration approvals, run the fictional two-tenant authenticated acceptance and correct defects.
- Start with 1 fictional owner and 1 fictional member, then at most 3–5 actual locally approved 14-day pilot businesses; do not promise 20-member rollout before capacity and safeguards are verified.
