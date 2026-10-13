# Colzo — first-stage safe-shell candidate, not the complete replacement

**Purpose:** Introduce the Colzo name, approved Colzo icon and Graphite & Volt visual styling into the **currently deployed** Business AI source, without bringing across the unfinished 89-file redesign or changing existing backend routes, accounts, marketing automation, Stripe or customer data.

## Provenance and exact boundaries

- Parent commit: `91b0d6efc9c68d8067e40bd1716aaa654237e226` (verified active Business AI Production SHA on 13 October 2026, Vercel deployment `dpl_6aTd232EYYZDRH1y3ypZuwaE97xS`).
- Only presentation/PWA files are changed: `index.html` brand and navigation labels; `manifest.webmanifest` name/icons; `sw.js` static public icon cache version/path additions; a new scoped Graphite & Volt stylesheet and icon images. Existing owner, customer, billing, API and integration implementations remain untouched.
- The `data-view="leads"` programmatic route deliberately remains unchanged despite the visible **Enquiries** label, so saved workflows and internal navigation still work.
- Legal terms, operator identity, DPA, billing plan details and customer-facing offer claims **are not silently rewritten** by the cosmetic release. A brand-wide legal and support-content review remains needed before declaring the entire platform fully rebranded.
- There is **no new Projects/Clients/Quotes editing UI** in this limited candidate. Those still belong to the separately tested Colzo redesign branch.
- The existing Service Worker continues to cache **only allowlisted public static icon assets**, not navigations, auth tokens or customer/API responses.

## No-cost verification

Run `npm run verify`: all existing 574 application/static tests, plus the new safe-shell/backend-contract tests, must pass. The test suite freezes SHA-256 hashes of the five highest-risk current backend modules (`lib/auth.js`, `api/operations.js`, `api/leads.js`, `lib/billing-handler.js` and `lib/customer-portal-handler.js`), failing if they change.

Optional free Chromium acceptance with intercepted fake Supabase Auth and no live API calls:

```sh
NODE_PATH=/path/to/test-only/playwright/node_modules node scripts/colzo-safe-shell-browser.cjs
```

Five viewports 375×812, 390×844, 430×932, 1366×768 and 1440×900 must show Colzo splash, auth/owner brand and PWA metadata, graphite styling, and the original Home/Enquiries/Actions/Bookings/More application routes without horizontal overflow.

## Release still on hold

**Do not promote to Production automatically.** The original live project is healthy, but the full Colzo preview on the original project lacks Production-auth-equivalent preview configuration. This small candidate is intended to be tested as a preview on the **existing Vercel project** first. Even a passing preview build is not an authenticated Production certification.

Before any live switch: verify exact active deployment ID/rollback, an existing restorable database backup (no new paid service), original owner and member roles in a safe environment, legal/support naming, PWA update and core customer/AI/marketing/billing navigation; then get explicit release sign-off. If essential checks cannot be made without exposing live credentials or spending money, pause rather than taking shortcuts.
