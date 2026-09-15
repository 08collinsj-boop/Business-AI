# Business AI

Business AI is a tenant-aware AI receptionist and lead-management dashboard. The current MVP includes lead capture, pipeline, lead history, business settings, Supabase Auth foundations, and tenant-scoped dashboard APIs.

## Bookings and actions

Bookings and follow-up actions are implemented in source control but require the forward-only Supabase migration at `supabase/migrations/20260915010000_add_bookings_actions.sql` before their APIs or dashboard views can be used. See [Bookings and actions](docs/BOOKINGS_ACTIONS.md) for the data model, permission model, verification queries, and safe AI booking-request design.

Never place `SUPABASE_SERVICE_ROLE_KEY` or `OPENAI_API_KEY` in browser code. Required deployment variables and the staged authentication rollout are documented in [Authentication deployment](docs/AUTH_DEPLOYMENT.md) and [the production rollout checklist](docs/PRODUCTION_AUTH_ROLLOUT_CHECKLIST.md).
