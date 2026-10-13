# Colzo editable workflows: protected release checklist

**Status: HOLD — not authorised for live editing or Production deployment.**

## Why writes remain blocked

- Original Business AI's live account/data environment uses Supabase project `mvwseobgkexzpmmkgcxe`, despite its legacy name `Business-AI-Dev`. That project is **not** disposable development infrastructure.
- Read-only metadata checks on 13 October 2026 confirmed `colzo_projects`, `colzo_quotes`, and `colzo_clients` exist and have RLS enabled on that project. Metadata alone does **not** prove that backups can be restored, that all policies/integrations are correct, or that editing is safe.
- No independent Supabase development branches were listed during that check. The available integration has not established a restorable backup of the active database.
- The standard Colzo development login points to a different authentication project. The owner has separately verified the original credentials and three authorised enquiries through a read-only compatibility page; that is *not* approval to expose live writes in the preview.

## Changes implemented in code but not released

- Tenant-scoped server handlers for projects, clients and quotes, each gated by verified Supabase Auth and exactly one business membership; the server derives `business_id` rather than accepting it from the browser.
- Only three write methods are supported: create via POST and update via PATCH; there is no preview delete endpoint.
- Quote creation is always a **draft**. Sent/accepted/declined statuses require explicit allowed transitions. Existing sent/final quote terms and amounts are locked; a declined quote can be reopened as draft before revisions. Marking a quote as sent is a user-confirmed *record of manual sending* — not a customer email or payment event.
- All project, client and quote editing requires the record's exact `expected_updated_at` timestamp. Server-side atomic updates include that timestamp in the database predicate, to reject concurrent stale submissions with HTTP 409. Each successful update assigns a strictly later timestamp than the previous version, including rapid back-to-back edits. Project reactivation after completion requires lowering progress below 100.
- Owner edit forms and quote transition buttons supply the `updated_at` value obtained when the record was loaded, without relying on client-supplied business IDs.
- Mock PostgREST API acceptance tests simulate two separate businesses, create/update workflows, forbidden cross-tenant access, stale edits, initial/final quote status restrictions, and an audit-log redaction check. Sent/final quote contents are immutable and status transitions cannot change prices or notes in the same request. Tests use fake network responses and no customer data.

## Disposable database acceptance completed (13 October 2026)

- The exact Colzo Projects/Quotes/Clients migration passes on an isolated, **in-memory PostgreSQL 17.5-compatible PGlite engine** (no Supabase account, billing, customer data or credentials).
- Eleven SQL smoke checks passed: repeatable migration, all three RLS flags, public/member grants blocked, authenticated direct read/write denied, valid project creation, composite `(lead_id,business_id)` constraints, progress/status/currency/name validation, default private draft quotes, and atomic stale/tenant update predicates.
- Re-run using `npm run verify:colzo-sql` after installing `@electric-sql/pglite@0.3.15` as an optional local test tool. See `docs/COLZO_STAGING_SQL_QA.md`.
- The above **does not** replace a Supabase staging instance: it does not certify Supabase Auth configuration, service-role isolation, live RLS/grants beyond the supplied migration, Vercel secrets, backup/restore or browser authentication. No Supabase branch has been created and no production migrations have been run here.

## Release gates, in required order

1. Confirm exactly which active Vercel deployment and alias serve `app.getbusiness-ai.com`, `business-ai-pilot.vercel.app`, and the marketing/public site; record current Git SHA, environment target and rollback deployment ID.
2. Obtain a **restorable**, access-controlled database backup/snapshot of the original account/data system; test a restore into non-production infrastructure. Check Auth users, membership references, tenant boundaries, booking history, lead counts, Stripe mapping, marketing schedules and integrations with totals only, not exported personal data.
3. Provision an isolated staging Supabase project or paid development branch with no real customer records, its own Auth users and API keys; configure a separate preview Vercel deployment. Never reuse the live service-role key, production webhook secret, scheduled marketing tasks or review-email sender.
4. Apply migration `20261012235500_add_colzo_projects_quotes.sql` to staging **after checking its migration history and pre-existing schema**, to avoid duplicate/surprising changes. Exercise every CRUD lifecycle and conflict case using staging accounts for two separate businesses.
5. Run `npm run verify` (unit/regression/static), then `npm run verify:colzo-browser` (mock browser layout) with Playwright installed. Add authenticated staging UI tests for full Projects, Clients and Quotes, including validation, error states, mobile, tenancy and quote status handling.
6. Confirm UI copy and current legal/trading name, DPA/privacy, quote/VAT terms, secure MFA and access roles; verify that email, billing, marketing automation, scheduled publishing and Meta integrations remain in their intended safe modes.
7. Prepare timed change window, reversible Vercel deployment, DNS/domain alias plan, Supabase schema recovery plan and independent health checks. Explicitly approve production promotion only after all gates pass and business impact/rollback is understood.

**Never use the existing original-owner account as a destructive integration-test account.** The existing read-only Colzo preview and live Business AI application must continue to work during staging QA.
