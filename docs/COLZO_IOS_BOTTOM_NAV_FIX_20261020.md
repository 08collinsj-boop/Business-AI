# Colzo - iPhone bottom navigation correction (20 October 2026)

## Reported issue
The owner More tab showed doubled, horizontally displaced lime highlight outlines in the five-tab bottom navigation. A user screenshot on iPhone showed the More plate extending to the right edge and visually overlapping the selected button.

## Verified cause
- assets/colzo-motion.css already implements a moving selection plate using the CSS ::before pseudo-element and --cn-active-index.
- assets/colzo-stitch-integration.css subsequently adds a second lime background on the active button, creating two simultaneous active backgrounds.
- The moving plate used content-box width plus a 1px border and a track-width calculation that did not account for the grid container's actual 5px left/right padding, so each translated step drifted by approximately 1.6px, ending about 6.4px too far right on More. At 390px viewport, the nav scrollWidth was 376px for a 374px element.

## Fix
- Scoped a small mobile-only override after Stitch styles in assets/colzo-flutter-motion.css, targeting screens below the existing 920px desktop-sidebar breakpoint.
- Retain one animated selection plate. Its box-sizing:border-box, width calculation and 6px left offset now match the five actual grid-column widths.
- Remove only the duplicate background, border colour and shadow from the selected button. Keep accessible active colour, aria-current=page, focus-visible outline for keyboard users, nav and icon animations, 70px nav height, minimum 44px taps and safe-area spacing.
- No changes to screens, bottom navigation routes, authentication, customer portal, sensitive APIs, data, billing or Production.

## Verification
- Baseline synthetic Chromium showed button x=303.59px and plate x=310px at 390px, and 2px nav scroll overhang.
- After change at 390px: plate x approximately 303.6px and width approximately 72.4px, aligned to active More; nav scroll width now fits.
- Synthetic Chromium navigated all five tabs at 320, 350, 375, 390, 402, 430, 768 and 1024px widths (40 checks); phone widths show one aligned plate inside bar with transparent active button; desktop sidebar hides plate. No horizontal overflow or JS errors.
- Checked that More screen content remains scrollable and clear of the fixed bottom bar.
- 1,134 non-PGlite repository tests passed, zero failures/skips, including three new regression checks and existing mobile nav, motion and customer UI tests.
- npm run build and npm run verify:local passed. PGlite migration test remains separately memory-blocked.

## Remaining
Real user iPhone Safari confirmation with screenshots after Development Preview deployment. Do not claim production release or real-device signoff until user verifies.
