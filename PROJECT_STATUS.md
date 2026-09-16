# Business AI MVP status

Last audited: 2026-09-16

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

## In Progress

- Production authentication rollout preparation only. Production auth gates remain absent/disabled.
- Both Dev-only voice migrations are applied and verified. Provider selection, Dev provider setup, and a provider-specific adapter remain intentionally pending.
- The Dev-only onboarding migration `20260916170000_add_business_configuration_onboarding.sql` is applied and verified on Business-AI-Dev. It is unapplied to Production.
- Supabase Auth production URL/redirect configuration and a controlled Production activation remain pending owner approval.

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
6. Build the owner-authorised new-business creation, membership invitation, verified public routing, and multi-location onboarding workflow before accepting self-service sign-ups.
