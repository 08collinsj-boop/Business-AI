# Pilot operations and launch monitoring

Last verified: 5 October 2026.

## What is monitored

Business AI already emits privacy-safe operational events for slow/failed `/api/operations` requests. The Pilot database now also provides `public.get_platform_ops_snapshot()` for an aggregate launch view without returning customer content or identifiers.

The snapshot covers:

- enquiries created in the last 24 hours;
- Marketing generation counts and statuses in the last 24 hours;
- Marketing publication counts, statuses and failure codes in the last 24 hours;
- Marketing image usage events in the last 24 hours;
- billing/allowance usage grouped by metric over the last 31 days;
- active Business Knowledge items and items awaiting review.

The database function is deliberately executable only by `service_role` and `postgres`. It is not available to `anon` or authenticated customer/business sessions.

## Operator check

From an authorised Supabase operator session, run:

```sql
select public.get_platform_ops_snapshot();
```

Investigate any unexpected 5xx response, repeated Marketing failure, unexplained allowance spike, or sustained slow request. The existing operations wrapper logs requests at 5xx or above and requests over the configured slow threshold without including request bodies or customer data.

## Runtime log review

Vercel runtime errors should be reviewed during launch certification and after deployments. On 5 October 2026 the review identified two useful signals:

- repeated Node `url.parse()` deprecation warnings across API routes; this is noisy technical debt and should be removed when the originating dependency/code path is identified;
- six historical Feedback API 503 responses. The Feedback handler now emits a privacy-safe `feedback.storage_error` event containing only method and error class so a recurrence can be diagnosed without logging feedback text or customer details.

## Authentication/email monitoring

Supabase Auth logs should be checked for failed `/signup`, `/recover` and `/verify` requests, SMTP failures and unusual MFA/auth error rates. The current Pilot uses custom SMTP and successful recovery/verification requests were observed during launch testing.

## Incident response

If a launch-critical failure is repeated or customer data integrity is uncertain, use the Security & Incident Centre controls to reduce risky writes/automation first, preserve evidence, and follow `docs/PRIVACY_INCIDENT_RUNBOOK.md` and `docs/PILOT_DISASTER_RECOVERY.md` as applicable.

Monitoring is evidence for decisions; it must not expose service-role credentials, raw customer conversations, feedback messages, addresses, phone numbers, emails or authentication tokens.
