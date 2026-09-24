# Business AI Pilot architecture

Status: source-complete Pilot candidate. No Production deployment is authorised by this document.

## Runtime shape

Business AI is a static/mobile-first owner and public-customer web app backed by Vercel server routes and Supabase. Twelve physical Vercel API modules are retained; lower-volume operations are dispatched through `api/operations.js` so new features do not create extra Serverless Functions.

Private owner APIs verify the Supabase bearer token server-side and resolve exactly one `business_memberships` row. The browser never chooses an internal tenant. Public customer enquiries use a public slug which is resolved server-side to a business.

## Major domains

- Receptionist: `api/enquiry.js`, tenant configuration, approved knowledge retrieval, billing access and lead/handover persistence.
- Leads/operations: leads, history, pipeline, bookings, actions, handovers and team controls.
- Business setup: settings, `business_configurations`, resumable onboarding and public business routes.
- Knowledge: private Supabase Storage plus `business_knowledge_sources/items`; extraction is untrusted until owner/admin review.
- Billing: Stripe Checkout/Portal/webhook, tenant-owned billing state, durable usage and stale-event protection.
- Add-ons: server-owned catalogue plus tenant entitlements. AI Marketing is available only when entitled; AI Phone Calls remains Coming Soon.
- Marketing: business-aware generation, saved/edited drafts, owner approval, Meta connection foundation, Facebook publishing and server-side scheduling foundation.
- Privacy/operations: audit events, retention settings, owner export/anonymisation foundation and Pilot feedback.
- Voice: provider-neutral schema/adapter foundation, disabled by default.

## Trust boundaries

1. Browser input is untrusted, including IDs, prices, provider account IDs and uploaded documents.
2. Supabase Auth proves the user; membership proves the tenant/role.
3. Service-role access is server-only. Public/`authenticated` grants are intentionally narrow and backed by RLS.
4. Stripe prices and add-on mappings are server environment configuration, never browser authority.
5. Meta tokens are server-only and AES-256-GCM encrypted before database storage.
6. AI output is treated as draft/advisory data. Marketing requires explicit owner approval before external publishing.

## External services requiring live Pilot verification

- Supabase migrations/RLS/Storage and advisors.
- OpenAI Responses/Files calls and real latency/costs.
- Stripe Test Checkout, Portal and signed webhooks.
- Meta OAuth, app review/scopes, Page discovery and Facebook publishing.
- A server scheduler/cron calling the protected Marketing scheduler endpoint.
