# Colzo customer-facing surface migration — 17 October 2026

The public directory, business profile, enquiry assistant, customer portal, mounted security centre, older advanced settings, legal pages, embedded widget and both public website entries now use the Colzo Graphite & Volt surface system. The last stylesheet uses the supplied Stitch graphite/volt tokens, system typography, neutral cards, visible keyboard focus, safe-area spacing and reduced-motion rules. Existing native Home and locked Bookings layouts are retained.

Product labels, document titles, fallback marks, installation instructions and new system-generated record descriptions now say Colzo. Existing saved business names, record content, support addresses, domains, integration identifiers and authenticator enrolment metadata remain compatible. Existing records named Business AI are not silently rewritten. No account, business, factor, credential or consent-version changes are performed.

Public site links remain within development previews; existing public app-domain routing is retained elsewhere. Obsolete pilot checkout instructions and old UI screenshot galleries have been removed. Billing is honestly marked unavailable in this preview.

## Scope and acceptance

This is a visual migration, not certification of all 122 reference states. The 12 flagged designs remain unapproved. The live page QA report and implementation matrix retain outstanding functional issues and missing backend capabilities. Source-level UI coverage does not replace authenticated, mobile Safari or physical-device acceptance.

Five new regression checks cover entry styling and logo wiring, public asset resolution, widget identity/routing/deduplication, and preview versus public link routing. Existing backend, MFA, tenant isolation, billing and data tests are retained. Live preview verification and exact automated results are recorded after deployment.

Production and main are unchanged. Changes remain on feature/colzo-complete-ui-motion-20261017 and draft PR #26.
