# Colzo WhatsApp - persistent development inbox (synthetic-only)

## Status - 16 October 2026

An **isolated demo-only persistence layer** was created for Colzo on the WhatsApp
feature branch (draft PR #17). The schema was applied to Supabase
**Business-AI-Dev** (project `mvwseobgkexzpmmkgcxe`) only. It was **not**
applied to Production or Pilot. This does **not** connect WhatsApp or Twilio,
register numbers, acknowledge webhooks, receive real messages, generate live AI
drafts, or send anything. No paid provider infrastructure was created.

## What is stored

`public.colzo_whatsapp_demo_threads` contains at most three **fixed fictional**
sample conversations per tenant, keyed by `(business_id,fixture_key)`. These
records contain sample customer labels, artificial dialogue, review-only drafts,
human-review status and an optimistic `updated_at` version. They contain no
real phone number, sender identifiers, tokens or live customer enquiries.
The separate proposed provider connection / inbound-receipt schema remains
review-only and has **not** been applied.

## Security contract

- Database RLS is enabled. `anon` has no table privileges.
- `authenticated` has SELECT only, scoped by `business_memberships` to
  the same tenant's `owner` or `admin`. It cannot INSERT, UPDATE or DELETE.
- Server-side operations require Supabase-verifiable authentication,
  `TENANCY_AUTH_ENABLED=true` and admin/owner membership. POST/PATCH require
  AAL2 MFA. Business ID comes **only** from verified membership.
- This handler is disabled unless `COLZO_WHATSAPP_PERSISTENCE_ENABLED=true`
  AND the configured `SUPABASE_URL` host exactly equals
  `mvwseobgkexzpmmkgcxe.supabase.co`. A shared or Production host fails
  closed even if the toggle is accidentally set.
- GET lists the calling owner's records. POST idempotently seeds fixed synthetic
  fixtures with `ON CONFLICT DO NOTHING`; supplied customer text/phone/business
  fields are rejected. PATCH only moves `review -> human` with both tenant,
  fixture ID and expected timestamp in the atomic database predicate. Stale
  updates return 409. Human handovers cannot reopen/recreate AI drafts.
- No DELETE, outbound WhatsApp operation, provider webhook, cron, live AI call,
  customer-data import or service key in browser code exists.
- Service-role access remains server-side only; the UI uses the existing
  authenticated `api()` helper. Content is HTML-escaped on rendering.

## User experience

The original in-memory Graphite & Volt WhatsApp demo loads by default and
does not call any API. There are two explicit opt-in actions in the demo:
**Load saved demo** (secure read) and **Save fictional chats** (secure synthetic
seed then read). Saved conversations can be marked for human handling, persisted
across reloads and devices for the same authorised business. Reload does not
silently seed. **View local demo** restores the in-memory view without deleting
saved records. Every view says WhatsApp is **not connected** and nothing is sent.

Endpoint `/api/colzo-whatsapp-inbox` is rewritten through the existing
`/api/operations` dispatcher to avoid a thirteenth Vercel serverless function.
It is not `/api/whatsapp-inbound`; provider webhook remains nonexistent.

## Authentication transition safety

In-flight owner inbox requests are guarded by a monotonically increasing
session revision. Colzo calls `ColzoWhatsAppDemo.reset()` at sign-out; any
pending read, seed, human handover or rejected request from that old session is
discarded rather than repopulating conversation data or errors after logout.
The reset also releases the local busy flag so a subsequent authorised account
can begin a fresh request. Three regression tests cover late reads, stale
failure after account switch and delayed human handover. This is client-side
privacy defence in depth; server-side tenant authorization remains mandatory.

## Deployment boundaries

The branch and PR must remain draft and unmerged until broader approval. Do not
globally enable persistence on a shared preview / Production project. If a
development-only preview is desired, set the feature flag **only for that
specific isolated branch environment**, verify it uses the known Dev Supabase
host with real owner/admin MFA, and test GET/seed/handover/reload with fictional
data. This stage did not change Vercel secrets, environment variables or publish
Production.

## Verification and next stage

Focused tests: `node --test tests/colzo-whatsapp-persistent-*.test.mjs tests/colzo-whatsapp-native-inbox.test.mjs`.
Also run `npm run verify` from a complete checkout before merging. RLS, grants
and policy must be checked directly in Dev Supabase. End-to-end authenticated
browser and concurrent real PostgreSQL update testing are still required.

For live WhatsApp, design a **separate** owner-approved provider connector,
signature-verified webhook, atomic receipt deduplication, consent / retention,
approved-knowledge handover and bounded cost controls. Nothing in this demo
can be treated as approval to migrate existing business numbers.

## Offline authenticated-flow browser acceptance

Run `node scripts/colzo-whatsapp-persistent-browser.cjs` after installing a
compatible Playwright package and local Chromium browser in a disposable QA
environment. This test serves only local static HTML, CSS and JavaScript.
`tests/fixtures/colzo-whatsapp-persistent-browser.js` is an explicitly **fake**
owner-authenticated API backed by memory, not Supabase, Twilio or real accounts.
It checks four mobile/desktop viewport sizes, synthetic business A/B isolation,
AAL2 rejection in the fake API, stored human handover, late-response cancellation,
HTML layout/scrolling, disabled sends and zero external network requests.

These browser results **do not** verify real Supabase membership checks, actual
MFA enrolment, database concurrency, serverless configuration, Twilio signatures
or live WhatsApp delivery. Those require separately approved authenticated Dev
acceptance before changing any production-facing integration.
