# Provider-neutral AI phone receptionist foundation

## Purpose and current boundary

This foundation lets Business AI add a phone channel without making lead, booking, action, or tenant logic depend on a particular telephony vendor. It is intentionally **disabled by default** and does not connect to a provider, obtain a phone number, receive a real call, store a recording, or make an AI model call by itself.

The only public entry point is `POST /api/voice-webhook?provider=<provider>`. It returns `404` unless the exact environment value `VOICE_RECEPTIONIST_ENABLED=true` is present. Even then, it returns `503` until a server-side provider adapter is installed. This is deliberate: an unverified caller must never be able to create calls, leads, bookings, or actions.

## Migration status

The Dev-only migrations were applied and verified on 2026-09-16 to **Business-AI-Dev** (`mvwseobgkexzpmmkgcxe`):

1. `20260916153249_add_voice_receptionist_foundation.sql`
2. `20260916154907_add_voice_foreign_key_indexes.sql`

The second, additive migration covers the composite voice foreign keys with left-prefix indexes identified by the Supabase advisor. Both migrations are still unapplied to Production. The Dev voice tables contain no provider connection, number, credential, call, or event record.

## Tenant resolution and security model

1. A provider-specific adapter verifies the provider's webhook signature against its **server-side** credential before any tenant lookup.
2. The adapter normalizes the called number to E.164 format.
3. The shared voice layer looks up an active server-owned `voice_phone_numbers` mapping for the verified provider and called number.
4. The mapping supplies the authoritative `business_id` and provider connection. No webhook payload, query string, header, JWT metadata, or browser value can choose a business or role.
5. All persisted records use that business ID. Composite foreign keys prevent a voice call from linking to a lead, booking, action, number, or connection from another tenant.

The migration grants no anonymous database access and only membership-filtered `SELECT` access to authenticated users. Database writes remain server-only through the service role after authentication/authorization. Provider connection and phone routing records are additionally limited to owner/admin direct reads; calls/events are readable only by members of the same business.

Provider credentials, webhook secrets, recording URLs with credentials, bearer tokens, and API keys are not stored in the database or sent to the browser. `webhook_secret_reference` is only an opaque server configuration reference, not a secret value.

## Database model

`20260916153249_add_voice_receptionist_foundation.sql` adds:

- `voice_provider_connections`: tenant-owned non-secret provider/account references and disabled/active state.
- `voice_phone_numbers`: a globally unique E.164 number-to-business mapping, with an optional future location label.
- `voice_calls`: call lifecycle, safe references to a same-tenant lead/booking/action, handover/escalation state, transcript summary/recording reference, and per-call usage/cost fields.
- `voice_call_events`: ordered call/conversation and audit events.

The schema supports multiple businesses and future multi-location/franchise routing without creating an unauthorised browser-configured tenant switch. It does not yet create a locations table; `location_label` is intentionally non-authoritative until business locations are designed as a separate tenant resource.

## Provider contract

A provider integration must implement the adapter contract in `api/_voice.js`:

```js
{
  name: "provider-name",
  verifyWebhook: async ({ headers, rawBody, requestUrl }) => boolean,
  parseInboundEvent: async ({ headers, rawBody }) => ({
    providerCallId, providerEventId, calledNumber, callerNumber, status, occurredAt
  }),
  buildResponse: ({ call, tenant, event }) => ({ status, headers, body }) // optional
}
```

The adapter must validate the real provider signature using its own documented method. Do not accept a token/secret supplied in the webhook payload as proof. The generic webhook reads at most 64 KiB, rejects invalid events, and does not resolve a tenant until signature verification succeeds.

No provider adapter is shipped in this milestone. Adding one requires a separate security review because signatures, retries, replay protection, and response formats differ by provider.

## Intake, booking, action, and safety preparation

`api/_voice.js` builds business-specific receptionist context from the same tenant's `business_settings`. It is industry-neutral: business name, type, services, hours, contact details, and AI instructions are supplied by settings rather than hard-coded trade text.

Its internal `captureVoiceLead` bridge reuses `saveLead` from `api/enquiry.js`; it may only receive a business ID returned by the trusted phone-number mapping. Existing public web enquiry behavior remains unchanged. Future speech/AI adapters should pass a trusted mapped tenant to this bridge, then use the existing bookings/actions APIs or a shared server service.

Voice-created bookings are always `{ status: "requested", source: "ai_request" }`. The assistant must not claim an appointment is confirmed before a server-authorized availability and business-rules process confirms it. Handover requests create a pending follow-up action only through a future authorized service. The current deterministic safety helper identifies immediate-danger language and directs emergency/human escalation rather than trying to diagnose or promise attendance.

## Tenant-scoped call history

`GET /api/voice-calls` is the initial private read endpoint. It requires both `VOICE_RECEPTIONIST_ENABLED=true` and the existing tenancy-auth feature gate/session. It resolves membership server-side and filters every call/event query with its derived `business_id`. A cross-tenant call ID is indistinguishable from a nonexistent call. No UI change is included yet; this endpoint is the future dashboard call-history seam.

## Before the first Dev call

1. Apply the voice migration to **Business-AI-Dev only** after reviewing it; do not apply it to Production as part of this source change.
2. Select one provider and create a Dev/test account and a Dev number. Obtain its documented webhook-signing credential and store it only as a Preview server-side secret.
3. Implement and test that provider's adapter, including signature validation, retry/replay behavior, E.164 parsing, and provider-specific response handling.
4. Add an active Dev `voice_provider_connections` row and a normalized number mapping only after the provider configuration exists. Never place a secret in either row.
5. Set `VOICE_RECEPTIONIST_ENABLED=true` in the **Preview** environment only, deploy Preview, and make one test call to the mapped Dev number.
6. Verify the call record/event, tenant mapping, guardrails, lead capture, booking-request flow, and human handover. Test a second tenant before any production rollout.

## Future work deliberately left separate

- real-time speech-to-text/text-to-speech and model orchestration;
- provider adapter(s), replay protection, delivery retry handling, and number provisioning;
- availability calendars and authorized appointment confirmation;
- dashboard call-history UI, recording-consent UX, retention/deletion/export controls;
- tenant-aware provider account onboarding, multi-location routing, franchise controls, industry templates, usage limits/billing, monitoring, and audit logs;
- UK data-protection assessment, call-recording notices/consent, data retention policy, and human escalation operations.
