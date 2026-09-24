# Controlled Pilot readiness

The repository is designed for an isolated, supervised Pilot. Source completion does not equal live-service verification.

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
- disabled provider-neutral voice foundation.

Automated tests must remain green and all live checks in `PILOT_DEPLOYMENT_HANDOFF.md` must pass before real businesses are invited.

## Required before a real business trial

1. Confirm Business-AI-Dev and `business-ai-pilot` identities; Production unchanged.
2. Apply only outstanding migrations to Dev/Pilot and run Supabase advisors.
3. Configure strong Pilot-only environment values. Never copy secrets into source/browser configuration.
4. Complete a fake-data auth/onboarding/public-enquiry/Knowledge/billing smoke test.
5. Set the real human-handover process, monitored support contact, incident owner, retention decision and final privacy notice.
6. If Marketing publishing is enabled, configure a real Meta Pilot app/Page and scheduler and verify an owner-approved harmless post.
7. Keep Instagram publishing blocked until a media flow is actually implemented/tested.
8. Keep AI Phone Calls disabled.
9. Use a small supervised cohort first and review feedback/AI inaccuracies before wider rollout.

## Production

Production rollout is separate. Do not promote the Pilot deployment or apply Pilot migrations to Production without explicit approval and the Production rollout checklist.
