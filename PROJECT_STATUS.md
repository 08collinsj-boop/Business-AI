# Business AI Pilot source status

Last local audit: 2026-09-23

## Source-complete / locally verified

- Server-verified Supabase authentication, single-membership tenant resolution and owner/admin/member role checks.
- Tenant-scoped leads, history, pipeline, settings, bookings, actions, handovers, team and audit/lifecycle operations.
- Public slug-to-business routing without exposing or accepting an internal tenant ID.
- Resumable owner onboarding and mobile-first owner/public experiences.
- AI receptionist reliability pass: business instructions/context, approved Knowledge retrieval, off-topic handling, safer human/emergency detection, enquiry-session allowance semantics, reservation release on provider failure and distinct billing denial reasons.
- Private Business Knowledge upload/review/approval/replacement system for PDF/JPG/PNG/WebP/TXT/CSV.
- Stripe base-plan architecture for paid Trial (£3.99 / 7 days / 100 enquiries), Starter (£29/month / 250), Pro (£69/month / 1,000) and Business (£149/month / 3,000), including signed idempotent webhooks and stale-event protection.
- Server-owned add-on catalogue. AI Marketing is available as an entitlement; AI Phone Calls remains Coming Soon.
- AI Marketing generation using profile + approved Knowledge, saved draft library, editing/regeneration/deletion and owner-only approval for publishing.
- Stripe add-on purchase/cancel architecture using a server-configured Marketing Price. The Marketing add-on cannot be charged until its price is explicitly configured/approved.
- Meta foundation: OAuth state/CSRF protection, encrypted server-only tokens, server-discovered Facebook/Instagram account records, account selection, disconnect/revoke path, Facebook Page text-publish adapter and Instagram fail-closed media requirement.
- Marketing publication/scheduling records, atomic claim functions, protected server scheduler endpoint, status/failure reporting and duplicate-risk handling for ambiguous provider results.
- Lightweight Pilot feedback without automatic customer-conversation attachment.
- Retention controls plus owner data export/anonymisation foundations and a public data-use notice.
- Provider-neutral Voice data/adapter foundation remains disabled.
- Final source includes `.env.example`, architecture/security/integration docs and a Codex Pilot deployment handoff.
- Final local quality gate: **174/174 automated tests passing**, all JS/MJS syntax checks passing, inline app script parsing, no obvious secret patterns, and no temporary-code markers.

## Newest migration files not to apply to Production as part of this task

- `20260923190000_add_ai_enquiry_reservation_release.sql`
- `20260923193000_add_business_knowledge_uploads.sql`
- `20260923200000_add_marketing_publishing_and_feedback.sql`

Codex must inspect live Business-AI-Dev migration history and apply only outstanding migrations to Pilot/Dev in filename order.

## Deliberately requires live Pilot verification

- Supabase migration execution, RLS/Storage behaviour and security advisors.
- OpenAI live extraction/generation behaviour, latency and actual usage costs.
- Stripe Test checkout/portal/webhooks, renewal, cancellation, payment failure, out-of-order webhook delivery and eventual Marketing add-on Price.
- Meta app creation/review, current Graph API version/scopes, OAuth callback, Page discovery, token expiry and one harmless owner-approved Facebook Page post.
- Selection/configuration of a server scheduler for `/api/marketing-scheduler`.
- Authenticated mobile/browser smoke tests against the deployed Pilot.

## Product decisions still required

1. Final monthly price/allowance (if any) for the AI Marketing add-on.
2. Whether the Marketing add-on should be available to Starter, Pro and Business equally or have plan-specific limits.
3. The server scheduler provider/cadence and the scheduling precision Business AI will promise customers.
4. Final legal/privacy wording and support/incident ownership for real Pilot businesses.
5. Future Meta scope: media generation/upload for Instagram, analytics, campaigns/content calendar and automated suggestions. Publishing must remain owner-approved.
6. Future telephony provider/number/call-recording policy before AI Phone Calls can leave Coming Soon.

## Production

Production is intentionally unchanged. A Production rollout requires a separate explicit decision and the existing production rollout checklist.
