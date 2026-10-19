# Colzo - synthetic two-business isolation matrix, 19 October 2026

**Environment:** existing draft PR #26, \`feature/colzo-complete-ui-motion-20261017\`. No new account or Supabase data writes. No spend, Production, external communications, UI changes or merges.

## Checks performed

Created \`tests/colzo-two-business-matrix.test.mjs\` with two distinct fixture users and business memberships. Each request passes through the real \`lib/colzo-records-handler.js\` and existing \`lib/auth.js\`; all upstream Supabase Auth/PostgREST responses are simulated via the test runner. No real JWTs or credentials are accessed.

For each of **Customers, Projects and Quotes**, the test confirms:
- Two independently authenticated identities see only their own tenant's list.
- Direct GET of another tenant's record returns 404, with a tenant-restricted database query.
- Direct PATCH of another tenant's record returns 404 without a database write.
- A member cannot create or edit records (403), including in their own tenant.
- Attempts to supply a foreign \`business_id\` in a POST fail validation before any insert.
- An authorised own-record update includes business ID, record ID and \`expected_updated_at\` as atomic PostgREST predicates.

For Quotes, an extra test confirms a foreign business's enquiry ID cannot be linked to a quote (400, no insert). The existing protected-write suites additionally cover stale 409 responses, sent/accepted quote immutability, and optimistic concurrency.

**Result:** 19 synthetic two-business cases passing. Full repository verification: 845 tests passing, zero failures. This verifies the handler's access rules against simulated responses, not actual PostgREST RLS enforcement or browser persistence.

## Read-only Dev metadata audit

Queried Business-AI-Dev system catalogue only, **not business records**:
- \`colzo_clients\`, \`colzo_projects\`, and \`colzo_quotes\` all have row level security enabled.
- Each has zero client-facing policies. This matches a server-only route design with service-role requests, which still must enforce business membership and tenant predicates in application code. Do **not** enable permissive direct-client policies without a tenancy design review.
- \`business_memberships\` and \`leads\` have RLS and a policy.
- Current Supabase Security Advisor shows \`rls_enabled_no_policy\` (informational) and \`auth_leaked_password_protection\` (warning). The second item is a launch security decision. No paid upgrades or console settings were changed.

References:
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Still BLOCKED / UNVERIFIED

- True **two-account** authenticated Dev browser test using separate *authorised synthetic* accounts and businesses.
- Multi-business owner switching and role changes under independent real sessions.
- Real persistence, repeat reload and direct API access for Customers/Projects/Quotes after cross-tenant attempts.
- Enquiries, Bookings, Actions, Marketing and Knowledge acceptance in the latest Preview with synthetic inputs.
- MFA recovery, independent backup/restore and legal operator approval.

Do not create extra Auth accounts or mutate existing business/customer records automatically. Let the owner authorise any required identity creation in a secure Work browser. Public launch remains **NO-GO**.
