# Secure business creation and public tenant routing

## Status

`20260916180000_add_business_creation_and_public_routes.sql` is applied and verified on **Business-AI-Dev** (`mvwseobgkexzpmmkgcxe`) only. It has not been applied to Production. Voice remains disabled and no telephony service is configured.

## Owner onboarding flow

1. An existing Supabase Auth user signs in.
2. The frontend asks `GET /api/business-onboarding` whether that verified user has a membership.
3. A user with no membership can submit a business name, optional type, and public slug to `POST /api/business-onboarding`.
4. The server verifies the bearer token with Supabase Auth. It ignores all browser role, user ID, and business ID values.
5. The server-only `create_business_for_owner` database function creates the business, `owner` membership, settings row, configuration row, and public slug route in one transaction.
6. The owner is returned to the dashboard to complete Settings → Business profile and mark onboarding complete.

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

`api/_public-rate-limit.js` supplies a no-dependency, in-memory 20 enquiries per client per route per ten minutes and 120 per route per ten minutes guard before OpenAI is called. It is deliberately a development/single-instance foundation, not a distributed production limit: Vercel instances do not share memory and client-address headers need platform/WAF controls.

Before a public pilot, add a durable shared rate limiter or Vercel WAF rate-limit policy, request/body telemetry with privacy controls, and alerting. Do not treat the in-memory guard as sufficient production abuse/cost protection.

## Dev verification

Use `supabase/verification/business_creation_public_routes.sql` against the explicit Dev project. It verifies the routes table, route-to-business integrity, RLS, policies, direct grants, and the function's service-role-only ACL. Automated tests cover no-membership creation, privilege/mass-assignment rejection, duplicate membership behaviour, public route validation, tenant-scoped enquiry lead creation, and the local limiter.
