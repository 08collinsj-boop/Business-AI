# Colzo ClickUp connected workspace — pilot readiness

**Status (12 November 2026): development only. Not an authorised external pilot release.**

## Product experience

Colzo is a desktop-first business operating workspace. ClickUp tasks appear in a native desktop split-view with priority counts, task list and an inspector/editor. Mobile remains Business on the Go: the existing five tabs are preserved; ClickUp is accessible through More and tool search. ClickUp remains the system of record.

## Implemented

- Secure OAuth connection start and callback with cryptographically random 10-minute state, HttpOnly cookie and single-use state records.
- Tenant-bound encrypted tokens with AES-256-GCM, service-role-only credential storage and authenticated account APIs.
- View ClickUp task list and a grounded overdue/upcoming summary.
- Owner/admin-only task create and update, requiring an explicit confirmation and verified provider response; audit events recorded on successful changes.
- Scoped pilot restrictions, connection status, disconnect, rate limit, error and unavailable states.
- ClickUp endpoints are routed through the existing operations dispatcher to remain within the Hobby twelve-function deployment ceiling.
- Responsive Graphite & Volt task workspace.

## Release dependencies — do not skip

1. Register a Colzo OAuth app in ClickUp and obtain its client ID and secret.
2. Independently approve, safely apply and validate the exact Development-only migration in supabase/migrations/20261112013500_add_clickup_connections.sql. This migration has NOT been run.
3. Configure ONLY an authorised, deployment-protected Development Preview branch, with server-only environment variables:
   - CLICKUP_INTEGRATION_ENABLED=true, once all prerequisites have passed (default false)
   - CLICKUP_CLIENT_ID
   - CLICKUP_CLIENT_SECRET
   - CLICKUP_REDIRECT_URI, exact HTTPS Preview URL ending /api/clickup-callback
   - CLICKUP_TOKEN_ENCRYPTION_KEY, 32 secure random bytes encoded as 64 hex characters
4. Do NOT reuse the separately approved privileged PR #76 Supabase server key. A new branch needs its own explicit authorisation.
5. Obtain a fictional QA ClickUp workspace and a valid approved Colzo test workspace with genuine MFA and pilot eligibility.
6. Run real browser OAuth and task read/create/update/disconnect tests, token revocation, cross-tenant security checks, expired/replayed OAuth state checks and authenticated desktop/mobile visual QA.
7. Run the complete repository build and regression suite and obtain the operational, consent, privacy/DPA, retention and support sign-offs.

## Known product limits

- The first authorised ClickUp workspace is selected initially; authorised workspaces can be switched within Colzo.
- The native task list supports pages of 100 open tasks, up to 21 pages; the counts refer to the currently viewed page.
- Creating a task uses list IDs obtained from existing visible tasks. Empty lists need a dedicated list-discovery flow.
- The ClickUp briefing is rules-based, not a generative or autonomous AI agent.
- Disconnect removes Colzo's credential; provider-side revocation should also be performed in ClickUp.
- No live connection, authenticated screenshot, external company demo, full-build acceptance or end-to-end security proof has been completed.

## Verification

Focused provider, API and native-contract tests passed in an isolated Node runtime (27/27). New API and native JS passed Node source syntax checks. The complete existing regression suite could not be executed in that runtime because its package dependencies were not installed.

**Pilot result: NO-GO pending the release dependencies.**

