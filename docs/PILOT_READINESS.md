# Controlled pilot readiness

This document describes technical controls that support a small, controlled Business AI pilot. They are not a statement of UK GDPR/Data Protection Act compliance or a substitute for legal advice, a privacy notice, processor contracts, or an operational incident process.

## Public enquiry abuse and cost control

`/api/enquiry` resolves the business from its server-owned public route before any AI call. When `PUBLIC_ENQUIRY_RATE_LIMIT_MODE=database`, it then calls the server-only `consume_public_enquiry_quota` database function before contacting OpenAI.

- Counters are durable across serverless instances and use a fixed ten-minute window.
- Limits are applied to both the verified routed business and an HMAC-SHA-256 fingerprint of the network source. Raw IP addresses are not stored.
- `PUBLIC_RATE_LIMIT_SALT` is server-only and must be a random value of at least 32 bytes. If database mode is enabled but the salt, service role, or quota RPC is unavailable, public enquiries fail closed with `429` before an OpenAI request.
- The current pilot defaults are 20 requests per source and 100 per routed business per ten-minute window. They are intentionally conservative and should be reviewed using actual pilot traffic.

For Preview, configure the two variables above only after the hardening migration is applied to the same Supabase project. Production remains unchanged until a deliberate rollout. A managed WAF/rate-limit service may be added later for broader network-level protection; it is not required for the low-volume controlled pilot.

## Audit records

`business_audit_events` records tenant-scoped, append-only application events for business creation, configuration/settings updates, lead updates, booking/action changes, public lead capture and lifecycle requests. Each event has a tenant, optional actor UUID, action, resource reference and timestamp.

Metadata is allowlisted and strips messages, descriptions, notes, contacts, tokens, secrets and passwords. The table has RLS; only owner/admin members may read their business’s events through `/api/audit-log`. Browser roles and business IDs never choose the audit scope. Application writes use only the server-side service role and are best-effort so an audit outage does not corrupt a valid customer operation.

## Human handover and high-risk enquiries

The receptionist applies server-owned handover detection for immediate-danger terms and requests for a human, manager, complaint, or callback. Business configuration is reference material only and cannot disable these rules. A handover sets high lead priority and creates a tenant-scoped urgent follow-up action when the lead is saved. The receptionist does not promise emergency attendance, prices, policies, or confirmed appointments.

Pilot operators need a documented monitored contact route for these actions. Until one exists, do not advertise emergency or time-critical response capability.

## Data lifecycle, export and erasure

Each business receives conservative, owner-configurable retention values in `business_data_lifecycle_policies`:

- lead/customer data: 30–3650 days (default 365);
- audit events: 365–3650 days (default 730).

Owner-only `/api/data-subjects?lead_id=<id>` can export a tenant-scoped lead with its history, bookings and actions. Its `DELETE` request anonymises that lead’s contact and free-text data plus linked booking/action/history free text, without deleting the structural records or audit evidence. The request is audit-recorded.

There is deliberately no scheduled deletion job yet. Retention values are a policy foundation, not automated enforcement. Voice calls/transcripts are out of scope for this erasure path because voice remains disabled and no call records have been collected. Before a real pilot, appoint the data controller, agree retention periods, publish the applicable privacy information, define subject-request verification, and establish a secure export-delivery process.

## Operational response

`GET /api/health` is a shallow, no-store readiness check. It reports only `ok`/`unavailable`, never configuration values. The public enquiry route emits structured, redacted operational events; no bearer token, API key, phone, email, address, message or other customer content is included.

If an AI, database or authentication dependency fails:

1. Check the deployment and `/api/health`; do not paste logs containing customer data into public channels.
2. Stop relying on automated intake and direct customers to the business’s monitored human contact route.
3. Review Vercel/Supabase/OpenAI status and redacted logs, then test only in Dev/Preview before restoring service.
4. Do not disable tenant authentication, RLS, or rate limiting as an incident workaround.

## Dev validation on 2026-09-16

Only **Business-AI-Dev** (`mvwseobgkexzpmmkgcxe`) was used. A second clearly fake business, `FAKE DEV Pilot Two Garage`, with a fake Auth owner and an independent public slug was created through the atomic owner-onboarding model. It received its own configuration, public enquiry lead, requested booking, completed follow-up action and audit events.

The second owner could read its own lead/history/pipeline and create/complete its own booking/action. It could not read another business’s lead history or update another business’s lead; both returned the safe not-found response. A browser-supplied `business_id` update field was rejected. An unauthenticated bookings request returned 401. No Production project, data, credentials or configuration was accessed.

## Pilot blockers and before-start checklist

Before a real Hartlepool business trial:

1. Apply and verify the forward-only hardening migrations in the intended non-production/Preview database, then repeat authenticated and public-route smoke tests.
2. Configure `PUBLIC_ENQUIRY_RATE_LIMIT_MODE=database` and a unique server-only `PUBLIC_RATE_LIMIT_SALT` in that environment; do not enable this mode without the database migration.
3. Enable Supabase Auth leaked-password protection and configure owner password/reset and redirect settings.
4. Set up a real monitored human-handover contact process, privacy notice, retention decision, subject-request process, and incident owner.
5. Perform a deliberate Production migration/auth rollout using the existing checklist. Do not enable one auth gate without the other.
6. Keep voice disabled. Telephony provider setup, call-recording policy and signature/replay configuration remain separate work.
