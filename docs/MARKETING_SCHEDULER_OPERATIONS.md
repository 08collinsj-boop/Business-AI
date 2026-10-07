# Marketing scheduler operations

Status: live Pilot architecture verified 7 October 2026.

## Purpose

Business AI stores durable Marketing automation/publication state in Supabase. The scheduler endpoint does not blindly create a post every time it is called. It evaluates due work and uses database claims/idempotency before generation/publishing.

Endpoint:

`POST https://business-ai-pilot.vercel.app/api/marketing-scheduler`

Authentication:

`Authorization: Bearer <MARKETING_SCHEDULER_SECRET>`

Never store the bearer secret in source, browser code, logs or this document.

## Live triggers

### Primary: Supabase hourly trigger

The Pilot currently has an active `pg_cron` job named:

`business-ai-marketing-scheduler-hourly`

Schedule:

`0 * * * *`

It calls the protected Vercel endpoint through `pg_net` and reads the bearer value from Supabase Vault under:

`business_ai_marketing_scheduler_secret`

The secret value itself is not source-controlled.

The required `pg_net` extension state is represented by:

`supabase/migrations/20261005221447_enable_pg_net_for_marketing_scheduler.sql`

### Fallback: Vercel daily cron

`vercel.json` contains:

- path: `/api/marketing-scheduler`
- schedule: `0 8 * * *`

This is a resilience fallback, not the only scheduling trigger.

## Why two triggers do not mean two posts

Both triggers call the same scheduler implementation. The implementation:

- evaluates tenant automation configuration and due times;
- atomically claims durable work;
- uses publication/generation state and idempotency protections;
- refuses unsafe/ambiguous automatic retries where duplicate external publishing cannot be ruled out.

Do not add another scheduler merely because both triggers exist.

## Read-only verification

Useful checks after deployment:

- Vercel: confirm the latest Pilot deployment is READY and `/api/health` is 200.
- Supabase: inspect `cron.job` and confirm exactly one active `business-ai-marketing-scheduler-hourly` job.
- Supabase: verify the Vault secret record exists without printing its decrypted value.
- Database: inspect `marketing_automation_settings.last_run_at`, `last_status`, `last_error_code` and durable publication rows.
- Runtime logs: inspect `marketing-scheduler` events and provider errors without logging customer content or credentials.

## Re-provisioning rule

The cron job is environment configuration because it references an environment-specific Vault secret and public endpoint. Before creating or replacing it:

1. confirm no active job with the same purpose already exists;
2. confirm `pg_cron` and `pg_net` are available;
3. create/rotate the Vault bearer secret outside source control;
4. configure exactly one hourly job to call the Pilot endpoint;
5. test when no work is due, then inspect runtime logs;
6. keep the Vercel daily cron as fallback.

Do not hard-code the scheduler secret into a SQL migration.
