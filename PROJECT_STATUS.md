# Business AI MVP status

Last audited: 2026-09-17

## Completed

- Dashboard API integration, receptionist memory preservation, and lead-refresh behaviour are implemented.
- The production multi-tenant schema migration is applied: business ownership is backfilled, RLS is enabled, and the real owner has an `owner` membership.
- Shared server authentication verifies Supabase bearer tokens, resolves `business_memberships` server-side, and derives the authorised business and role without trusting browser input.
- Leads, history, pipeline, and settings APIs enforce tenant scoping when `TENANCY_AUTH_ENABLED === "true"`; settings writes require owner/admin.
- Frontend Supabase email/password login, session restoration, logout, authenticated same-origin private API requests, 401 handling, and public receptionist separation are implemented.
- Vercel Preview validation completed successfully on `auth-preview`:
  - `TENANCY_AUTH_ENABLED=true` and `FRONTEND_AUTH_ENABLED=true` in Preview;
  - real owner login, dashboard loading, tenant data, lead details, and lead history/activity were manually verified;
  - unauthenticated private API requests returned 401;
  - `/api/enquiry` remained intentionally public.
- The automated suite covers auth, tenant-scoped private APIs, frontend auth/public config, exact gates, and direct ESM module loading.
- Bookings and actions are implemented, migrated to Business-AI-Dev, and validated end-to-end with clearly fake Dev-only records.
- A reproducible empty-project database bootstrap chain is source-controlled, including the reconstructed lead/history baseline and the two verified historical migrations that were previously absent from the repository.
- The complete six-migration chain was applied and verified on **Business-AI-Dev** (`mvwseobgkexzpmmkgcxe`) only. The Dev owner has exactly one `owner` membership for `My Business`. The Dev environment contains only clearly fake end-to-end test records.
- Provider-neutral AI phone receptionist foundation is implemented and Dev-migrated: tenant-owned provider/number mappings, calls/events, server-verified provider adapter contract, server-side number-to-tenant resolution, call safety/handover primitives, usage/cost fields, and a tenant-scoped private call-history API. It is disabled by default and has no provider adapter or live number.
- Self-service onboarding/configuration foundation is implemented and Dev-migrated: a tenant-owned `business_configurations` row, industry-neutral template defaults, bounded FAQs/booking/handover/module preferences, owner/admin configuration API, and Settings-screen profile workflow. The public receptionist and future voice context load the matching tenant configuration server-side as bounded reference material; configuration cannot enable voice or override security/safety rules.
- Controlled-pilot business creation and public tenant routing are implemented and Dev-migrated: an authenticated user without memberships can create exactly one business through a server-only atomic function that creates the owner membership, default settings/configuration, and a public slug route. Public enquiries resolve that route server-side and never accept an internal tenant ID.
- Pilot hardening is implemented and Dev-migrated: durable database-backed public-enquiry quotas (HMAC source fingerprint plus routed-business window), tenant-scoped audit records, lifecycle-policy defaults, owner-only lead export/anonymisation endpoints, core human-handover detection/action creation, and redacted operational readiness logging.
- A second fake Dev business and fake owner were created and validated on Business-AI-Dev only. Separate configuration, public routing, lead, booking/action, audit and authenticated API flows were verified. Cross-tenant history reads and lead updates were denied, injected `business_id` was rejected, and unauthenticated private access returned 401.
- The isolated public Pilot/Staging Vercel project `business-ai-pilot` is deployed from `auth-preview` commit `c06df3f` and uses Business-AI-Dev only. Its public enquiry route, durable rate limit, fake lead/handover/audit path, authenticated tenant-scoped reads, cross-tenant denial, health endpoint, and private unauthenticated rejection were validated. The existing Production and protected Preview projects were untouched.
- North East Electrical has been preflighted as the first supervised Pilot business: its proposed public slug `north-east-electrical` is available in Business-AI-Dev, but no tenant or owner account has been created yet. Existing onboarding requires a new authenticated user with no membership and creates the tenant plus owner membership atomically.
- The Pilot authentication UI includes secure self-service email/password account registration. Confirmation remains enabled; a new Auth account has no business membership until its owner completes the existing server-authorised onboarding flow.
- Commit `0e010ef` is deployed to the isolated Pilot project at `https://business-ai-pilot.vercel.app`. Its public config resolves to Business-AI-Dev, its sign-up UI is present, `/api/health` is healthy, and unauthenticated private dashboard/onboarding endpoints return `401`. No account was created during this deployment check.

## In Progress

- Production authentication rollout preparation only. Production auth gates remain absent/disabled.
- Both Dev-only voice migrations are applied and verified. Provider selection, Dev provider setup, and a provider-specific adapter remain intentionally pending.
- The Dev-only onboarding migration `20260916170000_add_business_configuration_onboarding.sql` is applied and verified on Business-AI-Dev. It is unapplied to Production.
- The Dev-only creation/routing migration `20260916180000_add_business_creation_and_public_routes.sql` is applied and verified on Business-AI-Dev. It is unapplied to Production.
- The Dev-only pilot-hardening migrations `20260916190000_add_pilot_hardening_foundation.sql` and `20260916191000_add_lifecycle_policy_for_new_businesses.sql` are applied and verified on Business-AI-Dev. They are unapplied to Production.
- Supabase Auth production URL/redirect configuration and a controlled Production activation remain pending owner approval.
- Public Pilot business onboarding is an operational next step, not a Production rollout. Voice remains disabled.
- Supabase leaked-password protection is unavailable on the current plan. This is an accepted controlled-Pilot limitation; owner accounts must use strong, unique passwords and existing authentication controls remain mandatory.
- Pilot self-service signup requires the Business-AI-Dev Auth Site URL and redirect allow-list to include `https://business-ai-pilot.vercel.app` and `https://business-ai-pilot.vercel.app/**`; owner confirmed these are configured. Email delivery and confirmation must remain enabled.
- The Pilot post-login onboarding check now defers Supabase session work outside the `onAuthStateChange` callback lock. This is awaiting a manual retest by the existing Collins LTD. owner after deployment; no tenant, membership, settings, or configuration data was changed.
- Authenticated dashboard receptionist requests obtain the signed-in tenant's public slug through the authenticated onboarding check, then use the existing server-validated public route. This avoids unsafe implicit tenant selection when more than one Dev business exists.

## Blocked / Requires Owner

- Production activation requires the owner to configure the documented Supabase Auth Site URL/redirect URLs and deliberately enable both Vercel auth gates together.
- Do not enable either Production auth gate independently. Preview configuration must not be copied to Production without the rollout checklist.
- Telephony remains intentionally unconfigured; a provider account, Dev number, server-side webhook credential, provider signature/replay implementation, call-recording policy, and Dev migration application are required before phone reception can be enabled.
- Applying this migration chain to any environment other than Business-AI-Dev remains a deliberate database deployment decision. Production has not received the bootstrap or bookings/actions migrations.

## Remaining

1. Review and execute `docs/PRODUCTION_AUTH_ROLLOUT_CHECKLIST.md` only with owner approval.
2. Verify real-owner Production login, dashboard reads, lead history, authorised writes, logout, and unauthenticated 401 responses immediately after activation.
3. Choose and configure a Dev telephony provider using `docs/VOICE_RECEPTIONIST_FOUNDATION.md`, then implement a provider-specific signature/replay adapter.
4. Test one real Dev call before any Production consideration.
5. Continue MVP hardening: rate limits, AI safety/urgent handover handling, data lifecycle/export/deletion workflows, tenant-aware analytics, messaging integrations/plugins, business templates (trades, restaurants, salons), free trial/pricing, role/audit controls, usage/cost controls, backups/disaster recovery, business-specific knowledge, and privacy-by-design work.
6. Extend the controlled-pilot flow with owner-authorised membership invitations, multiple-business selection, verified custom-domain/widget routing, and multi-location onboarding before accepting unrestricted self-service sign-ups.
7. Before onboarding a real public pilot, enable Supabase breached-password protection, complete pilot privacy/retention/support procedures, set up a monitored handover route, and perform a supervised real-owner smoke test in the isolated Pilot environment. Production rollout remains separate.
