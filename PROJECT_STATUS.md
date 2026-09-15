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
- Bookings and actions are implemented in source: tenant-scoped tables, protected APIs, dashboard views, lead relationships, and isolated API tests. The new migration is source-controlled but **not yet applied** to Supabase.
- A reproducible empty-project database bootstrap chain is source-controlled, including the reconstructed lead/history baseline and the two verified historical migrations that were previously absent from the repository.

## In Progress

- Production authentication rollout preparation only. Production auth gates remain absent/disabled.
- Bookings/actions await review and manual application of `supabase/migrations/20260915010000_add_bookings_actions.sql` before they can be used in a deployed environment.
- Business-AI-Dev (`mvwseobgkexzpmmkgcxe`) is the intended safe target for the first complete bootstrap, but this workspace must be explicitly connected to that project before SQL is applied.
- Supabase Auth production URL/redirect configuration and a controlled Production activation remain pending owner approval.

## Blocked / Requires Owner

- Production activation requires the owner to configure the documented Supabase Auth Site URL/redirect URLs and deliberately enable both Vercel auth gates together.
- Do not enable either Production auth gate independently. Preview configuration must not be copied to Production without the rollout checklist.
- Telephony remains intentionally unconfigured; a provider account, number, call-recording policy, and webhook credentials are required before phone reception can be enabled.
- Applying the bookings/actions migration is a database deployment decision and must be reviewed and run through the normal Supabase workflow. No database change was made by this source update.

## Remaining

1. Review and execute `docs/PRODUCTION_AUTH_ROLLOUT_CHECKLIST.md` only with owner approval.
2. Verify real-owner Production login, dashboard reads, lead history, authorised writes, logout, and unauthenticated 401 responses immediately after activation.
3. Review, apply, and verify the bookings/actions migration in a non-production environment before enabling the new dashboard workflows there.
4. Continue MVP hardening: rate limits, AI safety/urgent handover handling, data lifecycle/export/deletion workflows, tenant-aware analytics, telephony/action foundations, messaging integrations/plugins, business templates (trades, restaurants, salons), free trial/pricing, role/audit controls, usage/cost controls, backups/disaster recovery, business-specific knowledge, and privacy-by-design work.
