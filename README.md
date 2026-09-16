# Business AI

Business AI is a tenant-aware AI receptionist and lead-management dashboard. The current MVP includes lead capture, pipeline, lead history, business settings, Supabase Auth foundations, and tenant-scoped dashboard APIs.

## Bookings and actions

Bookings and follow-up actions are implemented and Dev-validated. See [Bookings and actions](docs/BOOKINGS_ACTIONS.md) for the data model, permission model, verification queries, and safe AI booking-request design.

The provider-neutral phone receptionist foundation is source-controlled but intentionally has no live provider integration. See [Voice receptionist foundation](docs/VOICE_RECEPTIONIST_FOUNDATION.md) for its tenant-routing, security, provider-adapter contract, and Dev-only first-call procedure.

Tenant-scoped onboarding and business configuration is available on the authenticated Settings screen. See [Business onboarding](docs/BUSINESS_ONBOARDING.md) for the data model, permissions, receptionist safeguards, and pilot-readiness steps.

The controlled-pilot owner creation and public enquiry routing foundation is documented in [Business creation and public routing](docs/BUSINESS_CREATION_AND_PUBLIC_ROUTING.md). It is Dev-validated only; Production remains unchanged.

Pilot hardening controls and the remaining launch checklist are in [Controlled pilot readiness](docs/PILOT_READINESS.md). They include durable public-enquiry quotas, audit records, lifecycle/export/erasure foundations and human-handover/incident guidance.

Never place `SUPABASE_SERVICE_ROLE_KEY` or `OPENAI_API_KEY` in browser code. Required deployment variables and the staged authentication rollout are documented in [Authentication deployment](docs/AUTH_DEPLOYMENT.md) and [the production rollout checklist](docs/PRODUCTION_AUTH_ROLLOUT_CHECKLIST.md).
