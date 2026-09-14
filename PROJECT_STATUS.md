# Business AI MVP status

Last audited: 2026-09-14

## Completed

- Existing single-business dashboard is connected to the leads, pipeline, settings, history, and enquiry APIs.
- The AI enquiry UI refreshes dashboard data after a saved lead.
- Receptionist context preservation was improved: full browser-session history is sent to the API and known contact/job details are supplied to the model.
- Live production smoke test completed on `business-ai-theta.vercel.app`:
  - dashboard, pipeline, lead list, lead details, settings loading, and AI lead capture were reachable;
  - the receptionist retained an early job detail after later location and phone messages;
  - a lead was captured/updated and the dashboard refreshed.
- Production deployment currently reports GitHub commit `6b7a5cf` as deployed by Vercel.
- Live Supabase audit confirmed `public.leads`, `public.lead_history`, and `public.business_settings` exist. RLS is enabled on all three tables and no policies currently exist. The current data footprint is 9 leads, 7 lead-history records, and 1 settings record. The real owner Auth account now exists; its verified UID is documented only in the post-migration owner-onboarding SQL.

## In progress

- Reviewed-but-unapplied multi-tenant migration and owner-onboarding plan.
- Pre-migration authentication rollout design. Authentication must be feature-gated until a real owner membership exists.
- MVP hardening plan: tenant model, Supabase Auth/RLS, API authorization, request validation/rate limiting, AI guardrails, data lifecycle, automated tests, and documentation.

## Blocked / Requires Owner

- **Database schema not present in the repository.** The table names, row counts, RLS state, and absence of policies are known, but exact columns, types, keys, constraints, triggers, grants, and the historical SQL for `enable_rls_business_settings` are still required before a preservation-safe migration can be authored or applied.
- **No Supabase project/CLI/MCP connection is configured in this workspace.** Owner access is required to inspect the database, run security advisors, and apply migrations.
- **No local environment configuration is present.** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `OPENAI_API_KEY` are required by current API handlers. Do not commit these values.
- **Vercel production is protected on the per-deployment URL.** The stable project domain is accessible, but deployment configuration and production environment variables require the Vercel project owner.
- **Authentication configuration is absent.** Supabase Auth redirect URLs, email provider settings, and production site URL require owner configuration.
- **Do not deploy authentication changes yet.** The required tenancy migration is intentionally not applied and there are no Auth users/memberships.
- **Telephony provider is intentionally not selected.** A provider account, UK number, call-recording policy, and webhook credentials are required before phone reception can be enabled.

## Remaining

1. Apply and verify the reviewed tenant migration only after owner onboarding and server API authorization are ready.
2. Add a server-side session verification and authorization layer to all dashboard APIs.
3. Add tenant-scoped data model for businesses, memberships, leads, settings, conversations, usage, audit events, retention/export requests, and future actions/calls.
4. Harden the receptionist: name parser fix, request limits, rate limits, structured guardrails, emergency/handover handling, cost/usage recording, and tenant-specific instructions.
5. Complete dashboard UX for lead updates, conversation history, follow-ups, data export/deletion requests, and meaningful analytics.
6. Add automated unit/integration/RLS tests and a reproducible local-development setup.
7. Add deployment, security, Supabase, telephony, and operational documentation.
