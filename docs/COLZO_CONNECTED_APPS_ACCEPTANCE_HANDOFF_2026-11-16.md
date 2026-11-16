# Colzo connected apps — unprivileged QA handoff and conditional live-acceptance matrix
**Prepared:** 16 November 2026 | **Scope:** draft PR #79 stacked on draft PR #78/#77 | **External pilot:** NO-GO
**Status:** INTERNAL, evidence preparation only. Not a live-provider acceptance record, implementation approval, customer-facing policy or credential request.

## Why this exists
Colzo's proposed ClickUp connector is an individually authorised tool within the desktop workspace, not an all-staff impersonation proxy or complete two-way synchronisation. A second, LeadConnector-based use case is still only a proposed design; no working LeadConnector connector is demonstrated here. External tools remain the source of truth. Keep real business data out of tests.

This handoff separates verified synthetic source tests from real authenticated tests that must remain blocked until exact operator approvals are recorded. Do not repeat the existing native SQL or 1,900+ Node test suites as substitutes for provider acceptance.

## Release preconditions — each requires an actual receipt, not verbal equivalence
1. Preserve draft/unmerged PRs #76–#79; verify the latest exact Git SHA and protected Preview deployment identity. Existing pending Development MFA invitations and Site URL must not be broken by a routine Preview redeployment.
2. Obtain the operator's explicit scoped approval for the proposed ClickUp SQL, privilege/secrets configuration and its target Deployment **separately**. The proposed migration is not presumed applied or approved.
3. Complete independent, privately held recoverability evidence for Development database, Auth/MFA, Storage object bytes, encrypted keys and rollback. The synthetic PostgreSQL restore job is **not** Development recovery.
4. Use an isolated, fictional ClickUp workspace whose owner consents to the OAuth scopes; no actual charity/employee/customer task data. Verify the exact grant and DPA/privacy/subprocessor position before enabling a connector.
5. Use legitimate owner/admin/member sessions and genuinely separate Business A and B identities with their own MFA factors; Gmail plus-aliases belonging to one mailbox do **not** prove independent inbox control.
6. Confirm effective runtime feature flags, access grant enforcement and deployment protection through supported private administration. Never bypass SSO, MFA or preview protection.

## Synthetic provider and API tests already available in source
- `tests/clickup-authenticated-api.test.mjs`: status redaction, per-owner OAuth task access, denial of inherited token access for staff/admins, explicit update approval, and additional foreign tenant / invalid Auth negative tests on the isolated QA branch.
- `tests/clickup-pilot-handler.test.mjs`: list discovery with zero tasks; explicit owner creation approval; denied member create/list; stale task title 409; forged list ID rejection; concurrent workspace switch 409.
- `tests/clickup-oauth-callback-acceptance.test.mjs`: mismatched, expired and replayed OAuth states; one-time consume; revoked actor membership before token storage.
- `tests/clickup-provider.test.mjs`: encryption tenant binding, provider response allowlisting, disallowed Preview/Production targets, provider error and rate-limit sanitisation.
- `tests/clickup-native-backup-restore.test.mjs` and the `pilot-verify.yml` isolated SQL job: migration/restore *mechanics with fictional PostgreSQL*, not live Development restore.

## Live browser/provider matrix — BLOCKED until all preconditions pass
| Case | Identity / action | Expected behaviour | Required evidence |
| --- | --- | --- | --- |
| C01 | Business A OAuth-authorising owner, account status | Connected state, selected workspace, available authorisations; **never** token ciphertext or bearer secret in DOM/API | Redacted response shape and screenshot |
| C02 | Business A owner, authorised lists and tasks | Only selected authorised ClickUp workspace; no invented or cached-as-current tasks | List/task IDs masked; provider response status |
| C03 | Business A member, try lists/tasks/create/update | Denied before provider task access, no inherited owner credential | HTTP status and redacted provider-call absence |
| C04 | Business A different admin, try existing owner's token | Status allowed as appropriate, task/list access denied until own authorisation | User identity separation receipt |
| C05 | Business B owner, forged Business A ID/connection | No Business A tasks, token, connection mutation, or cross-tenant disclosure | Tenant A/B denial evidence |
| C06 | Provider OAuth callback with wrong/used/expired state | Fail before token exchange; reused state never creates another connection | One-time-state audit, no raw state |
| C07 | Owner approved task create, duplicate retry on ambiguous response | Clearly confirmed outcome or explicit unknown/unsafe-to-retry status; no blind duplicate POST | Source task ID and masked audit receipt |
| C08 | Owner update with stale title/status or workspace version | 409, no overwrite, preserving unsaved form and retry instructions | HTTP and UI conflict evidence |
| C09 | Provider rate-limit, timeout, revoked token, provider 5xx | Fail closed and explain retry/reconnect; no false success or leaked credentials | Simulated provider test receipts |
| C10 | Disconnect/revoke | Colzo-side access removed. Independently check provider-side grant status; **never** equate DB disconnect with provider OAuth revocation | Both-side status and retention review |
| C11 | Pilot expired/revoked, AAL1, membership removed | No provider calls and no data read/write from protected workspace | Genuine session/role and negative API evidence |
| C12 | Accessibility and genuine iPhone Safari | Keyboard dialog, touch target, safe-area, modal, sign-out/re-auth and refresh pass | Device/browser/version; redacted screenshot |

Each case is `BLOCKED` until independently evidenced. Synthetic CI passes cannot convert any live case to PASS.

## LeadConnector — design-only pilot sequence
1. Confirm the pilot organisation's **actual** LeadConnector workflows and authority: enquiries, customers, appointments, internal operations. Do not assume LeadConnector is their marketing tool.
2. Treat LeadConnector as source of truth for those records; avoid shadow CRM or duplicated bookings in Colzo.
3. First build a **read-only** cross-app workspace concept: show an authorised LeadConnector contact/appointment beside the corresponding ClickUp task with explicit per-record provenance and permission filtering.
4. Then design permissioned actions with approval and audit, idempotency, provider errors, conflict reconciliation and disconnect handling. No automatic writes or real data access until approved.
5. Review privacy roles, contracts, scopes and participant consent before any external test. No LeadConnector OAuth/API, data sync or cross-app action is currently verified.

## Release gates and stop conditions
**Stop immediately** for any unexpected provider scope, missing OAuth/SQL approval, absent independent restore, ambiguous tenant owner, leaked secrets, failed MFA, forbidden session replay, stale Preview identity or cross-tenant data. Keep source tests on the isolated QA branch and preserve Production, billing, live customers and current protected Preview. Do not merge PRs or activate pilot. The final external GO decision requires separate actual W1/W2/W3 evidence, operational support, complete data exit, privacy/legal sign-off and participant consent.

## Evidence logging template (secret-free)
Case ID; exact SHA; Preview deployment ID; fictional workspace aliases only; browser/device version; pass/fail/blocked; redacted HTTP response/status; UI screenshot or artifact; executed by; UTC date/time; outstanding approvals. Never record passwords, auth tokens, OAuth codes/state, MFA secrets, private customer records or private home addresses in GitHub.
