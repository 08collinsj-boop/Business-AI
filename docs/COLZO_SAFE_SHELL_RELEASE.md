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

## Visual redesign v2: actual Colzo command centre

The first-stage brand-only shell was not sufficiently different from Business AI's dashboard. This second iteration incorporates the tested Graphite & Volt **command-centre hero, sizeable welcome panel, illustration, clearly grouped performance metrics, enhanced quick-action cards, responsive lime-highlight mobile navigation and desktop side rail**, plus updated Enquiries filters and Settings shortcuts. The presentation CSS was extracted from Colzo's existing design branch but *not* its unverified Projects/Clients/Quotes APIs or mutations. All legacy auth, billing, leads, bookings, AI and marketing functionality remains on the current Production-baseline code.

The original owner **Pilot checklist, first-run guide and pipeline remain visible and functional**; unlike the complete redesign CSS, this variant does not hide them. The new visual layout is covered by `scripts/colzo-owner-visual-smoke.cjs` at five viewports (fake records).

**This release is the redesigned owner shell and existing-feature layout, not the fully operational six-screen Projects/Quotes/Clients product.** No additional paid services or live database writes were introduced.

## 13 October: tested visual v2 correction

The owner's report that Colzo still looked like Business AI was accurate for the first safe-shell preview. The revised frontend adds the distinctive large Colzo command centre hero, graphite-and-lime metric cards, desktop left navigation rail, mobile app dock, premium Enquiries filters and Settings navigation cards. Nothing in the original auth, billing or enquiry server handlers is changed.

Browser check: `npm run verify:colzo-owner-visual` with test-only Playwright Chromium installed; five screen sizes, **simulated data and fake authentication state only**, screenshots in `/tmp/colzo-owner-visual`. This check covers actual browser layout for Home, Enquiries and Settings and checks no horizontal overflow, accessible five-tab navigation and static branding. It is not an authenticated live-account test.

The larger Colzo Projects/Clients/Quotes redesign is still on the separate Colzo feature branch. This first live-ready candidate must not be represented as the full six-screen product.

## Native Colzo owner workspace — structural UI replacement

A repeated owner acceptance finding was that the safe-shell **still looked like Business AI after sign-in**. The cause was structural: the original owner dashboard and five-tab navigation were still being shown, despite new colours and branding.

The new `#colzoOwner` interface **replaces the default authenticated owner presentation** with a standalone four-tab Colzo app (Home, Enquiries, Projects, More). Its native subpages include an enquiry detail, customer contacts and copy-only Quotes. Its own CSS, navigation, hierarchy and records are independent of the original dashboard DOM. Distinctive dark graphite/lime interface panels, trend charts and record cards are based on **existing authenticated tenant data**, not sample/fictional business metrics. The unchanged Business AI owner features are available through **More → original feature**, and include a clearly visible Return to Colzo control. New UI visibility remains strictly conditioned on `auth-ready` after original legal, business-membership and onboarding gates. Existing Supabase/Auth, Stripe, public customer portal, AI receptionist, marketing routes and database schema are unchanged.

**Scope:** The native Projects view currently shows **real existing bookings and actions** and says standalone Colzo project tracking is not yet enabled. Contacts remain enquiry-derived rather than saved Client entities. Quotes are **COPY ONLY** and never saved, approved, sent or billed. This is not the completed backend migration or the full six-screen product. Existing feature workflows stay in original screens until equivalent controls pass real authenticated testing.

**Acceptance:** `npm run verify` passes 580 application tests. `npm run verify:colzo-native` (optional test-only Playwright Chromium) passes all five viewports and covers Home, Enquiries/search/details, Projects, Clients, copy-only Quotes, More, legacy navigation, return link, logout hiding protected UI and responsive geometry. Fake accounts and records are used for browser tests; no user/customer data is changed. Staged authenticated verification and reversible cutover remain required before promotion to the live domain.

## Figma design-to-code pass (13 October 2026)

Figma file: `https://www.figma.com/design/wcdiGlxNa96O4hcmGgcsHx`, six editable 390×844 Colzo reference frames. The browser implementation now follows the actual reference geometry rather than the previous invented hero. The Figma Starter MCP quota was reached after accessing Home, Enquiries, and Projects design context; no upgrade or paid operation was undertaken. Settings and enquiry-detail layouts were reconciled against the previously rendered Figma screenshots and user-supplied concept image.

- **Home:** compact personalised time-of-day greeting (no fabricated account name), 3 real-data metrics, 6-month *enquiry* trend (never fictitious revenue), and four square quick actions matching the reference positioning.
- **Enquiries:** top-right search/add controls, All/New/In Progress/Won filters with counts computed from actual enquiry statuses, dark 92px customer cards, coloured status badges, full search, and detail navigation.
- **Enquiry details:** left-aligned initials + customer name/status, contact/scheduling controls, details and description panels, and clearly routed actions. Status editing remains in the original protected owner screen; there is no hidden backend mutation.
- **Projects:** three status tabs, genuine bookings and actions in compact rows, percentage progress only when *explicitly present in source records* and a geometric Volt promotional banner. No mock project statistics or manufactured completion percentages on real accounts.
- **Settings/More:** Figma-style account header and 7 settings rows, plus the original billing/AI/marketing/booking/client/quote tools retained under 'Other business tools'. The sign-out action uses the original authenticated sign-out button.
- **Security:** original Auth, DPA/legal/onboarding, RLS API, Stripe and customer portal code unchanged; unreleased Colzo quote editing remains copy-only and does not persist/send payments.

`npm run verify`: 580/580 pass. `npm run verify:colzo-native` browser checks pass at 375×812, 390×844, 430×932, 1366×768 and 1440×900 with synthetic tenant records and no live API requests. The code includes CSS layout controls scoped to `#colzoOwner`, without altering original Business AI functional CSS.

Still required before replacing Production: actual owner login / existing data acceptance in the staged environment, verified rollback and recoverable backup, plus release approval. This is a substantially more faithful frontend, but does not imply full backend-enabled Project/Client/Quote editing.

## iOS Safari / iPhone PWA scroll regression fixed (13 October 2026)

**User-reported:** the Figma-aligned Colzo owner screens could not scroll down after sign-in on iPhone. Root cause: the existing Business AI iOS CSS sets `body.auth-ready { height:100dvh; overflow:hidden }` and scrolls only the old `.app` element; Colzo's distinct `#colzoOwner` is a sibling of `.app` and had no own scroll container. Its below-fold content was thus unreachable.

**Change:** in `assets/colzo-native.css`, scope an independent `height:100dvh; overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior-y:contain` container to the active standalone Colzo owner shell **only on WebKit/iOS**. This leaves legacy Business AI's `.app` scrolling, login, legal screens, public/customer portal and desktop layout untouched, and preserves nested horizontal status filter gestures. Existing fixed Colzo navigation continues to stay visible.

**Regression:** `scripts/colzo-native-browser.cjs` checks the actual CSS rule and explicitly simulates Safari's body lock in Chromium; scrolls Home to the last quick actions and Settings to the lower business tools at 375×812, 390×844, 430×932, then scrolls back and tests all existing flows. Native WebKit binary is unavailable in the no-cost sandbox, so the fix needs owner confirmation on a physical iPhone from the new staged preview. Do not promote Production until authenticated acceptance.
