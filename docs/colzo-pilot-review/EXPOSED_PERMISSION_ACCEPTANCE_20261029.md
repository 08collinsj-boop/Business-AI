# Independent exposed-permission checkpoint — 29 October 2026

**Scope:** Business-AI-Dev `mvwseobgkexzpmmkgcxe` only; read-only PostgreSQL catalog inspection and Supabase Security Advisors. The existing PR #65 remains draft and the approved Preview application runtime remains `adecce31b88f5c1ffd623480524996cb5ae91581`. This checkpoint does **not** establish secure real-business pilot readiness.

## New executed read-only checks

1. Queried exposed `public` and `graphql_public` relation catalog for `anon`/`authenticated`-selectable views/materialized views that lack the `security_invoker=true` option. **No matching objects returned** (the inspected accessibility condition only; not a blanket claim about all views).
2. Queried the same exposed schemas for `SECURITY DEFINER` functions with effective `EXECUTE` permission for either `anon` or `authenticated`. **No matching objects returned**.
3. Queried all RLS-enabled, no-policy ordinary tables in `public` and `colzo_pilot_private`, verifying effective SELECT/INSERT/UPDATE/DELETE for `anon` and `authenticated`. **Six tables returned; all eight effective privileges false for each**: `colzo_pilot_private.audit`, `colzo_pilot_private.invitations`, `public.colzo_pilot_access`, `public.customer_complaints`, `public.pilot_free_access_config`, `public.platform_incident_controls`. This is fail-closed for direct Data API access under these roles, and does not by itself validate server-side service-role authorization.
4. Broader check for exposed regular/partitioned tables with `anon`/`authenticated` DML permissions but no RLS: **no matching objects returned**.
5. Private `SECURITY DEFINER` routine exposure check found exactly **one** authenticated-callable routine: `colzo_pilot_private.workspace_read_allowed(p_business_id uuid)`. Its configured search path is empty. Definition inspection showed it verifies non-null `auth.uid()`, a matching `public.business_memberships` row for the same business and user, and denial when an existing pilot grant has invalid status/activation/expiry/duration. Its role is an intentional RLS policy helper. This is **static/catalog review**, not proof of issued-JWT, tenancy or revocation enforcement.

All SQL statements used `BEGIN READ ONLY` followed by SELECT-only catalog reads and `ROLLBACK`. No application row payloads, credentials or token values were selected. Reusable read-only query source: [EXPOSED_PERMISSION_CHECK_20261029.READONLY.sql](EXPOSED_PERMISSION_CHECK_20261029.READONLY.sql). The script was written and independently read back to GitHub. Its individual catalog predicates were run against Development; the combined committed script has **not** been executed as a single SQL-Editor file, so it is not credited as an exact-file execution.

## Supabase Security Advisors

Fresh security advisor output included six `rls_enabled_no_policy` informational findings matching the six deny-all tables above, plus one **WARN**: `auth_leaked_password_protection` (disabled).

- These six no-policy tables are not evidence of a direct anon/authenticated DML exposure in this inspection.
- Leaked-password protection **remains disabled**. Do not modify Auth settings under this read-only authorisation; prepare and separately approve a bounded Development Auth configuration change if appropriate.
- Official remediation details: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection and https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

## Boundaries and outstanding gates

- Live independently authenticated QA MFA/AAL2 and DPA acceptance have **not** been completed. A prior QA recovery request was accepted by Auth, but no private password reset completion is evidenced.
- Foreign-ID API reads/writes, real issued-JWT business-ID replay, AAL1 denial/AAL2 success on protected operations, and post-revocation denial remain unverified.
- A native synthetic corrected revoke passed previously but shared Development revoke requires separate exact-change approval after prerequisites.
- Natural live expiry remains pending after the original 10/11 November deadlines (existing read-only 12 November follow-up, do not duplicate).
- Full real-source backup/Auth/Storage recovery, live deletion, operator/support/legal decisions and lifecycle commitments remain incomplete.
- No app-code change was made; existing regression test counts and prior acceptance results are retained, not rerun or represented as new execution.

**Decision:** fictional demonstration usable; secure 14-day real-business pilot remains **NO-GO**. No Production, deployment, branch merge, grant, permissions, MFA, account, billing, records or Auth settings modified by these checks.
