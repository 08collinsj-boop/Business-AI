# Colzo isolated SQL staging check — executable guide

This is the **no-cost, memory-only SQL test** for the unreleased Colzo Projects, Clients and Quotes schema. It uses simulated businesses/enquiries only. **It does not connect to Supabase** and cannot access the live Business AI database.

## Run without changing production dependencies

Requires Node.js 20+ and a network connection for the optional initial package download. For a normal development machine:

```sh
npm install --no-save --no-package-lock @electric-sql/pglite@0.3.15
npm run verify:colzo-sql
```

For an isolated test setup, install PGlite under a temporary folder and use a `NODE_PATH` pointing at that folder's `node_modules` before running `npm run verify:colzo-sql`. Do not put Supabase credentials in environment variables for this check.

## What it verifies

The script runs a local PostgreSQL 17.5-compatible engine, creates only a minimal `businesses` / `leads` fixture schema and two fake business identities, then applies the **exact** `supabase/migrations/20261012235500_add_colzo_projects_quotes.sql` file. It checks:

1. The migration is valid SQL and repeatable without losing records.
2. All three Colzo tables enforce RLS, and `anon`/`authenticated` do not have direct table read/write privileges; the trusted service role does.
3. Direct attempts to SELECT/INSERT as `authenticated` fail.
4. Foreign keys reject projects and quotes linked to enquiries from another business.
5. Bad progress, project status, quote amounts and client names are rejected by DB constraints.
6. Legitimate internal quotes persist the exact GBP amount and start as drafts.
7. Atomic version-checked updates refuse stale requests and cross-business changes; valid rows remain after rejected mutations.

The database exists entirely in memory and closes after the run. No test data is exported.

## Limits and remote staging release gate

This local PostgreSQL-compatible test **does not establish production readiness** or substitute for real Supabase branching, a restorable backup, role-based API acceptance and browser QA. Creating a hosted Supabase project or development branch requires a separate cost check and user-approved billing. The currently accessible production-like Supabase project holds real original Business AI accounts despite its `Business-AI-Dev` display name. **Never reset, rebase or repoint that project's data or production keys as a shortcut.**

Full protected release conditions: `docs/COLZO_PROTECTED_WRITE_RELEASE.md`.
