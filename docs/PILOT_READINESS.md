# Controlled pilot readiness

This document describes technical controls that support a small, controlled Business AI pilot. They are not a statement of UK GDPR/Data Protection Act compliance or a substitute for legal advice, a privacy notice, processor contracts, or an operational incident process.

## Public enquiry abuse and cost control

`/api/enquiry` resolves the business from its server-owned public route before any AI call. When `PUBLIC_ENQUIRY_RATE_LIMIT_MODE=database`, it then calls the server-only `consume_public_enquiry_quota` database function before contacting OpenAI.

- Counters are durable across serverless instances and use a fixed ten-minute window.
- Limits are applied to both the verified routed business and an HMAC-SHA-256 fingerprint of the network source. Raw IP addresses are not stored.
- `RATE_LIMIT_SALT` is server-only and must be a random value of at least 32 bytes. It deliberately has no `PUBLIC_` prefix because Vercel treats that prefix as browser-visible. If database mode is enabled but the salt, service role, or quota RPC is unavailable, public enquiries fail closed with `429` before an OpenAI request.
- The current pilot defaults are 20 requests per source and 100 per routed business per ten-minute window. They are intentionally conservative and should be reviewed using actual pilot traffic.

For Preview, configure the two variables above only after the hardening migration is applied to the same Supabase project. Production remains unchanged until a deliberate rollout. A managed WAF/rate-limit service may be added later for broader network-level protection; it is not required for the low-volume controlled pilot.

## Authentication plan limitation

Supabase leaked-password protection was investigated for the controlled Pilot but is unavailable on the current Supabase plan. It is an accepted Pilot limitation, not a substitute for credential controls. Pilot owner accounts must use strong, unique passwords, and no existing authentication, session verification, tenant-membership, or role controls may be weakened as a workaround. Reassess this protection before any wider or Production rollout.

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

## Public Pilot/Staging validation on 2026-09-17

The isolated Vercel project `business-ai-pilot` was used as the public Pilot/Staging surface. It is separate from the existing Production project and protected development Preview, and uses **Business-AI-Dev** (`mvwseobgkexzpmmkgcxe`) only. Its intentionally public alias is `https://business-ai-pilot.vercel.app`; its dashboard remains protected by the application’s Supabase authentication.

Commit `c06df3f` was deployed and validated with fake Dev-only records:

- unauthenticated requests to all tested private APIs returned `401`; Voice remained disabled (`503`);
- a public, server-verified fake business slug returned a safe AI response and created a tenant-matched fake lead;
- the enquiry created the expected tenant-scoped handover action, audit event, and durable database quota bucket;
- an unknown public slug returned `404`, and an authenticated fake owner could read only its own leads, history, pipeline, settings, bookings, actions, and audit records;
- a cross-tenant lead-history request returned the same safe `404` response as a nonexistent lead;
- the public response contains only `reply` and `leadCaptured`; it does not return the stored lead row or internal business identifier;
- `/api/health` returned `200`, and browser-visible configuration exposed only the Supabase URL and browser-safe publishable key.

Interactive browser automation was not available in the validation workspace. The authenticated API/session path was validated with the existing fake Dev owner; the protected Preview already has separate manual owner-login/dashboard validation. No Production deployment, data, or configuration was accessed.

## Pilot blockers and before-start checklist

Before a real Hartlepool business trial:

1. Create the Pilot owner Auth account with a strong, unique password and configure the relevant password/reset and redirect settings for the public Pilot URL. Leaked-password protection is unavailable on the current plan and remains an accepted controlled-Pilot limitation.
2. Set up a real monitored human-handover contact process, privacy notice, retention decision, subject-request process, and incident owner.
3. Create and configure a real pilot business/owner in the isolated Dev-backed Pilot environment, then complete a supervised customer-facing smoke test.
4. Keep voice disabled. Telephony provider setup, call-recording policy and signature/replay configuration remain separate work.
5. Treat any Production rollout as a separate decision: apply the required migrations and follow `PRODUCTION_AUTH_ROLLOUT_CHECKLIST.md`; do not enable one auth gate without the other.
