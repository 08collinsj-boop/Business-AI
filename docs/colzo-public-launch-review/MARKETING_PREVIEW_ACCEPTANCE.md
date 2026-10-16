# Colzo pre-launch marketing preview - acceptance notes

**Status: isolated visual preview only - not approved for publication or live checkout.**
Prepared separately from Work's authenticated application development in PR #19.

## Preview entrypoint

- Static page: /colzo-preview.html
- Styles: /assets/colzo-marketing-preview.css
- Automated source checks: tests/colzo-marketing-preview.test.mjs
- Synthetic Chromium visual QA: scripts/colzo-marketing-preview-browser.cjs
- Existing public marketing.html, app sign-in, legal agreements, Vercel routing and Production are not changed by this work.
- The preview includes noindex, nofollow, noarchive, is not linked in main app navigation, and has no scripts, web API calls, forms, checkout links or customer-data collection.

## Design decisions

Graphite & Volt visual direction:
- near-black graphite canvas with lime accents
- compact top navigation, reassuring hierarchy and mobile-first card grid
- explanatory app illustration prominently labelled "Illustrative interface - sample data"
- six simulated viewport sizes: 320x690, 375x812, 390x844, 430x932, 768x1024 and 1366x768
- keyboard focus visible, skip navigation, safe-area footer and reduced motion styling

Conservative product wording:
- Booking request rather than booked/confirmed
- Draft quote, project and customer records rather than implying a sent quotation
- Human handover and approved knowledge for website AI receptionist
- Marketing drafts with approvals; no claim that Facebook, Instagram, WhatsApp or AI phone integrations work for any business
- clear statement that the intended workflow remains subject to authenticated Dev acceptance
- trial/subscription prices are indicative and do not initiate checkout. The optional Marketing price is stated separately. Free Pilot is not conflated with the paid £3.99 trial
- no priority support SLA, universal passkeys or "always available" assertion

## Launch integration work remaining

1. Work validates core customer journeys, Dev project identity and account/MFA/business access; no account recreation.
2. Owner approves current operator/trading identity, contact route, legal agreement versions, rights-request channel and appropriate commercial hosting.
3. Work verifies plan limits and Stripe TEST prices, cancellation wording and entitlements; do not enable live checkout before signed release approval.
4. Compare this concept with accepted Stitch references and confirm final landing design before replacing any public page.
5. Link live login and legal routes only after they are verified on the final launch host. Do not link legacy Business AI services or guessed Colzo domains.
6. Update metadata, sitemap/robots policy and actual site routing only as part of a separately authorised publication.

## Technical verification

- node --test tests/colzo-marketing-preview.test.mjs
- NODE_PATH=/path/to/playwright/node_modules PLAYWRIGHT_BROWSERS_PATH=/path/to/browsers node scripts/colzo-marketing-preview-browser.cjs
- npm run verify
- Check git diff --check and inspect the draft PR file list for live configuration changes.

## Risk guardrails

Not an offer to subscribe, a legal policy, a verified feature certification, an uptime guarantee or an accessible live demo of Supabase. QA screenshots are illustrative with no user account data. No customer records were read, no integrations contacted and no charges authorised.
