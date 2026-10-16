# Colzo WhatsApp: existing-number architecture

**Internal research and test foundation, NOT a live integration.** No Meta account, Twilio account, paid sender, number registration, SMS/voice verification, migration, database write, outbound message, or Production deployment is authorised or performed.

## Goal
A business could eventually receive WhatsApp enquiries at a number it already owns. Twilio would deliver a signed webhook, Colzo would resolve the verified business by Twilio AccountSid PLUS the receiving (To) WhatsApp number, then pass the validated request into the existing receptionist orchestration. Website and WhatsApp would share approved knowledge, handling mode, escalation and lead workflow. The number and account binding must be owner-approved and enforced in the database. Customer-supplied business IDs, URL slugs, customer message bodies and From phone numbers must never determine the tenant.

## Mandatory compatibility check before connecting a number

| Existing use | Intended next step | Forbidden automatic action |
| --- | --- | --- |
| WhatsApp or WhatsApp Business app | Inform owner of Twilio's documented requirement to migrate the number away from the app. Twilio says the same number cannot continue using that app after standard migration. Review history/backup, continuity, consent and downtime before proceeding. | Delete WhatsApp account, detach app, send an OTP, or migrate the number |
| Another WhatsApp Business Platform provider | Review active Meta Business Portfolio, WABA, provider cooperation and migration eligibility. | Change provider, Meta 2FA, WABA, templates or sender registration |
| Already verified in Twilio | Check Twilio account/subaccount, approved sender, business owner and binding to this tenant. | Link by telephone number alone |
| Unregistered number | Confirm SMS/voice OTP capability, legal ownership and Colzo's Meta Tech Provider / Embedded Signup eligibility before owner-led onboarding. | Register a sender or buy a new phone number |
| Unknown | Stop and request compatibility details. | Guess or proceed |

Colzo is a software provider onboarding other businesses (ISV). Twilio direct-customer Self Sign-up is not a substitute for the ISV/Tech Provider workflow. A Twilio-connected existing number does NOT mean WhatsApp Business app coexistence is supported.

Sources:
- https://www.twilio.com/docs/whatsapp/migrate-numbers-and-senders
- https://www.twilio.com/docs/whatsapp/isv/register-senders
- https://www.twilio.com/docs/whatsapp/register-senders-using-api
- https://www.twilio.com/docs/usage/webhooks/webhooks-security

## Future owner UI (planned, not implemented)
More > Integrations > WhatsApp: current connection status, existing WhatsApp product selection, number ownership and OTP capability confirmation, an explicit migration warning, review of the business's Meta/Twilio arrangement, approval to enable AI mode and chargeable sends, pause/disconnect, status and cost visibility. Never ask for a business's WhatsApp password or OTP in Colzo.

## Proposed schema (DESIGN ONLY - no migration created/applied)
1. whatsapp_provider_connections: business_id FK, provider, provider_account_sid, verified admin approval, Meta WABA, status, dates; only server writes allowed.
2. whatsapp_sender_bindings: business_id plus connection FK, WhatsApp address, provider sender reference, verified status. Global UNIQUE(provider_account_sid,whatsapp_address) so one sender cannot belong to two Colzo tenants.
3. whatsapp_inbound_receipts: business_id, connection_id, provider_account_sid, MessageSid, status, event timestamps, minimal encrypted content and retention. UNIQUE(provider_account_sid,MessageSid) for atomic idempotency.
4. whatsapp_conversations: business_id, sender/contact link, last inbound time, opt-in/STOP state, human handover, retention clock.
5. whatsapp_delivery_attempts: account/binding, message/provider response, template category, delivery status, retries and redacted errors.

All tables must have tenant-scoped RLS, composite FKs and owner/administrator controls. Secrets remain server-side. Data retention, cross-tenant checks, export and deletion require approval of Colzo Privacy/DPA before real storage.

## Future inbound pipeline - NOT ACTIVE
1. HTTPS Twilio POST with limited form-encoded payload and exact configured callback URL (never trust request Host header).
2. Verify X-Twilio-Signature with the exact URL and form parameters using the authorised Twilio Auth Token BEFORE performing sender lookup. Reject tampering, duplicates, unsupported media and oversized messages.
3. Fetch verified routing binding by AccountSid and receiving To WhatsApp address, not by a customer-supplied business ID or From.
4. Atomically insert AccountSid + MessageSid receipt; ignore retries safely. No AI reply until durable deduplication is complete.
5. Apply authorised business, cost, safety, customer consent, human-first/balanced/AI-first, and approved-knowledge rules.
6. Create tenant-scoped lead/action using an internal authenticated service, not by spoofing the public enquiry API.
7. Respect WhatsApp's customer-service window and template restrictions; avoid unsolicited marketing; route HELP/STOP/human requests to the right manual process.
8. Send through an authorised Twilio client ONLY if costs are approved, channel is live, window/rules permit and content passes safeguards. Record status callbacks with signature verification and deduplication.
9. Provide an explicit pause/kill switch, send limits, provider errors and cost budget alerts.

## What has been implemented
- lib/whatsapp-existing-number.js: pure compatibility decision, strict Twilio form parser, HMAC signature check, isolated per-tenant sender lookup decision. No messages are transmitted or persisted.
- api/whatsapp-inbound.js: disabled by default (404); even if accidentally enabled, fails closed (503). Never acknowledges a message as delivered without persistence/processing.
- tests/colzo-whatsapp-existing-number.test.mjs: synthetic validations for migration review, signatures, tampering, tenant isolation, payload limits and disabled route.
- No Twilio dependency is required, no Twilio account is called and no billing is initiated.

## Release gates
- [ ] Complete Meta Tech Provider/ISV prerequisites and confirm sender eligibility.
- [ ] Owner authorises any disruptive migration and approves continuity/retention and costs.
- [ ] Implement audited owner-only sender binding and persistent unique receipt transaction.
- [ ] Validate signatures and callbacks with a provider sandbox, real tenancy RLS, adversarial webhook tests, retry/dedup and opt-out.
- [ ] Integrate one shared safe AI receptionist workflow; no invented bookings or unattended outbound publishing.
- [ ] Verify content consent, 24-hour customer-service window, templates, privacy/deletion, spend ceilings and pause.
- [ ] Test with owner-approved test sender, then explicit approval to connect customers.
- [ ] Do not alter Production, Pilot or existing WhatsApp numbers until authorised.

**Current release status: NOT CONNECTED / NOT AVAILABLE TO CUSTOMERS.**
