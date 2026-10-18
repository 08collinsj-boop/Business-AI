# Colzo gesture, inspector and KPI follow-up

Scope authorised by the 18 October follow-up. Continues `feature/colzo-complete-ui-motion-20261017`, draft PR26. No backend, authentication, billing or data migration changes.

| Surface | Behaviour | Limits |
| --- | --- | --- |
| Customer/project/quote details | Desktop at 1200px+ keeps the matching directory beside a nonmodal inspector; selected row is marked; detail entrance targets the inspector | Mobile retains the approved full-page composition. Live geometric acceptance pending |
| Detail keyboard navigation | Focus moves into opened inspector; Escape returns to directory and restores focus to the record row; scroll preserved | Search/input Escape is not intercepted |
| Mobile record details | Deliberate right swipe on noninteractive content returns through the existing Back button | Excludes browser edge zone, form fields, links/buttons, vertical scrolling and mouse input |
| Calendar | Horizontal swipe changes one month via the existing previous/next controls | No booking drag/drop or changes to appointment data |
| Editor dismissal | Touch handle recognises downward drag and gives a small grip response; release invokes existing Close with unsaved-change checks | The panel itself is not freely draggable. Busy editors do not dismiss. Close/Cancel/Escape remain available |
| KPI changes | 240ms visual interpolation between recorded integer counts on the same screen, beginning from a positive baseline | No zero-to-value count-up (including the first data response), no fabricated values, no currency/revenue interpolation |
| KPI accessibility | Actual value remains in the accessibility tree; interpolated overlay is aria-hidden; cancellation removes overlay | Reduced motion and sign-out cancel active effects |

Touch interactions use Pointer Events and native pan-y scrolling. OS edge gestures are reserved. A short handle drag suppresses its subsequent native click, avoiding accidental dismissal. Pointer cancellation does not navigate. The explicit controls remain available without gesture support.

The side inspector reuses existing React directories/details, API handlers, quote locks and tenant checks. Refresh responses now rerender the matching open inspector as well as its directory. No data writes or communications are triggered merely by opening, closing or swiping these views.

## Verification

Initial new-module/inspector checks failed before implementation. Keyboard Escape/focus restoration and the unloaded-zero KPI case failed before their fixes. Final `npm run verify` passed: 749 tests, zero failures/skips/cancellations (24.64s), React production build successful, 240 JavaScript files validated plus secret/temporary-marker checks. `git diff --check` passed. Tests use synthetic records and touch events, including an edited booking form whose swipe still opens the existing unsaved-change decision without POST/PATCH.

Browser recovery after a navigation timeout reached the stable Dev sign-in page. No authenticated browser session is available for visual or real-device acceptance. Do not equate synthetic pointer tests with physical iPhone Safari/Android verification or claim 60 FPS. No after screenshot/recording of the new authenticated views is represented as captured.

The existing approved mobile screens and Home/Bookings styling are preserved, except the explicit editor handle. Desktop inspector and gesture behaviour remain subject to live acceptance. AI conversation effects remain unchanged; no fake streaming or simulated backend work was added.
