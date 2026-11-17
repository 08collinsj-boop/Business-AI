# COLZO — connected-app integration readiness and failure acceptance
**16 November 2026. Internal specification and synthetic-test handoff; no OAuth/provisioning approval or live-provider evidence.**

## Architecture rule
Colzo is a workspace, not a silent replacement for third-party tools. For an integration-focused pilot, ClickUp remains source of truth for ClickUp tasks; LeadConnector remains source of truth for the pilot's **enquiries, customer management, appointments and internal operations** (not assumed to be its marketing system). Colzo should display authorised context, propose useful actions, request explicit confirmation and record outcomes.

## ClickUp — current source behaviour and controlled acceptance
- `clickupConfig` is disabled unless the **exact approved** Development Preview branch/project and all server-only secrets are configured. DO NOT turn on as part of this document.
- OAuth authoriser identity owns the encrypted credential; a Colzo team member/other admin cannot borrow that ClickUp identity.
- Write actions require `approved===true`; source provider snapshot checks prevent stale updates and forged lists.
- PR #79's source hardening denies foreign connection rows, prevents non-owner disconnection and requires persisted actor/workspace/sealed-token confirmation before OAuth success. **No real provider OAuth test has passed.**
- “Disconnect” deletes Colzo's stored credential; it does not automatically prove ClickUp's provider-side grant is revoked.

### Failure matrix: exercise with fictional provider responses only
| Fault | Expected API/UI outcome | Readiness evidence |
| --- | --- | --- |
| 401/403 revoked or expired provider token | Safe reconnect indication, no task success or token leakage | Mocked provider 401/403 and an eventual approved live provider test |
| 429 provider rate limit | Explain a retry is needed; do not pretend there are zero tasks | Mocked 429; limited retries, no blind task-create retry |
| Network timeout / fetch rejection | Safe unavailable result; keep unsaved user input and unknown-status warning for ambiguous writes | Mocked network rejection and pending form state |
| Provider 5xx / invalid JSON/tasks shape | No false connected/current tasks; no external body leakage | Mocked provider failures |
| Foreign/malformed storage result | No workspace name, token or task disclosure | Red/green PR #79 tenant-row test |
| Stale expected task title/status, or workspace version | 409, no writes; ask to refresh | Synthetic task and workspace races |
| Owner vs non-owner disconnect | Only owner may remove the business connector; external grant may still require provider revoke | PR #79 owner/admin/member test |
| Persisted OAuth row mismatches actor/workspace/encrypted token | Callback 503, no success audit | PR #79 red/green callback test |

**External provider acceptance:** C01–C12 in `docs/COLZO_CONNECTED_APPS_ACCEPTANCE_HANDOFF_2026-11-16.md` remain **BLOCKED**. OAuth SQL, scopes, token and provider settings require separately scoped approval and proof of Development recovery.

## LeadConnector — proposed read-only pilot proof
**Not an implemented connector.** First validate a consenting organisation's actual account edition/API rights, staff permissions, endpoints, data-processing roles and data ownership. Do not assume universal GoHighLevel/LeadConnector behaviour or credentials.

| Step | LeadConnector source record | What Colzo may display after permissions | Related ClickUp context | Explicit boundary |
| --- | --- | --- | --- | --- |
| A | Contact/enquiry | Name or alias, status and next step **only with user-authorised scope** | Related task by deliberately approved mapping | Do not backfill Colzo native CRM without approved design |
| B | Appointment | Date/time, assignee and current appointment status | Follow-up task on same workstream | Do not create a second Colzo booking or alter provider calendar |
| C | Internal case/task | Minimal status and responsible authorised role | ClickUp action reference | Never assume a provider user is a Colzo tenant member |
| D | Customer record correction | Show that source data changed and refresh | Reconcile with mapped task title | Read-only until approved writes with expected version/idempotency |

### Read-only prototype contract — do not implement provider calls yet
- Each provider row carries `source:'leadconnector'`, a provider-owned immutable ID, observed-at timestamp, a verified business scope, only permitted display fields and a source label in the UI.
- Cross-app joins require explicit tenant-bound mappings and user/record-level permission checks; ambiguous matches display “Not linked”, not guessed identity.
- A disconnected, expired or rate-limited provider displays **Unavailable / reconnect**, never empty-as-current or stale-as-live.
- Imported personally identifiable data must have minimum scope, lawful basis and retention decision. Do not use sensitive charity service-user information for demos or development tests.
- No background sync, no scheduled writes, no cross-provider action until owner + provider approval, audit/rollback strategy, idempotency contract and full data-exit plan.

## Approval/stop ledger
**Block** if the owner has not independently approved exact SQL, Preview secrets, access scopes, fictional workspace, support/privacy obligations, recovery receipt, eligible provider terms and participant consent. **No Production changes, charges or public pilot activation.** Next safe action is testing provider failures with local mock functions; next live action is permissioned OAuth/browser acceptance only after release-gate decisions.
