# Repository working rules

## Connected tools: Composio first
- For GitHub and any other connected-app operation available through Composio, discover and try the relevant Composio action first. Use the active Composio connection before trying a separate connector, browser workaround, direct API, or manual alternative.
- Read the tool schema and required arguments before writing. Prefer Composio for repository reads, branch/commit/PR operations, and status checks.
- If Composio fails or cannot perform the required action, record the exact limitation, then use another authorised connector only if available and safe. Never bypass an explicit safety block or claim an operation succeeded without confirmation.
- Keep the user informed of material blockers and verified results. Do not ask the user to reconnect an already-active Composio account unless the connection itself is confirmed broken.

## Colzo is the successor to Business AI
- Treat Colzo as the intended long-term replacement for Business AI, not as an unrelated throwaway product. Preserve existing business data, authentication, tenant boundaries, billing mappings, and functional customer workflows unless a separately approved migration explicitly changes them.
- Prefer native Colzo UI and tested feature parity. Do not reintroduce Business AI UI as an automatic fallback.
- Develop on a feature branch and reviewable pull request. Never merge, deploy to Production, change production aliases/secrets, run production migrations, or modify real customer records as tests unless the user explicitly authorises that exact release action.
- A shared backend or existing database is not disposable staging. Metadata checks are not proof of a restorable backup. Verify a safe staging environment, tested backup/restore and rollback, regression results, and authenticated acceptance before proposing a production cutover.
- No paid upgrades, new paid services, or cost-generating operations without explicit approval.

## Engineering quality and release gates
- For behaviour changes, follow test-driven development: add a regression test that demonstrates the defect, then implement the smallest fix and run focused and full suites.
- Keep changes scoped. Do not silently broaden a release into refactors or unrelated feature work.
- For Colzo record writes: tenant scope must be enforced server-side; PATCH requires the exact previously loaded `expected_updated_at`; updates must be atomic against that version and return HTTP 409 on conflict; DELETE is unsupported; quote status transitions and sent/final quote immutability must be enforced server-side.
- Report only tests and checks actually run. Build-rate limits are blockers, not permission to buy an upgrade.
