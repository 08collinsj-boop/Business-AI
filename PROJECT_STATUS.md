# Business AI MVP status

Last audited: 2026-09-15

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

## In Progress

- Production authentication rollout preparation only. Production auth gates remain absent/disabled.
- Supabase Auth production URL/redirect configuration and a controlled Production activation remain pending owner approval.

## Blocked / Requires Owner

- Production activation requires the owner to configure the documented Supabase Auth Site URL/redirect URLs and deliberately enable both Vercel auth gates together.
- Do not enable either Production auth gate independently. Preview configuration must not be copied to Production without the rollout checklist.
- Telephony remains intentionally unconfigured; a provider account, number, call-recording policy, and webhook credentials are required before phone reception can be enabled.

## Remaining

1. Review and execute `docs/PRODUCTION_AUTH_ROLLOUT_CHECKLIST.md` only with owner approval.
2. Verify real-owner Production login, dashboard reads, lead history, authorised writes, logout, and unauthenticated 401 responses immediately after activation.
3. Continue MVP hardening: rate limits, AI safety/urgent handover handling, data lifecycle/export/deletion workflows, tenant-aware analytics, and telephony/action foundations.
