# Colzo motion continuity - 18 October 2026

Implemented on `feature/colzo-complete-ui-motion-20261017`, continuing draft PR26. This pass adopts the useful continuity principles from the Jobber, Linear, Intercom and Apple research while retaining the approved Graphite & Volt compositions. Timings below are Colzo choices, not measurements of those products.

| Area | Implemented behaviour | Evidence |
| --- | --- | --- |
| Primary tabs | 180ms fade, no whole-page horizontal movement or nested card stagger; active plate 220ms | Controller and scoped CSS; full regression suite |
| Record details | 260ms directional entrance; saved Customers keep Customers active, Projects/Quotes keep More active | Parent-tab regression and React/controller customer journey |
| Back navigation | Save list scroll before entering a saved record, start details at top, restore list position on return | Synthetic customer list/detail/back journey |
| Enquiry forms and derived customer profiles | Correct Enquiries/Customers tab rather than Home | Parent-tab regression |
| Tool search | One entrance controller, 260ms; matching 160ms exit; navigation/auth teardown closes immediately | Explicit entrance plus observer test; close/reopen lifecycle tests |
| Booking/action editors | Shared 260ms entrance and 160ms exit; preserve unsaved guard; return focus to opener after dismissal | Shared lifecycle tests; existing work/security regressions |
| Unsaved changes sheet | Exit completes before keep/discard/navigation callback; repeated clicks cannot change the initial decision | Shared dismissal tests and guarded controller callback |
| Booking calendar | Only the calendar moves 8px in the selected direction over 200ms when changing month | Source/build checks; approved calendar geometry unchanged |
| Background refresh | Saved rows stay mounted, with a thin status line and accessible refresh announcement; failed refresh preserves records with an honest retry notice | React loading/refresh regressions |
| Filtering/search | No movement or per-card stagger; no chart replay on ordinary filters/background renders | Controller transition policy |
| Accessibility | OS preference cancels active page motion; system/session reduced motion suppress surfaces and completes pending exits | Reduced-motion regressions; CSS retains focus and reduced-motion rules |

No new dependencies. New transitions animate transform/opacity. Existing API-confirmed Saving/Saved/error states and initial-load skeletons, tenant isolation, record version checks, quote locks and MFA remain in place. No customer records were submitted or changed during live checks.

## Verification

New regressions were run against the previous implementation first: all four initial defect/lifecycle tests failed. They pass after implementation. Additional tests cover observer deduplication, repeated dismissal and the full synthetic customer back journey.

Final `npm test` result: 739 passed, zero failed, skipped or cancelled; duration 24.80s. The pretest React production build passed. `npm run verify` completed successfully, including validation of 238 JavaScript files and secret/temporary-marker checks; `git diff --check` passed. Focused motion/directory regressions passed, including both cached-refresh tests that failed before the fix. Browser observation of the stable development alias showed the sign-in page. The authenticated preview used for the earlier layout audit is an older deployment; it is not evidence of live acceptance of this update. No session credentials were copied between origins.

## Acceptance limits and remaining proposals

Live authenticated checks of the new code, physical iPhone Safari/Android keyboard/safe-area interactions and frame-rate profiling remain outstanding. Do not claim 60 FPS or certification of every route/state.

Desktop list/detail side panels, drag-to-dismiss, swipe navigation, animated KPI interpolation and new AI conversation effects are not added in this pass. They need reference/interaction acceptance and device testing; changes to approved layouts or simulated AI streaming would exceed a motion polish pass. Existing loading and server-confirmed save feedback remain functional rather than presenting optimistic success as persistence.

Production, base branch, credentials, backend configuration and customer data are unchanged. PR26 remains draft.

## Authorised follow-up

The subsequent 18 October instruction authorised the remaining interaction pass. Desktop record inspectors, scoped touch back/calendar gestures, guarded editor-handle dismissal and verified-count KPI interpolation are now implemented. See `docs/COLZO_GESTURES_INSPECTOR_KPIS_20261018.md` for exact scope, test evidence and remaining live/device acceptance limits. The proposal list above describes the earlier pass only.
