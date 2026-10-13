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

## 13 October — consistent Graphite & Volt styling for existing owner tools

- Introduced `assets/colzo-legacy-theme.css`, loaded **after** the native Colzo owner stylesheet, with styles strictly scoped to `body.colzo-owner-enabled.auth-ready.colzo-legacy-mode`. This rebrands the existing owner-only Booking, Action, AI, Marketing, Billing, Settings, Team, Business Profile and Add-on screens to the same graphite panels, lime accents, typography hierarchy, form fields and buttons.
- Preserved backend/auth/customer portal/Stripe/legal logic; never globally restyle public/customer/login states. Specific alert/danger and cancellation controls keep their safety meaning; no billing API or publishing state changed.
- Updated select *owner presentation labels* from Business AI to Colzo while preserving API routes and legal text. Added a mobile-safe Back to Colzo control above the original dock, with lime-coloured legacy active indicators.
- Fixed an existing Marketing DOM reorder error in `assets/final-showcase.js`: moving Schedule before History now checks History is actually a direct child of the tabs node. This is a defensive front-end guard; it does not change tab identifiers, approval controls or publishing.
- `npm run verify` passes (583 tests including 3 static theme-contract tests); `npm run verify:colzo-native` now visits original Bookings/Actions/Marketing/Settings/Business Profile, checks computed graphite styling and no overflow at five screen sizes, and captures Marketing and Settings screenshots for visual review.
- The original fully integrated customer-facing flows remain intentionally unchanged. Visual checks with mock data do not replace authenticated real-account acceptance before Production cutover.

## Colzo MFA gate visual consistency — 13 October 2026

The original two-step verification (TOTP/AAL2) overlay is injected **outside** both Colzo owner screens and the legacy owner app (`securityMfaGate`, appended to `document.body`). It was still rendering with a blue panel and “open Business AI” prompt after the Graphite & Volt visual release.

- Added `assets/colzo-mfa-theme.css`, loaded after other Colzo styles; selectors require the Colzo app shell and `#securityMfaGate`. Sets graphite background, volt accent, readable numeric input and properly differentiated Verify, Cancel and Log out actions, including safe scrolling on small screens. Existing authenticator code handling, blocking-session requirements, API endpoints and access decisions are **unchanged**.
- Updated only user-facing strings in `assets/security-center.js` to Colzo. **The TOTP `friendlyName:'Business AI'` is retained** so existing authenticator setup naming/identifiers are not unexpectedly changed or re-enrolled.
- Added `tests/colzo-mfa-theme.test.mjs` to assert visual scoping and preservation of challenge/verify/AAL2 requirements.
- Added `npm run verify:colzo-mfa` browser test that runs the **real MFA overlay and AAL1→AAL2 blocking prompt** with synthetic, local-only authentication and simulated verified TOTP factor at 375×812, 390×844, 430×932 and 1366×768. No actual authenticator code, security service, customer data or real account credentials are used. Screenshots under `/tmp/colzo-mfa-qa/`.
- Production is not modified; owner should use the new staging URL and confirm the prompt looks correct after signing in with their existing account.

## Security choices: authenticator now, passkeys behind an explicit opt-in — 13 October 2026

The Colzo login and post-onboarding account security settings now offer a consistent Graphite & Volt selection of authentication options. This is an additive frontend integration on the existing Supabase Auth backend; existing users, passwords, enrolled TOTP factors, sessions, customer data, Stripe and production are unchanged.

**Working now**

- **Authenticator app:** the existing Supabase Auth TOTP factor enrollment, 6-digit verification, required AAL2 challenge and factor-removal safeguard remain unchanged. Users select this method directly in the new account-security choice card; the new account onboarding offers the same route once business setup finishes. Security in native Colzo Settings now deep-links to the original proven security management panel rather than a generic Settings overview.
- **Device passkeys (Face ID, Touch ID, fingerprint, device PIN/security key):** experimental Supabase capability is wired, but disabled by default via `COLZO_PASSKEYS_ENABLED`, absent in existing Vercel environments. The browser-safe `/api/public-config` only reports a boolean flag, not any secret. The passkey sign-in and registration controls additionally require a secure context, WebAuthn support and the actual `auth.signInWithPasskey` / `auth.registerPasskey` SDK methods. The Supabase Auth client receives `auth.experimental.passkey=true` **only when explicitly enabled**. The existing password login stays available. Passkeys **do not automatically replace enrolled TOTP AAL2 second-factor requirements**; the registration path first requires the existing AAL2 challenge when applicable.
- **SMS/phone:** not enabled. No messaging provider, paid plan, new database or cost-generating service was created.
- **Recovery:** existing email/password recovery and TOTP security controls remain unchanged. Before passkeys are activated publicly, document and test account recovery, lost-device scenarios and support response; do not make biometrics the sole way to access an account.

**Activation gates (HOLD — never silently turn on)**

1. Verify compatible Supabase Auth supports passkeys and the selected `supabase-js` version is >=2.105.0. Supabase passkeys remain experimental, so expect SDK changes.
2. Configure **Supabase Authentication → Passkeys** on a verified safe environment and register a stable WebAuthn relying-party ID and allowed HTTPS origins tied to the final Colzo domain. Do **not** use a disposable Vercel preview domain as the long-term relying-party ID, which would strand passkeys when preview URLs change.
3. Confirm no new charges, independent real-device testing on Face ID, Touch ID/fingerprint, and non-biometric browsers; verify AAL1 vs AAL2 policies, session recovery, lost-device fallback, logout and old enrolled TOTP factors.
4. Only after those checks, explicitly set the environment flag. Never modify Supabase Auth configuration or owner accounts during development without a verified rollback/restore plan and approval.

**Regression QA**

- `npm run verify`: 589/589 tests pass, including strict default-off public config and account security options contracts.
- `npm run verify:colzo-security-methods`: browser QA uses synthetic account data; tests both disabled and enabled feature-flag states, account-setup choices, authenticator enrollment and passkey method invocation. Never contacts Supabase, SMS, real accounts or production.
- Existing `npm run verify:colzo-mfa`, `npm run verify:colzo-native` and `npm run verify:colzo-owner-visual` continue to pass at their supported mobile/desktop sizes.

**Product scope:** these changes make Colzo's account security UX consistent and more app-like; they do **not** complete native Projects, Clients and saved/sent Quotes, nor imply passkey support is live for Pilot users.

### Additional verified safeguards and SDK references

The first-time security selector now checks the actual Supabase MFA snapshot and does **not** offer a replacement setup while any verified TOTP factor is attached. During a mandatory AAL2 challenge, **both** the original Business AI owner workspace and the standalone Colzo owner workspace are `inert`; any optional setup overlay is removed, and the enforced authenticator overlay remains active until the factor is verified or the session ends. After challenge completion both owner workspace inert flags are cleared. The sign-in passkey button also stays hidden unless the feature flag, secure context, WebAuthn and experimental SDK method are all present.

Supabase implementation references (consult before activation):
- https://supabase.com/docs/guides/auth/passkeys — experimental opt-in, >= v2.105.0 and WebAuthn relying-party requirements
- https://supabase.com/docs/guides/auth/auth-mfa — TOTP/phone enrollment and AAL1/AAL2 distinctions

`npm run verify:colzo-mfa` now explicitly checks that both owner screens are inert while MFA blocks access. `npm run verify:colzo-security-methods` confirms existing verified TOTP owners are not shown a setup modal, while a fresh mock owner can choose the working authenticator path; simulated passkey paths are only tested with a fully stubbed SDK and do **not** mean Supabase passkeys were enabled or proven on a real device. The verified current release gate remains **HOLD** for public passkeys.

## Colzo / FLUID — full owner motion and navigation overhaul

Implemented `assets/colzo-motion.css` and updated the standalone Colzo owner shell with real vector-tab icons, a moving active selection plate, directional native page entrances and staggered list/card reveals, animated real-data trend/progress, contextual hover/press feedback, smooth legacy-view transitions and matching login focus/press treatment. Added a Spotlight-like tool finder with Cmd/Ctrl+K, focus trapping, Escape close, title-prioritised search and direct links to actual existing owner tools. Preserved per-screen scroll state without losing the iOS independent owner scroll fix. Native Projects now includes real in-page search. Accessible one-line announcements avoid repeated screen-reader reads of every search result, and all private UI states clear on sign-out. Fully honours reduced-motion preferences. Detailed design values and QA instructions: `docs/COLZO_MOTION_SYSTEM.md`.

None of the motion system writes customer records, changes authentication policies, enables experimental passkeys, modifies billing or deploys to the live domain. No extra services/charges. Real authenticated staging verification is still required before live cutover.

## Native Colzo Settings pages — no automatic fallback to Business AI

**User-reported:** all seven Settings rows looked like Colzo but redirected to the original Business AI `settings` / `businessProfile` views. Root cause: the native More screen had each `data-cn-legacy`, not a real Colzo detail route.

**Fix:** added seven proper native Settings detail pages (Business profile, Team members, Integrations, Notifications, Appearance, Security, Help & support), visually matching the six-screen Colzo reference. Each row now uses `data-cn-setting`, supports an animated native detail screen and back navigation, and keeps Colzo's own four-tab shell visible. The profile summary and duplicate Other tools shortcut now also point to native screens. Existing advanced services remain reachable **only via clearly labelled secondary buttons**, so the original functional editors are not abandoned.

**Functional integration:**
- Business profile: editable business name, type, phone, contact email, location; submit sends **only those five approved fields** to the existing tenant-authenticated `/api/settings` PATCH endpoint and synchronises the current owner settings. Website/images and richer public profile controls remain behind an explicit advanced editor link.
- Team: existing owner-scoped `/api/team` GET shows members and invitation states; a separately submitted staff/admin form creates an existing secure invitation. Confirmation and the acceptance link persist across the in-page team refresh **only in memory** and offer a Copy link control, not a forced navigation or automatic email send. Owner roles and server permissions are unchanged. Sign-out clears invitation data from the Colzo shell.
- Integrations: explains where existing social posting, website widget, and public profile connections are managed, without invented connection statuses. The sensitive setup actions are explicit, never silent redirects.
- Notifications: shows real browser permission state, links to existing follow-up settings and clearly says web push delivery is not yet enabled. It **does not** request a useless permission or claim push alerts are active.
- Appearance: meaningful dark-mode presentation (as in reference), an in-memory reduced animation toggle, compact record density; respects OS-level reduced-motion and resets display preferences after sign-out. No new local tracking or cookies.
- Security: Colzo-native explanation of mandatory TOTP and optional experimental passkeys, with a clearly labelled path to existing AAL2-protected security centre. No password reset, factor enrolment, or MFA bypass occurs during page viewing.
- Help & support: native information screen and explicit links into existing protected feedback/help tools.

**Verification:** `npm run verify` → 594/594 pass, including three new static contract tests. `npm run verify:colzo-settings` → all seven pages, no forced legacy navigation, form validation, fake authenticated settings PATCH, mock team invitation, motion/layout choices and sign-out privacy at 375×812, 390×844, 430×932, 1366×768 and 1440×900. Existing native, motion, MFA, passkey setup, login and PWA browser tests also pass. All browser API calls use synthetic fixture data; no customer changes during tests.

**Production release remains HOLD** pending authenticated staging acceptance and verified rollback. Old advanced controls are deliberately retained behind explicit action links, and unfinished push notification/passkey features are not represented as enabled.

## Native Bookings and Actions — Colzo-only UI (13 October 2026)

Implemented the first major conversion away from the original Business AI UI using the existing APIs and no database migrations. Verified via the installed **Lumen UI** dialog, form, segmented-control, calendar and accessibility contract guidance; implemented in Colzo's current zero-dependency vanilla-JS system rather than installing another UI runtime.

### Native pages and destinations

- **Bookings:** Full Colzo screen with month-by-month calendar and real booking indicators, actual-record stats, Active/All/Completed/Cancelled status filtering (non-finalised bookings are shown as open), search, detail editor, create form with optional linked enquiry, customer name, start/end, location and notes. Supports the existing statuses and authenticated tenant-scoped `/api/bookings` POST/PATCH. Explicit confirmation warns that completing a booking may prepare a review request when enabled in the original account settings. No silent publishing or payments.
- **Actions:** Full Colzo screen with counts, Open/All/Completed/Cancelled filters, searchable priority-labelled task cards, create/edit form, due date, optional linked enquiry, task type, notes and status. Supports existing `/api/actions` POST/PATCH and keeps the original server restrictions on review-request actions.
- **Navigation:** Home booking tile, Enquiry scheduling shortcut, Projects cards, More tool list, relevant Settings actions and universal tool finder all link to Colzo-native Bookings/Actions. **No automatic old-UI redirect for either section**. Other advanced legacy services are unchanged until their own native replacements pass acceptance.
- **App resilience:** Dialog portalled above bottom navigation; keyboard Escape/Tab containment, protected action ordering, server response validation, form data retained on failed API requests, date/time validation before writes, no false 1970 date for records without a time. Existing owner-scoped `api()` wrapper continues to enforce Supabase Auth, session checks, MFA and the underlying tenant access; all operations require explicit Save.
- **Design:** Implemented in `assets/colzo-workflows.css`, reusing Graphite & Volt palette, reference typography, status accents, calendar rhythm and reduced-motion preferences. No new backend, user accounts, subscriptions or billable service.

### Validation and release conditions

- Full app verification: `npm run verify` **597/597 PASS**.
- Mock-browser `npm run verify:colzo-workflows`: **5/5 viewports** (375×812, 390×844, 430×932, 1366×768 and 1440×900) PASS, including real click geometry, native forms and CRUD via **synthetic mocked** GET/POST/PATCH, date validation, failed server save retains entered details, session-authentication wrapper, accessibility dialog focus, original old UI never shown for these routes, navigation from Home/Projects/More/search, no live API calls.
- Existing `verify:colzo-native`, `verify:colzo-motion`, `verify:colzo-settings`, `verify:colzo-mfa`, `verify:colzo-security-methods` and `verify:colzo-owner-visual` all green at their supported viewports.
- No real customer writes or real auth tokens in acceptance tests; no changes to `/api/bookings`, `/api/actions`, Supabase schema, Stripe, Marketing automation, Meta, Production app or domain mapping.
- **Remain in development:** Real owner sign-in and non-destructive acceptance still required before live Colzo switch. Enquiry editing, full Projects/Clients/Quotes and native Marketing/Receptionist/Billing need subsequent separate conversions. The Colzo preview can write real account bookings/actions **only when the signed-in user deliberately saves**; do not use real customer records for arbitrary test data.
