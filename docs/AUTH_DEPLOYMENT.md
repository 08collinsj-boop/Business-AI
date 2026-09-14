# Authentication rollout (pre-migration)

The current production application must remain on the existing unauthenticated
server routes until the reviewed tenancy migration is applied and a real owner
membership exists. Do not enable the auth gate before completing this order:

1. Create the real owner in Supabase Auth.
2. Add that user's `owner` membership for the backfilled initial business.
3. Apply and verify `20260915000000_add_multi_tenant_auth.sql` against the
   preservation checks in `TENANCY_MIGRATION_PLAN.md`.
4. Configure Supabase Auth Site URL and redirect URLs for the production domain.
5. Add these Vercel environment variables:

| Variable | Visibility | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | server only | Supabase project URL used by APIs |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | privileged database access after application authorization |
| `SUPABASE_PUBLISHABLE_KEY` | browser-safe | Supabase Auth browser client key |
| `OPENAI_API_KEY` | server only | receptionist model calls |
| `TENANCY_AUTH_ENABLED=true` | server only | enables authenticated dashboard API enforcement |

The publishable key is not a substitute for RLS. Dashboard APIs must verify the
Bearer token with Supabase Auth, resolve membership in `business_memberships`,
and filter every query by the resolved `business_id`. Browser-provided business
IDs and roles must be ignored for authorization.

The public receptionist remains separate: future tenant routing must use a
trusted domain/widget credential mapping, never a caller-supplied business ID.
