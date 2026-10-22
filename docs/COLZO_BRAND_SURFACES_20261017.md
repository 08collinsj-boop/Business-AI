# Colzo customer-facing surface migration — 17 October 2026

The public directory, business profile, enquiry assistant, customer portal, mounted security centre, older advanced settings, legal pages, embedded widget and both public website entries now use the Colzo Graphite & Volt surface system. The last stylesheet uses the supplied Stitch graphite/volt tokens, system typography, neutral cards, visible keyboard focus, safe-area spacing and reduced-motion rules. Existing native Home and locked Bookings layouts are retained.

Product labels, document titles, fallback marks, installation instructions and new system-generated record descriptions now say Colzo. Existing saved business names, record content, support addresses, domains, integration identifiers and authenticator enrolment metadata remain compatible. Existing records named Business AI are not silently rewritten. No account, business, factor, credential or consent-version changes are performed.

Public site links remain within development previews; existing public app-domain routing is retained elsewhere. Obsolete pilot checkout instructions and old UI screenshot galleries have been removed. Billing is honestly marked unavailable in this preview.

## Scope and acceptance

This is a visual migration, not certification of all 122 reference states. The 12 flagged designs remain unapproved. The live page QA report and implementation matrix retain outstanding functional issues and missing backend capabilities. Source-level UI coverage does not replace authenticated, mobile Safari or physical-device acceptance.

Five new regression checks cover entry styling and logo wiring, public asset resolution, widget identity/routing/deduplication, and preview versus public link routing. Existing backend, MFA, tenant isolation, billing and data tests are retained. Live preview verification and exact automated results are recorded after deployment.

Production and main are unchanged. Changes remain on feature/colzo-complete-ui-motion-20261017 and draft PR #26.

## Verification evidence

- `npm run verify`: 729 tests passed, zero failures; local validation checked 237 JavaScript files and secret/temporary-marker rules.
- Visual follow-up: eight focused public surface/site regression tests passed, production bundle rebuilt and local validation passed again.
- Live initial code preview: `f8a1ee1695af33d5060691e1bc0675fc1769cbc4`; Preview READY, `/api/health` 200, `/api/public-config` 200 with authentication enabled and the expected Business-AI-Dev Supabase target.
- Browser checks: customer directory initial/search/no-match/matched result; customer sign-in; legal centre; secondary public site with Dev-local app links; existing public profile and enquiry assistant. No messages, checkout, record writes or account/security changes were submitted.
- Live findings corrected: search icon overlap, remaining blue illustration effects, profile secondary labels and enquiry quick-action indicators. Embedded widget is included in the subsequent commit.
- Saved public profile data includes a Business AI business name and an uploaded Business AI promotional banner. These are tenant content, not product-shell branding, and have not been overwritten.
- Authenticated owner/customer portal acceptance on the newest origin, real iPhone Safari checks and physical-device motion measurements remain outstanding. The previous live-page report is historical and must not be read as acceptance of the new visual layer.
