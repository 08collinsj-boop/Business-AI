# Controlled Pilot / soft-launch readiness

Status: refreshed 8 October 2026. This checklist covers the isolated Business AI Pilot only. The separate Production environment remains untouched.

## Verified tonight

- The Pilot branch is `pilot-progress-20261007`.
- The 8 October source candidate hardens Marketing generation after the natural overnight automation failure: it rotates across three structured-output-capable free OpenRouter models, permits provider fallback, prioritises throughput and limits each provider attempt to 25 seconds.
- The current verification candidate contains 514 automated tests. The full gate is being rerun after the documentation contract repair.
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

The ICO self-assessment was completed on 5 October 2026 and returned Tier 1: £52 per year, or £47 when paid by Direct Debit. Operator decision: do not register, declare or pay until prospects provide clear commercial validation by confirming they would pay for Business AI. This decision does not itself establish a legal exemption, so the ICO position must be rechecked before expanding the Pilot or taking real customers.

### Commercial hosting

The Vercel team is currently on Hobby. Hobby terms are for personal/non-commercial use. Operator decision: do not upgrade or purchase commercial hosting until prospects confirm they would pay for Business AI. Continue only with the limited Pilot in the meantime, and resolve hosting before taking real paid customers.

### Meta public access

The Pilot Page connection and Page publishing work for the current authorised account. Public access for unrelated businesses is not certified. Meta App Review / advanced access, any required business/access verification and the current applicable platform terms must be checked in the Meta Developer console before wider use.

### Authentication hardening

Supabase leaked-password protection is currently disabled. Operator decision: defer enabling it until prospects confirm they would pay. Keep the Pilot limited/supervised in the meantime, and enable it before wider public signup or real customer onboarding.

### Browser certification

Run the remaining browser-only checks in `PUBLIC_LAUNCH_BROWSER_CERTIFICATION.md`, especially fresh signup/recovery email, fake-data rights workflow, Stripe TEST checkout, mobile owner/customer journeys and the Meta Developer-console checkpoint.

## Deliberately deferred P1

Managed backups/PITR and an isolated restore drill remain an accepted temporary soft-launch risk, not a technical PASS, for the small supervised Pilot. Do not claim verified disaster recovery until the restore drill actually passes.

## Production

Production rollout is separate. Do not promote Pilot changes or apply Pilot migrations to the separate Production environment without explicit approval and its rollout checklist.
