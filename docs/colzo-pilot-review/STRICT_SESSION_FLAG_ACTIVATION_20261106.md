# Exact Development strict-session activation package — prepared, not applied

## Target and exact change

Vercel team `team_rCWQ41TMWjGseuzS4IDTsbZ4`, existing project
`prj_d5DuC65u4hSITFRC54ygswiMW9ST` (`business-ai`), **Preview only**, branch
`feature/colzo-preview-self-serve-pilot-20261102`. Runtime Supabase must remain
Development `mvwseobgkexzpmmkgcxe`.

Create exactly one encrypted branch-scoped variable using
`VERCEL_ADD_ENVIRONMENT_VARIABLE`, with the exact arguments in
`STRICT_SESSION_FLAG_ACTIVATION_20261106.PROPOSED.json` (compact sorted-key UTF-8,
no trailing newline). No upsert and no other environment settings:

`COLZO_PREVIEW_STRICT_SESSION_REPLAY=true`.

Exact package SHA256:
`2dd704ebb0291f0737a6af750b861371fb37346d3c486e90824fc514848de703`.

Applicable `lib/auth.js` source SHA256:
`37827500195381f040733cfe3e69c571f9a2d00bc6687e6b391ff8f0bf962c42`.

After approval, independently re-read scope/absence, check exact source hashes,
create without overwrite, then deploy the exact already-verified replay-test
candidate commit on the same protected Preview branch. Record that SHA and new
deployment ID in the execution comment before treating configuration as active.
No Production deployment or configuration change is included.

## Read-only prerequisites actually checked

- Exact branch and all-project environment metadata: no existing variable with
  this key; values were not decrypted or published.
- Existing installed `public.colzo_preview_session_active(uuid,uuid)` is owned
  by postgres, SECURITY DEFINER, empty search path. Service role EXECUTE true;
  anon/authenticated EXECUTE false. Authenticated/service roles have no direct
  SELECT privilege on `auth.sessions`.
- Installed RPC's separately approved original SQL package fingerprint:
  `ccaae397a9b52368d0f56fa9340f63629a1db67a3d51f6bfc06817cebb880eff`.
  No new SQL installation, function ownership or grants are requested here.
- Actual issued owner AAL2 normal APIs and one-direction tenant/foreign-ID reads
  passed on runtime9e11949e (PR #65 comment6696774615).
- Exact-source native PostgreSQL/replay tests previously pass. Live logout replay
  is a separate execution; do not infer its result merely from disabled flag state.

## Expected effect and verification

For the scoped Development Preview, the existing verifier first checks the token
with Supabase Auth, then validates verified sub/session claims and calls the
restricted RPC. Revoked/missing sessions return401; unavailable/unexpected RPC
responses fail closed. Valid independent sessions should remain usable. No JWT,
factor, password or grant is changed by enabling this flag.

After deployment: genuine AAL2 positive API/direct reads; actual local logout;
retained, still-unexpired token rejection; independent session preservation and
newly issued fresh-session access. Outage acceptance still needs a separately
controlled, authorised real validation-unavailability test. No mock is counted
as live outage proof. Keep signup disabled and pilot NO-GO until all gates pass.

## Rollback procedure and remaining risks

Record the new environment-variable ID. To reverse configuration, remove only
that exact new branch-scoped variable after checking its current identity/scope,
then redeploy an explicitly identified protected Preview source; do not restore
an old full environment export or change other keys. Once protection is active,
reversing it weakens replay protection and requires explicit instruction. Keep
all public signup/activation off and retain the NO-GO state throughout rollback.

Risks: one additional backend RPC verification per authentication check, added
latency/free-tier usage, and deliberate loss of workspace access if validation
becomes unavailable. Existing sessions could be rejected if Auth/session state
is inconsistent; actual fresh-session acceptance is required. No additional
spending/upgrades permitted. Two-way tenant, role and QA AAL2 gates remain separate.

## Exact requested approval (only when live execution establishes next step)

> Approve package 2dd704ebb0291f0737a6af750b861371fb37346d3c486e90824fc514848de703:
> create COLZO_PREVIEW_STRICT_SESSION_REPLAY=true only for the named Development
> Preview branch, then deploy its exact verified candidate and run live session
> acceptance. Preserve all other settings, SQL, Production and disabled signup.

**NOT APPLIED. This document is a reviewable proposal, not owner approval.**
