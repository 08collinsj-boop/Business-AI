# Colzo WhatsApp - isolated native Inbox demo + synthetic message processor

**Status:** Development-only, unmerged, not connected. No Twilio sender, customer
account, WhatsApp Business number, message send, database migration, charges or
Production change. Do not deploy this branch for real customer messaging.

## Native Graphite & Volt design

The two assets, assets/colzo-whatsapp-inbox-demo.js and
assets/colzo-whatsapp-inbox-demo.css, create a self-contained **WhatsApp inbox
(demo)** in the Colzo **More** menu and command search, isolated to this feature
branch. Three fictional conversations demonstrate:

- A clear **Not connected / Demo only** banner;
- All, Needs review and Human conversation filters;
- A conversation and AI suggestion detail view with **REVIEW ONLY** labelling;
- A temporary **Mark for human** action and a **Reset demo** button;
- Responsive graphite panels, Volt selection and keyboard focus indicators.

Everything uses code-defined **fictional fixtures** held in temporary browser
memory. No real phone numbers, account details, Twilio tokens, business names,
or customer data are shown. The demo has **no send, approve-and-send, upload,
connect-number, live AI, booking-save or public-enquiry write action**.
Reload/sign-out resets the fixtures. Existing Colzo Settings, Bookings, Enquiries,
Marketing, authentication and protected APIs remain unchanged.

The separate library module lib/whatsapp-synthetic-processor.js is a
**test-only** signed-message processor layered on existing signed shadow flow.
It checks explicit verified sender account and business bindings, inserts an
in-memory duplicate receipt before asynchronous draft generation, and returns
review-only drafts or human handover. No server, Twilio or DB is contacted. The
processor does not feed the mock UI; both are safely independent fixtures.

## Verification

- The synthetic processor test covers HMAC validation, tenant mapping, 15
  simultaneous duplicate deliveries, STOP/human mode and no I/O.
- The native inbox test checks menu and command routing, safe HTML escaping,
  asset ordering, filter/handover/reset behaviour, logout cleanup and no sends.
- Run the complete npm run verify command for all repository regressions.
- Optional isolated Chromium QA uses a disposable local Playwright installation.
  Run node scripts/colzo-whatsapp-inbox-browser.cjs for four widths
  (375x812, 390x844, 430x932 and 1366x768), graphite computed styles,
  visible filters and handover, no horizontal overflow and zero API calls.

The test-only standalone file tests/fixtures/colzo-whatsapp-inbox-demo.html
simulates Colzo owner styling without signing in, to avoid real customer account
access. It is **not** end-to-end authenticated production navigation proof.

## Strict live activation blockers

1. Validate and approve tenant schema separately; do not auto-apply anything.
2. Add server-side Twilio webhook, exact URL signature verification, verified
   sender routing and durable atomic de-duplication.
3. Integrate real Colzo approved-knowledge receptionist, consent and human
   handover with tenant RLS and persistent queue.
4. Respect the WhatsApp 24-hour window, templates, STOP and cost limits.
5. Confirm Twilio/Meta ISV rules, existing-number migration, owner approval,
   privacy and retention arrangements.
6. Complete owner-approved sandbox end-to-end testing before any real sender,
   number migration or outbound messaging.

**api/whatsapp-inbound.js remains disabled and fail-closed.** The schema
proposal remains under docs/sql-proposals, never applied to a Supabase project.
