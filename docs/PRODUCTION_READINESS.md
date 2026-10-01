# Production readiness — Pilot

## Scope

This checklist covers the controlled Business AI Pilot. Production remains a separate deployment and is not changed by Pilot readiness work.

## Operational visibility

- The shared operations dispatcher records structured Vercel log events for unhandled server errors, HTTP 5xx responses and slow requests.
- Logged fields are limited to operation name, HTTP method, status, duration, slow-request flag and error class. Request bodies, query values, headers, customer content and credentials are not logged by this layer.
- `/api/health` remains deliberately shallow and unauthenticated.
- `npm run load:smoke` provides a bounded, read-only smoke load against `/api/health` and optionally one public business route.

## Pilot UX regressions closed

- Dashboard receptionist status is obtained from the same public availability endpoint customers use.
- “Speak to someone” falls back to the business telephone route when the AI assistant is unavailable.
- Completed/cancelled Actions show an explicit status.
- A signed-in Customer account stays behind the loading surface until its authenticated portal request succeeds.
- An inactive Marketing add-on no longer offers an “Open Marketing” action that returns to the locked workspace.

## Database performance audit — 1 October 2026

The Pilot database is still very small, so current scan statistics do not represent future production traffic. A read-only Supabase audit found:

- `business_audit_events` is currently the largest application table by storage in Pilot, with only hundreds of rows.
- Supabase Performance Advisor reports 29 foreign-key constraints without a covering index.
- Several indexes are currently reported as unused, which is expected to be noisy with such a small Pilot dataset. They should not be removed solely from Pilot usage statistics.
- Core tenant lookups already show substantial index use on memberships, public routes, billing accounts, bookings and leads.

Before higher-volume public rollout, review the advisor’s unindexed foreign-key findings as a dedicated schema migration and validate them against realistic seeded data and query plans. Do not add or remove indexes merely to make the advisor count zero; measure the hot queries first.

## Load progression

1. Run the bounded smoke tool against Pilot after each readiness deployment.
2. Seed a non-production database with realistic tenant, lead, action, booking, audit and Marketing volumes.
3. Measure the actual list/filter/dashboard queries with `EXPLAIN (ANALYZE, BUFFERS)` on that non-production dataset.
4. Add covering indexes for demonstrated hot paths and foreign-key maintenance, then re-run Supabase Performance Advisor.
5. Increase concurrency gradually and stop on elevated 5xx rates or sustained latency rather than stress-testing the live customer Pilot.

## External monitoring

The repository now has safe server-side operational logging, but full browser crash monitoring and alert delivery still require an external monitoring destination. When a provider is selected, connect it without placing DSNs/tokens in source and keep personal/customer content out of error metadata.
