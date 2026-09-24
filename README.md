# Business AI

Business AI is a multi-tenant AI receptionist and small-business operations Pilot. It combines a public enquiry assistant with owner-side leads, actions, bookings, knowledge, billing and optional AI Marketing.

## Pilot source status

The repository currently includes:

- Supabase Auth and server-resolved tenant/role authorization;
- public business-slug routing and AI enquiry/lead capture;
- AI handling modes, human/emergency handover and enquiry-session allowance accounting;
- leads, history, pipeline, bookings and actions;
- resumable owner onboarding and business configuration;
- private Business Knowledge uploads (PDF/JPG/PNG/WebP/TXT/CSV), extraction, review/approval and retrieval;
- Stripe Trial/Starter/Pro/Business billing foundations;
- server-controlled add-ons and AI Marketing generation/history/edit/owner approval;
- Meta OAuth/account-selection/Facebook publishing architecture plus server-side scheduling foundation;
- Pilot feedback, audit, retention and customer-data export/anonymisation foundations;
- provider-neutral AI phone-call foundations, intentionally Coming Soon;
- a conservative owner PWA that never caches authenticated API/customer data.

Nothing in this source package authorises a Production deployment. Live Pilot setup is documented in [`docs/PILOT_DEPLOYMENT_HANDOFF.md`](docs/PILOT_DEPLOYMENT_HANDOFF.md).

## Start here

- Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Security model: [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md)
- Environment setup: [`docs/ENVIRONMENT_SETUP.md`](docs/ENVIRONMENT_SETUP.md)
- Privacy/data controls: [`docs/PRIVACY_AND_DATA_CONTROLS.md`](docs/PRIVACY_AND_DATA_CONTROLS.md)
- Pilot deployment: [`docs/PILOT_DEPLOYMENT_HANDOFF.md`](docs/PILOT_DEPLOYMENT_HANDOFF.md)
- Knowledge uploads: [`docs/BUSINESS_KNOWLEDGE_UPLOADS.md`](docs/BUSINESS_KNOWLEDGE_UPLOADS.md)
- Marketing + Meta: [`docs/MARKETING_META_INTEGRATION.md`](docs/MARKETING_META_INTEGRATION.md)
- Stripe Pilot setup: [`docs/STRIPE_BILLING_PILOT_SETUP.md`](docs/STRIPE_BILLING_PILOT_SETUP.md)
- Voice foundation: [`docs/VOICE_RECEPTIONIST_FOUNDATION.md`](docs/VOICE_RECEPTIONIST_FOUNDATION.md)

Run the automated suite with:

```sh
npm test
```

Run the full local quality gate (tests + JS/inline-script syntax + secret/temporary-marker scan) with:

```sh
npm run verify
```

Copy `.env.example` only as a variable inventory. Never commit real `.env` files or server secrets.
