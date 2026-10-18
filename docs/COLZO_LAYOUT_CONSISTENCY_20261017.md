# Colzo layout consistency pass

User request: align headings, positions, sizes and spacing, with a restrained iOS-style composition within the approved Graphite & Volt direction.

## Findings and changes

| Surface | Previous implementation | Change |
| --- | --- | --- |
| Enquiries / Projects | 27px titles, fixed 43px row | Shared PageHeader, 30px/36px title, 44px action row |
| Customers directory | 30px title with an extra 8px top margin | Same title baseline and shared header; saved count below |
| Quotes directory | 35px/850 title, eyebrow above it, separate create row | Same header and count placement; create action in 44px top row |
| Marketing / Analytics / Knowledge / Billing / Receptionist / Public profile / Automations / Feedback | Eyebrows shifted headings below other page titles | Same title baseline; redundant eyebrow removed from primary headers |
| Settings hub and nested settings | 27px/32px titles and differing back margins | Shared title scale, 44px back control, 16px back-to-title spacing |
| Standard settings/content cards | Varying padding, gradients and heading sizes | 18px padding/radius, flat graphite surface, 17px section headings |
| Standard search/filter/actions | Mixed 34-49px control sizing, small captions | 44px minimum tabs/actions, 48px searches, 16px inputs, 13px supporting text |
| Narrow layouts | Potential title/action competition | Flexible title column, nonshrinking actions and wrapping long titles |

Primary page title: 30px, line height 36px, weight 700, tracking -0.9px. Standard heading-to-content gap: 20px. The React directories share one component; native directory/settings compositions use the same CSS rules. Content gutters retain 20px mobile / 35px desktop and account for horizontal safe areas.

## Preserved references and behaviour

Home and Bookings are explicitly excluded from page/card/control normalization. The approved customer profile, add/edit customer form and quote-detail hierarchies remain separate contextual compositions. Navigation titles and profile names intentionally do not all use the large page-title scale.

No API calls, authentication, permissions, persistence handlers, record identifiers or tenant contracts were changed. Existing event attributes and search/filter state are retained. No new dependencies or design-generation charges.

## Verification

`npm run verify`: 729 passed, zero failures; 237 JavaScript files validated. Styling-only finishing adjustments are covered by subsequent build/local validation. The existing suite covers the retained search, create, navigation, quote-lock and tenant contracts.

This report is a source and regression audit, not pixel or device certification. Final authenticated measurements/screenshots of the newest preview require owner sign-in. Real iPhone Safari, keyboard and reduced-motion device checks remain acceptance tasks. Existing approved reference variations remain deliberate exceptions, rather than an assertion that every heading on every surface must have the same size.

## Authenticated browser inspection - 18 October

Owner sign-in was confirmed on the layout candidate (`97f6d6e`). Measurements at a 1363px desktop viewport are relative to the content container, excluding its page-transition transform. No horizontal document overflow appeared in these 22 screen checks.

| Screens | Title size / line / weight | Left / top offset | Finding |
| --- | --- | --- | --- |
| Enquiries, Customers, Settings, Marketing, Analytics, Knowledge, Billing, AI receptionist, Public profile, Automations, Feedback | 30px / 36px / 700 | 35px / 18px | Matching primary title geometry |
| Projects, Quotes | 30px / 36px / 700 | 50px / 18px | Additional centred 940px wrapper; corrected by allowing the directory to fill its parent |
| Business profile settings, Team, Integrations, Notifications, Appearance, Security, Help | 30px / 36px / 700 | 35px / 78px | Matching contextual titles below the 44px back row and 16px gap |
| Actions | 30px / 36px / 700 | 35px / 89px | Extra header padding/margin; corrected to the shared contextual spacing |
| Bookings | 32px / 33.28px / 800 | 35px / 81px | Existing locked reference retained |

The quote form uses a 17px/24px context heading and 48px inputs with 16px text. The approved customer form retained 48px controls but had 15px input text and an 18px title; corrected to 16px input text and the reference's 17px context title. No form was filled or saved.

The in-app Reduced animations control applied `cn-quiet-motion`; its original unchecked preference was restored. No claim is made that an actual OS reduced-motion device setting or 60 FPS performance was measured.

Validation: fresh full verification passed 729 tests and checked 237 JavaScript files. After the visual corrections, 22 focused directory/navigation/settings regressions passed; the bundle and static checks were rebuilt successfully. Final CSS corrections need visual confirmation on the newer preview; these measurements describe the inspected candidate rather than pretending the patched version was already measured.
