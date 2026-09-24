# Business AI Pilot security model

## Authentication and tenancy

Private APIs call Supabase Auth to verify the bearer token and then resolve the user's membership server-side. Requests with zero or multiple memberships fail closed. Role checks are server-side. Browser-supplied `business_id` values are rejected/ignored rather than trusted.

Public enquiries resolve a validated business slug through the public route table; internal tenant IDs are not public identifiers.

## Database / RLS

All application tables in the exposed `public` schema use RLS. Browser grants are narrowed to the rows/columns needed for read experiences; privileged writes use authenticated server routes. Security-sensitive functions explicitly revoke `PUBLIC`/`anon`/`authenticated` execution and grant only `service_role` where required.

Composite `(resource_id,business_id)` foreign keys protect cross-tenant relationships for leads/bookings/actions/knowledge/publications.

## Secrets

Never expose `SUPABASE_SERVICE_ROLE_KEY`, OpenAI, Stripe or Meta secrets/tokens to browser code. `.env.example` contains placeholders only. Meta access/Page tokens are encrypted before database storage.

## Billing

Base plan and add-on Price IDs are server environment mappings. Checkout accepts plan/add-on keys, never arbitrary Price IDs. Stripe webhooks verify the original signed request body and have durable event idempotency. Billing state updates use event creation time so a stale subscription event cannot overwrite newer state. Webhook mapping checks Stripe customer/subscription references against the supplied business metadata and rejects conflicts.

## AI / prompt injection

Uploaded files and customer/owner text are untrusted data. System prompts explicitly separate trusted rules from business facts and user requests. Uploaded document instructions cannot change tenant access, billing, permissions or safety policy. Extracted knowledge is not used until reviewed and approved.

Marketing generation is always a draft. Editing resets approval. Only the business owner can approve for external publishing.

## Public endpoints / abuse controls

Public enquiries use a durable per-business/source quota fingerprinted with a server secret. Marketing has durable business-level burst/hour/day generation limits. Input/output lengths are bounded and malformed structured output fails safely.

## Operational limitations

This security model does not replace a penetration test or legal/compliance review. Before expanding beyond a controlled Pilot, run Supabase security advisors, verify real environment variables and redirects, exercise cross-tenant tests against the deployed environment, review logs for secret/PII leakage and obtain final privacy/legal wording.

## Publication request idempotency

Marketing publish/schedule requests require a client operation UUID. The server derives a tenant-bound hash and stores it under a unique `(business_id, idempotency_key)` constraint. Retries therefore return the same durable publication instead of creating a second social post. A publish result that is ambiguous at the provider boundary is not automatically retried.
