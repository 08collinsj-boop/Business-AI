# Colzo Preview — self-service 14-day pilot registration (2 Nov 2026)

**STATUS: CODE CANDIDATE / STAGED SQL / NOT ENABLED ON LIVE PREVIEW.**
Separate development feature branch `feature/colzo-preview-self-serve-pilot-20261102` based on existing draft PR #65. No Production changes, customer invitations, account creation, real-data access, paid service, API provider call, PR merge, privileged SQL application or environment flag change in this implementation.

## Intended participant flow

A prospective business opens the already prepared Vercel shareable Preview URL (no separate Vercel account needed), selects **Create business account**, reviews the Colzo legal terms, enters an email and password, verifies that email through Supabase, signs in, creates a business name/type, and receives an automatically activated **336-hour (14-day)** free trial with its own business membership and public route.

This removes the **operator's manual approval** of each new pilot signup. It deliberately **does not remove** the user's own sign-in, verified email, MFA requirements for owner actions, Colzo business membership checks, active/expiry grant checks, DPA acceptance, tenant isolation, paid-provider restrictions or legal consent. Existing older business pilot accounts retain their current grants and original natural expiries. Existing customer contacts should not be imported until the security and data-return/erasure gates are satisfied.

The limited offer supports Starter-equivalent core functions and **manual** Marketing drafts only; live AI Marketing generation, telephone calls, paid billing, payments and social publishing remain out of scope.

## Safety model and implementation

- `COLZO_SELF_SERVE_PILOT_SIGNUP=true` is **disabled by default** and only effective when `COLZO_SCOPED_PILOT_ACCESS=true`, Vercel environment is Preview, project matches the exact **Business-AI-Dev** URL `https://mvwseobgkexzpmmkgcxe.supabase.co`, tenancy/frontend auth is enabled, billing is disabled, and no paid AI provider API key is configured. Any missing or mismatched prerequisite falls back to **approval required** (no self-service provisioning).
- The public config only advertises self-service when those conditions pass, not because of a query parameter or a browser claim.
- The existing Supabase Auth signup and account recovery remain intact. First-owner onboarding POST must have a server-verified Supabase session and **no existing business membership**.
- The new database RPC `public.create_colzo_self_serve_pilot_workspace` is service-role only. After rechecking verified email, it uses the original first-owner business writer, inserts the active 336-hour grant and an immutable award ledger **within the same transaction**. An exception rolls back everything. No client-chosen tenant, trial start/end, privileged role or paid entitlement enters the RPC.
- Trial awards are **one per account** and the public pilot cohort is capped at **five total designations**, including existing fictional pilot grants, through an advisory lock held across each new registration. The cap counts historical designated grants, not just active grants.
- Self-service referral awards are temporarily disabled, to avoid granting rewards through a workflow not included in the atomic procedure. All existing, non-self-service referral behavior is unchanged.
- The original `requireBusinessMember` and `assertScopedPilotWorkspace` checks continue to enforce tenant membership, expiry, revocation and selected paid/provider restrictions.
- This does not claim anti-bot immunity: configure Supabase email confirmation, abuse/rate controls and monitor signup traffic. The hard cohort cap reduces exposure but does not eliminate bot or account-storage usage.

## Requirements BEFORE enabling real signups

1. Complete the full CI and native isolated PostgreSQL tests on the exact feature SHA. Review any failures, especially SQL, auth/RLS, frontend code and previous pilot tests.
2. Finish live authenticated trial GO gates from PR #65: protected booking-conflict denial, independently verified MFA/AAL2, two issued-session tenant isolation, revoked-session replay denial and the original fixture natural-expiry observation. Do not substitute synthetic tests for live acceptance.
3. Complete operator legal/data/lifecycle acceptance for genuine business information. A draft addendum is not a signed DPA. Verify monitored support and a lawful, rehearsed whole-tenant data return/deletion plan before collecting customer records. Keep original grants unchanged.
4. Separately approve installation of `SELF_SERVICE_PILOT_PREVIEW.STAGED.sql` on Development **only** after reviewing SQL ownership, roles, dependencies and current project schema. Never apply on Production. Rehearse rollback on disposable DB first.
5. Separately approve deployment of the exact CI-passing feature SHA to the existing Vercel **Preview** target only, verify project/team/branch, `target=null`, Dev project ref, no paid provider permissions, and no Production promotion.
6. Enable `COLZO_SELF_SERVE_PILOT_SIGNUP=true` **only in the explicitly approved isolated Preview** after the new RPC has been installed and accepted. Verify the config changes from `approvalRequired:true` to `approvalRequired:false,selfService:true`.
7. Use a new genuine test user with its **own email verification and MFA** to confirm end-to-end: no pre-existing membership; sign up, verify, create one workspace, inspect exact 336-hour grant and membership, finish legal DPA, exercise own records and reject foreign/anonymous access. Verify duplicate registration, capacity exhaustion, expiry and revoke denial. No paid provider calls.
8. Only then circulate the one-year Vercel shareable Preview link to real businesses. Inform them about the restricted features, prerelease/recovery risks and data handling. The Vercel share link is a bearer bypass for the **Vercel outer login only**, so don't mistake it for Colzo account access.

## Rollback

Set `COLZO_SELF_SERVE_PILOT_SIGNUP=false` on the isolated Preview; confirm `approvalRequired:true` and new POST denied with `PILOT_PROVISIONING_MANAGED`. **Do not revoke or alter existing 336-hour grants or delete tenant data as an implicit rollback.** Keep active participants' authorised data/lifecycle obligations and original scheduled natural-expiry acceptance intact. Revoke individual grants only through separately authorised, audited operator procedure.

Do not silently add or merge this code into the existing draft PR #65 without reviewing the ongoing pilot acceptance work.
