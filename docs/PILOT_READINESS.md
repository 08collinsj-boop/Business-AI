# Controlled Pilot / soft-launch readiness

Status: refreshed 7 October 2026. This checklist covers the isolated Business AI Pilot only. The separate Production environment remains untouched.

## Verified tonight

- The Pilot branch is `pilot-progress-20261007`.
- Marketing generation now uses `openrouter/free` and may retry up to three times after retryable provider, validation, grounding or repetition failures.
- The source test suite passes 513 / 513 tests.
- `npm run verify:local` checked 159 JavaScript files with no secret-pattern or temporary-marker failures.
- The live Pilot `/api/health` endpoint returns HTTP 200 with `{"status":"ok"}`.
- The stale legal-identity warning and the owner/Marketing mojibake text were repaired.
- Public service-provider identity and direct contact details are configured.
- The current DPA is v1.1.
- The Meta connection is live for the Pilot: a Facebook Page is selected and a real Page post has already published successfully.
- Marketing automation for `My Business` remains enabled in fully automated mode at one post per day.
- The live Supabase scheduler calls `/api/marketing-scheduler` hourly. Vercel retains the 08:00 UTC daily cron as a fallback. See `MARKETING_SCHEDULER_OPERATIONS.md`.
- Supabase migration source now includes the already-applied `pg_net` scheduler migration, so fresh source reflects the live extension requirement.
- Supabase Security Advisor reports no HIGH/ERROR finding. The remaining WARN is leaked-password protection being disabled in Auth. Two RLS INFO findings are intentional service-role-only incident-control tables.

## External / operator gates still open

### ICO data-protection fee

The ICO self-assessment was completed on 5 October 2026 and returned Tier 1: £52 per year, or £47 when paid by Direct Debit. Registration/payment has not been completed. Do not register, declare or pay without the operator's explicit approval.

### Commercial hosting

The Vercel team is currently on Hobby. Paid/commercial launch remains blocked until the operator approves a suitable commercial Vercel plan or another suitable host.

### Meta public access

The Pilot Page connection and Page publishing work for the current authorised account. Public access for unrelated businesses is not certified. Meta App Review / advanced access, any required business/access verification and the current applicable platform terms must be checked in the Meta Developer console before wider use.

### Authentication hardening

Supabase leaked-password protection is currently disabled. Enable it in the Auth dashboard before wider public signup.

### Browser certification

Run the remaining browser-only checks in `PUBLIC_LAUNCH_BROWSER_CERTIFICATION.md`, especially fresh signup/recovery email, fake-data rights workflow, Stripe TEST checkout, mobile owner/customer journeys and the Meta Developer-console checkpoint.

## Deliberately deferred P1

Managed backups/PITR and an isolated restore drill remain an accepted temporary risk for the small supervised Pilot. Do not claim verified disaster recovery until the restore drill actually passes.

## Production

Production rollout is separate. Do not promote Pilot changes or apply Pilot migrations to the separate Production environment without explicit approval and its rollout checklist.
