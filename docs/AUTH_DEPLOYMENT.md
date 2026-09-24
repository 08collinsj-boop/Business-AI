# Authentication deployment status

## Current state

- The multi-tenant migration is applied in Production and the real owner has an `owner` membership.
- Server authentication and tenant enforcement are implemented for leads, history, pipeline, and settings.
- The frontend login/session foundation is implemented.
- Preview validation on the `auth-preview` branch succeeded with the real owner account: login, dashboard, tenant data, lead details, and lead history/activity loaded correctly.
- Preview gates are enabled. Production `TENANCY_AUTH_ENABLED` and `FRONTEND_AUTH_ENABLED` remain absent/disabled.

## Authorisation design

Private dashboard calls use a Supabase access token only for same-origin API requests. The server verifies it with Supabase Auth, looks up the user in `business_memberships`, and returns the server-derived `businessId` and role. APIs do not trust request business IDs, roles, metadata, or decoded JWT claims. Settings writes require `owner` or `admin`.

`/api/enquiry` is intentionally public and does not receive the dashboard bearer token. Its current single-business tenant resolution is server-side.

## Required Vercel variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | server only | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | privileged server-side data access after application authorisation |
| `OPENAI_API_KEY` | server only | receptionist model calls |
| `SUPABASE_PUBLISHABLE_KEY` | browser-safe config endpoint only | Supabase browser Auth client |
| `TENANCY_AUTH_ENABLED` | feature gate | private API enforcement; exact value `true` enables it |
| `FRONTEND_AUTH_ENABLED` | feature gate | login/session UI; exact value `true` enables it |
| `VOICE_RECEPTIONIST_ENABLED` | server-only feature gate | voice webhook/call-history capability; exact value `true` enables it only after a verified provider adapter and number mapping exist |

Never expose server-only values to the browser. The production activation and rollback sequence is maintained in `PRODUCTION_AUTH_ROLLOUT_CHECKLIST.md`.
