# Colzo connected workspace: first ClickUp vertical slice

**Status (12 November 2026):** implementation for review; **NOT** a live-connected or approved external pilot.

**Design direction:** desktop is the main operating workspace. Mobile remains a focused "Business on the Go" experience with its existing five primary tabs. ClickUp can be reached from More and tool search.

## Scope completed in the branch

- Desktop command-centre ClickUp briefing (explicit Refresh to retrieve current permitted tasks, page-scoped counts and escaped task titles; unchecked connection is distinct from disconnected), desktop sidebar ClickUp navigation and a native responsive task page.
- ClickUp OAuth initiation with strong, single-use state, secure callback cookie and business/actor verification.
- AES-256-GCM encrypted ClickUp OAuth token storage; tenant UUID is authenticated additional data.
- Authenticated read-only workspace status and task retrieval. Users only see tasks available to the authorised ClickUp identity.
- Limited task create/update with user approval, workspace membership checks, server-side list discovery, fresh task snapshot checks and confirmed provider responses. Read-only members cannot see enabled create/edit controls.
- Explicit disconnect, audit summaries and error/reconnection states. After a provider error, Colzo hides stale tasks; owners/admins can reconnect or disconnect. Create-task network uncertainty displays an anti-duplicate warning. All ClickUp refresh, switch, page, and disconnect routes preserve edited task forms behind the existing unsaved-changes confirmation.
- A grounded **rules-based** overdue/next-48-hours briefing. This is **not yet a multi-app generative AI agent**.
- Feature disabled by default; cannot be enabled outside this branch's protected Development Preview against the approved Development Supabase project.

**Deliberately not claimed:** app-wide AI tool calling; Gmail/calendar connections; cross-app task coordination; full ClickUp feature parity; live OAuth completion; authenticated visual acceptance; database migration applied; production release.

## Code map

| Path | Responsibility |
| --- | --- |
| `lib/clickup-provider.js` | ClickUp authentication, encryption, API calls, validation and task summaries |
| `lib/clickup-storage.js` | Server-only Supabase storage for the ClickUp connection |
| `lib/clickup-handler.js` | Tenant-authenticated connect, status, tasks, approved writes and disconnect |
| `lib/clickup-callback-handler.js` | OAuth state consumption, authorisation checks and encrypted persistence |
| `supabase/migrations/20261112013500_add_clickup_connections.sql` | Proposed state/connection storage with RLS and server-role-only access |
| `api/operations.js` and `vercel.json` | Existing Vercel function router and public ClickUp routes |
| `assets/colzo-native.js` | Existing native Colzo navigation and ClickUp workspace UI |
| `assets/colzo-connected-workspace.css` | Desktop-first responsive styling |
| `index.html` | Loads connected-workspace CSS and adds the desktop sidebar route |
| `tests/clickup-*.test.mjs` | Provider, API, authentication, native layout and release-gate coverage |

## Required authorisation before a real demonstration

1. Create a **Development-only** ClickUp OAuth app in a ClickUp workspace the operator controls. Configure its redirect URI as `https://<protected-preview-host>/api/clickup-callback`. Do **not** publish a secret in an issue, commit, log or browser.
2. Review and approve the exact SQL in `supabase/migrations/20261112013500_add_clickup_connections.sql` before applying it to the **existing Development Supabase project only**. No SQL has been executed from this PR.
3. Configure server-only encrypted environment variables scoped **only** to `feature/colzo-connected-workspace-20261112` on its protected Vercel Preview: `CLICKUP_INTEGRATION_ENABLED=true`, `CLICKUP_CLIENT_ID`, `CLICKUP_CLIENT_SECRET`, `CLICKUP_REDIRECT_URI`, `CLICKUP_TOKEN_ENCRYPTION_KEY`. Keep all privileged Supabase settings branch-only and do not copy PR #76's configuration without separate authorisation.
4. Sign into the actual native Colzo Preview with an authorised Development user and MFA. Use a fictional ClickUp test workspace and tasks.
5. Authorise ClickUp, verify the connected workspace name and task list, edit a task and confirm in ClickUp, create a task and confirm in ClickUp, refresh both views, revoke access/disconnect and verify a fail-closed state.
6. Independently verify the full desktop, mobile, permissions, rollback, security and operational pilot acceptance gates. Preserve PR #76 draft.

## Focused verification

```bash
node --test tests/clickup-*.test.mjs
node --check lib/clickup-handler.js
node --check lib/clickup-callback-handler.js
node --check assets/colzo-native.js
```

When dependencies are available, also run the repository's full `npm test`, `npm run verify:local`, `npm run build`, and authenticated desktop/mobile browser smoke tests. The source contract tests do not replace a verified ClickUp OAuth flow or browser test.

## Known MVP boundaries / next implementation

- OAuth initially selects the first authorised ClickUp workspace; owners can choose between other authorised workspaces. Workspace selection remains subject to real browser acceptance.
- Create-task list selection fetches authorised ClickUp Spaces, folderless Lists and folder Lists. Empty lists and explicit list-refresh are supported. Discovery is intentionally bounded to four Spaces, twelve Folders and one hundred Lists; larger workspaces may need more navigation.
- Task display uses a paginated list of 100 open tasks per page (currently up to 21 pages), and statuses are entered using the names configured in ClickUp. Counts refer to the current page, not the whole workspace.
- Task updates check the previously displayed title and status against a fresh task snapshot before writing. ClickUp does not offer an atomic task version compare-and-swap in this implementation; idempotency on ambiguous create failures requires further work before wider rollout.
- Add cross-app AI retrieval/action tools **after** independent security acceptance, with grounded answers, explicit action approvals, auditable scope and usage limits.
- Live business data is prohibited in this Development test environment; privacy/processing disclosures must be reviewed before use with actual customers.

## Go / No Go

**NO-GO for an external pilot** until the full Colzo acceptance suite passes and the provider registration, migration approval, branch-only credentials and authenticated browser verification are complete. This PR does not change Production, billing, current pilot activation or existing draft PRs.

