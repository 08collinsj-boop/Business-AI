# Secure business creation and public tenant routing

## Status

`20260916180000_add_business_creation_and_public_routes.sql` is applied and verified on **Business-AI-Dev** (`mvwseobgkexzpmmkgcxe`) only. It has not been applied to Production. Voice remains disabled and no telephony service is configured.

## Owner onboarding flow

1. A real owner is created in the selected environment's Supabase Auth service using an email they control and a strong, unique password. The application does not provide public signup and must not create or retain an owner password.
2. That Auth user signs in.
3. The frontend asks `GET /api/business-onboarding` whether that verified user has a membership.
4. A user with no membership can submit a business name, optional type, and public slug to `POST /api/business-onboarding`.
5. The server verifies the bearer token with Supabase Auth. It ignores all browser role, user ID, and business ID values.
6. The server-only `create_business_for_owner` database function creates the business, `owner` membership, settings row, configuration row, and public slug route in one transaction.
7. The owner is returned to the dashboard to complete Settings → Business profile and mark onboarding complete.

The function is `SECURITY DEFINER` only because an atomic multi-table creation is required. Its search path is fixed, it rejects nonexistent Auth users and users who already have a membership, its public execution grants are revoked, and only `service_role` can execute it. The API independently verifies the authenticated user before providing the owner UID.

This initial controlled-pilot version deliberately supports one membership per user because the existing dashboard selects its tenant exclusively from a single server-resolved membership. Multi-business owner selection/invitations are a future explicit design, not a browser tenant switch.

## Public routing

Each tenant has a server-owned active `business_public_routes` mapping of `route_type=slug` and a lowercase public slug. Customer enquiries use:

```
POST /api/enquiry?business=<public-slug>
```

The slug is validated, then resolved server-side to an internal `business_id`. The browser never receives or supplies that UUID for routing. Unknown/inactive/malformed routes return the same safe not-available response. The enquiry handler scopes settings, configuration, deduplication, and lead insert/update to that resolved tenant.

For backwards compatibility, a route-less public enquiry works only when exactly one business exists. Once multiple businesses exist, a slug is required. Future custom domains, widgets, QR links, locations, and phone-number mappings will add route types to this table without changing the internal tenant model.

## Abuse protection

`lib/public-rate-limit.js` runs before OpenAI. When `PUBLIC_ENQUIRY_RATE_LIMIT_MODE=database`, it uses a durable database quota with a server-only HMAC source fingerprint plus a routed-business window. If its salt, service role, or quota RPC is unavailable, the public route fails closed before an AI call. The local in-memory limiter remains only as the staged-development fallback when database mode is not enabled.

For the controlled Pilot, enable database mode and configure a unique server-only `RATE_LIMIT_SALT`. A managed WAF/rate-limit service may be added later for broader network-level protection; do not treat the in-memory fallback as sufficient for a public deployment.

## Dev verification

Use `supabase/verification/business_creation_public_routes.sql` against the explicit Dev project. It verifies the routes table, route-to-business integrity, RLS, policies, direct grants, and the function's service-role-only ACL. Automated tests cover no-membership creation, privilege/mass-assignment rejection, duplicate membership behaviour, public route validation, tenant-scoped enquiry lead creation, and the local limiter.
