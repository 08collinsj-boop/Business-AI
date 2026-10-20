# Colzo Fluid Motion Pack v1 - Development implementation

**Status:** Safe Development candidate. Based on feature/colzo-complete-ui-motion-20261017. No Production release, hosting upgrade, provider action, schema migration, account reset, email or paid operation.

## Animation pack

Flutter/Material-motion-inspired transitions implemented natively with Web Animations API and scoped CSS. No Flutter rebuild or runtime/library addition.

- Owner Fade Through: 215ms, subtle opacity and 6px vertical arrival on real screen navigation, not on data refresh, filters, input changes or search.
- Owner card-to-detail: 300ms, restrained card-origin shared-element hint with bounded X/Y offset (max 36/28px) and 0.975 starting scale. The actual record layout, scroll and keyboard focus are never moved.
- Bottom navigation: retains existing animated Graphite & Volt selection and tactile press feedback.
- Bookings/Actions bottom sheet and command sheet: 290ms surface entrance with 180-200ms scrim fade, using existing dialog/sheet structure and drag/close controls. No overlay position changes.
- Customer portal directional Fade Through: 215ms between Home, Find, Enquiries and Account, with small forward/back shared-axis movement, while keeping real tab switching, account logic, search and forms.
- Reduce Motion: explicit media-query CSS fallback, owner runtime matchMedia and quiet-motion switch, plus cancellation of active WAAPI on preference change.

## Isolation and accessibility

- CSS loads after approved customer/owner styles and is scoped to #colzoOwner or body#colzoApp.customer-account.customer-portal-ready. Sign-in/sign-up/recovery and legal overlays have no new selectors or logic.
- No scroll locks, position changes, height overrides or unsupported feature claims.
- No new API calls, persisted state, data changes, extra dependencies or auto-saving.
- Existing screen reader announcements, focus restoration, keyboard support and DOM hidden/aria-current remain authoritative.

## Verification

- New contract/regression tests, existing owner motion and customer navigation tests, Build and local static verification.
- Synthetic Chromium browser on existing real Colzo HTML/CSS/JS: 14 owner screens navigated, bookings sheet opened/closed, actual customer Supabase/portal interface mocked without external calls, customer tab direction and exactly one visible pane, viewport scroll width within device width, owner/customer Reduce Motion. Zero page errors or external writes.
- Outstanding: real iPhone Safari animation/keyboard/scroll and long-form acceptance, actual authenticated Dev owner/customer sessions, narrow Safe Area and Android/desktop check, full repository suite PGlite migration fixture and broad security/release acceptance.
- Avoid merging with the unmerged Marketing strategy editor branch without reviewing overlap in assets/colzo-native.js. That editor was preserved in a stash and is NOT included in this pack.

## Launch

Development demo only. Animation approval does not mean feature functionality, security or public launch is approved.

## Final Development test checkpoint
- Full non-PGlite test suite: 1,121 PASS, zero failures, zero skips, 173 test files. The single PGlite lead-version migration test is excluded due its historical SIGKILL in this memory-limited remote container; it remains a launch gate, not a PASS.
- Browser-driven owner/customer test passed after supplying the loading-screen controller in the isolated harness: 14 owner screens, actual Work dialog entrance, 5 customer tab switches with correct direction and aria-current, 390px viewport fit, no unintended writes and zero browser exceptions. System Reduce Motion disabled owner WAAPI, sheet animation and customer pane animation.
- CSS and JS syntax checks, npm run build, npm run verify:local, and git diff --check PASS.
