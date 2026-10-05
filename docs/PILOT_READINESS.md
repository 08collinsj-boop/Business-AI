# Controlled Pilot / soft-launch readiness

The repository is designed for an isolated, supervised Pilot and a small controlled public soft launch. Source completion does not equal live-service verification.

## Ready in source

- tenant authentication/authorization and private API scoping;
- public slug routing and enquiry abuse protection;
- receptionist/lead/handover path and reliability safeguards;
- bookings/actions/team foundations;
- resumable onboarding;
- retention, audit and data export/anonymisation foundations;
- Stripe billing architecture;
- Business Knowledge uploads/review/retrieval;
- AI Marketing history/approval;
- Meta/Facebook publishing architecture and server scheduling endpoint;
- Pilot feedback;
- conservative PWA;
- disabled provider-neutral voice foundation;
- privacy-safe operational monitoring and aggregate launch metrics;
- documented data-subject-rights and disaster-recovery procedures.

Automated tests must remain green and the consolidated live checks in `PUBLIC_LAUNCH_BROWSER_CERTIFICATION.md` must pass before opening the service more widely.

## Required before a controlled public soft launch

1. Confirm Business-AI-Dev and `business-ai-pilot` identities; Production unchanged.
2. Apply only outstanding migrations to Dev/Pilot and run Supabase advisors.
3. Configure strong Pilot-only environment values. Never copy secrets into source/browser configuration.
4. Keep the current legal identity/contact route configured and current legal versions available.
5. Complete the ICO data-protection fee self-assessment. Do not guess the operator's factual answers; register/pay only if the assessment says it is required.
6. Resolve the Vercel commercial-use plan issue before taking real paid customers. Current Hobby terms are for personal/non-commercial use; use a commercial plan or another suitable host for commercial service.
7. Complete one consolidated fake-data owner/customer browser certification using `PUBLIC_LAUNCH_BROWSER_CERTIFICATION.md`.
8. Keep AI Phone Calls disabled until a real provider is connected and separately certified.
9. Use a small supervised cohort first and review feedback/AI inaccuracies before wider rollout.

## Explicit backup risk decision — 5 October 2026

The operator has chosen to defer paid managed backups/PITR until revenue supports the additional infrastructure cost. This is an accepted temporary soft-launch risk, not a technical PASS.

Until managed backups and an isolated restore drill are in place:
- keep the initial public cohort small and supervised;
- do not claim verified disaster recovery or point-in-time restore capability;
- treat any material data-integrity incident as grounds to pause risky writes using the Incident Centre;
- retain `PILOT_DISASTER_RECOVERY.md` as the recovery runbook;
- make managed backups/PITR plus an isolated restore drill a priority once paying usage/revenue begins and before significant scale.

## Production

Production rollout is separate. Do not promote the Pilot deployment or apply Pilot migrations to Production without explicit approval and the Production rollout checklist.
