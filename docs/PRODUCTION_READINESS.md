# Production readiness - Pilot

## Scope

This checklist covers the controlled Business AI Pilot. The separate Production environment is not changed by Pilot readiness work.

## Current verification - 7 October 2026

- source test suite: 513 / 513 passing;
- local verification: 159 JavaScript files checked, with no secret-pattern or temporary-marker failures;
- live Pilot `/api/health`: HTTP 200;
- current live Pilot is Git-backed and no longer depends on the temporary one-off Marketing build patch;
- broad owner/Marketing text mojibake was repaired and regression-tested;
- Marketing generation uses `openrouter/free` with up to three attempts;
- provider identity/contact state is configured and the stale Settings blocker was removed;
- the applied `pg_net` scheduler migration is present in source control.

## Operational visibility

The shared operations dispatcher records structured events for unhandled server errors, HTTP 5xx responses and slow requests. It does not intentionally log request bodies, customer content or credentials.

`/api/health` remains deliberately shallow and unauthenticated.

`npm run load:smoke` is the bounded, read-only smoke-load tool for the Pilot.

## Scheduler

The Marketing scheduler has two triggers for resilience:

- Supabase `pg_cron`: hourly at minute 0;
- Vercel cron: daily at 08:00 UTC fallback.

Both call the same authenticated endpoint. Due selection and durable claims remain inside Business AI. See `MARKETING_SCHEDULER_OPERATIONS.md`.

## Database/security review

Supabase Security Advisor on 7 October 2026 reported:

- no HIGH/ERROR findings;
- WARN: leaked-password protection disabled in Supabase Auth;
- INFO: RLS enabled with no client policy on two incident-control tables. These are intentionally service-role-only and should not receive permissive browser policies merely to silence the advisor.

Performance Advisor still reports unindexed foreign keys and currently unused indexes. The Pilot dataset is too small to use those counts alone as a migration plan. Measure real hot paths against realistic non-production data first.

## Known technical debt

- Node runtime logs contain a `DEP0169` warning involving legacy `url.parse()` behaviour. No direct Business AI source use has been established yet; trace it to the responsible runtime/dependency before treating it as an application security defect.
- Browser crash monitoring/alert delivery still needs an external monitoring destination if required for wider rollout.
- Managed backups/PITR and an isolated restore drill remain post-launch P1 for the supervised Pilot.

## Commercial gate

The Vercel team is currently Hobby. Paid/commercial launch is blocked until a suitable commercial hosting plan or provider is explicitly approved.

## Production

Do not promote the Pilot deployment, Pilot migrations or Pilot credentials into the separate Production environment without explicit approval and the Production rollout checklist.
