# Colzo Dev authentication - post-recovery cleanup (19 October 2026)

This record covers **Dev Preview only**. It is not evidence of Production readiness or two-tenant acceptance.

## Verified recovery evidence

- The owner confirmed Colzo was working after the Dev branch's Supabase service-role key was privately corrected.
- The Preview service-role read-only credential preflight returned HTTP 200 with `backendCredential: accepted`; the application health and public auth configuration also returned HTTP 200 and matched the expected Dev Supabase project.
- Existing account and Microsoft Authenticator were preserved. Successful MFA re-enrolment is **not** asserted; no new accounts were created.
- The working Dev branch is `feature/colzo-complete-ui-motion-20261017`. Keep PR #26 **draft**. Do not deploy Production, merge, or spend money without approval.

## Removed temporary investigation controls

- The unprotected Dev-only `dev-auth-preflight` operation was removed from the dispatcher. It formerly disclosed whether the server key was accepted, even though it did not return credentials or records.
- Temporary per-request `colzo.preview_legal_transport` logs and diagnostic auth transport fields in legal 401 responses were removed.
- The mobile login error no longer mislabels the backend's generic authentication rejection as “token missing”; it uses a cautious “backend-session-unverified” code.
- The **actual** Preview token transport remains: the browser's `X-Colzo-Supabase-Authorization` is restored to a Bearer header for the existing server-side Supabase verification **only** on the pinned, approved Dev Preview. Production/Pilot have no new auth path.
- These removals retire their obsolete tests. Do not compare the raw test count to the previous 837 baseline as if removed diagnostic tests were regressions.

## Follow-up acceptance still required

1. Verify real signed-in functionality of enquiries, customers, projects, quotes, bookings, actions and marketing on the current Dev branch, with the owner's permission and synthetic records.
2. Independently verify two-tenant isolation, MFA return session, recovery and owner/admin/member access.
3. Capture screenshots on an actual iPhone and desktop of the shared header and five-tab bottom navigation. Static tests do not prove real viewport appearance.
4. Confirm accessibility, legal operator identity, backups, hosting eligibility, rollback plan and owner release approval before public launch. Status remains **NO-GO**.
