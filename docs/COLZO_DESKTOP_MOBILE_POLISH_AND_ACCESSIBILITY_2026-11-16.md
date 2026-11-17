# COLZO — desktop/mobile polish and browser-accessibility acceptance
**16 November 2026 | Internal synthetic QA; NOT protected Preview or iPhone Safari acceptance.**

## What is concretely covered
- The real static Colzo app is loaded in headless Chromium from localhost with fictional records and intercepted APIs. No real user authentication, provider calls, customer data, billing, Production or protected Preview.
- Native responsive widths: **375×812, 390×844, 430×932, 1024×768, 1280×800, 1366×768 and 1440×900** (individual suites have their own scoped viewport sets).
- `scripts/colzo-native-browser.cjs`: native desktop overview and 4 data-grounded KPIs, mobile scrolling when body is locked (iOS-like constraint emulated in Chromium), no horizontal overflow, enquiry search/detail, Customers/Projects/Quotes/More navigation, legacy return bridge, hidden-DOM clearing after mock signout, pre-MFA privacy checks and bottom-nav touch targets.
- `scripts/colzo-motion-browser.cjs`: screen navigation, search, reduced-motion support provided by existing native styles, Cmd/Ctrl+K tool finder, keyboard focus containment, Escape dismissal and focus return.
- `scripts/colzo-workflows-browser.cjs`: booking/action form input, invalid end time rejection, transaction failures, modal role/title/field-label association and Tab/Shift+Tab containment at three mobile and two desktop target sizes.
- Existing PR #79 change fixed a **reproduced 1440×900 desktop sidebar Settings/account footer overlap**. The synthetic pointer hit-test and scroll/non-overlap assertion stays in Chromium regression.

## Additional mobile polish acceptance
The QA script now checks visible primary mobile header controls and five bottom-navigation buttons have **at least 44×44 CSS-pixel clickable areas** after loading Enquiries. The measure uses `getBoundingClientRect()`, not assumed CSS declarations. The test passed as part of [Actions run 43925149826](https://github.com/08collinsj-boop/Business-AI/actions/runs/43925149826); no additional visual code fix was justified by this particular check. Do not claim that every small secondary button meets this target.

## What was **not** proven, and why that matters
- True Safari WebKit, keyboard appearance, inset safe area, touch feedback and scroll interactions on a **real iPhone** remain unverified (W3).
- Comparison with latest approved Stitch reference via authentic protected Preview browser at exact sizes is incomplete; synthetic browser success is not design parity.
- Accessibility automated checks do not establish full WCAG conformance or screen-reader testing; test semantic structure, focus, visible error messages and reading order using permitted real devices before GO.
- The synthetic logout DOM test does not prove real session invalidation/revocation, nor does a desktop screen snapshot prove cross-tenant security.

## Visual sign-off list for a real reviewer
1. Compare mobile at 375/390/430 and desktop at 1024/1280/1366/1440 to approved Stitch: logo, sidebar proportions, graphite surfaces, Volt toggles, typography and cards. Record redacted screenshot diff.
2. Verify visible focus ring, keyboard escape and form labels on actual authenticated screens.
3. Check iPhone Safari safe-area top/bottom, onscreen keyboard, touch targets, bottom navigation, modal scrolling, orientation if supported and sign-out/re-entry.
4. Check no private records remain in DOM before MFA and after logout, independent business identities and actual tokens.
5. Keep UI changes on isolated draft branch; only merge or redeploy after explicit release approval.

## Verdict
**Synthetic desktop/mobile polish: improved coverage and verified target checks. Genuine visual/device acceptance: OPEN. External pilot: NO-GO.**
