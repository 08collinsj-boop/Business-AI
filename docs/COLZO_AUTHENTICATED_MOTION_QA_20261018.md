# Authenticated motion QA - 18 October 2026

Manual owner sign-in/MFA succeeded on the stable Dev alias. Initial review ran against d713d5d. Corrected runtime code is 18eca9dc985fbd6a4c633503c6f84036bc101462, deployment dpl_5mZqW5EL63FXHHqwnfyrFMi6FPFi, READY/Preview:

https://business-dcgot7hjq-buisness-ai1.vercel.app/

Stable authenticated entry:
https://business-ai-git-feature-colzo-account-journ-79fbea-buisness-ai1.vercel.app/

Health/config return 200; authentication remains enabled and the exact Business-AI-Dev Supabase URL is verified. The corrected controller is served. No secrets, Production deployments, merges or account changes.

## Live findings and corrections

### Unsaved-decision stacking and unintended test write

During the first live booking-editor check, an unsaved title `Unsaved motion check` was entered. Close editor opened the unsaved warning. A click intended for Keep editing was followed by an actual booking-created confirmation and the booking count changed from zero to one. Create booking was not intentionally invoked.

The source confirmed the unsaved overlay at z-index 130 below the work-editor backdrop at 205. This exposed the underlying editor to pointer input while the warning existed. The initial synthetic event tests did not catch this geometry/hit-target defect.

Fixes:
- Unsaved overlay z-index 310, above the editor.
- Underlying form is inert while a decision is open, restored only when appropriate.
- Delegated submit handler blocks all forms while a warning exists or the form is inert.
- Closing editors remain inert throughout their exit animation.

Regression tests failed before the fixes and pass after them. The live retest confirmed warning/editor z-indices 310/205, the form's inert attribute, and that the Keep editing button receives the pointer at its centre. Keep editing preserved the draft and reenabled the form. Discard changes removed the form/warning and returned focus to Add booking. Booking count remained one throughout the corrected retest; no second booking was created.

The original unintended synthetic Dev booking remains unchanged. It has not been cancelled, edited or deleted. The user was informed promptly. It requires a separate cleanup decision; do not claim that this QA session performed no database writes. No pre-existing customer records were edited and no external communications were intentionally sent.

### Authentication filter reset

After sign-in, Bookings displayed an obsolete Upcoming state while the visible filters were Active/All/Completed/Cancelled; none was selected. Authentication reset now selects Active. The corrected authenticated reload reports Active selected and the heading Active bookings.

## Live checks

Viewport: Chromium desktop 1363 x 936. No mobile emulation or physical-device claims.

| Check | Result |
| --- | --- |
| Owner sign-in after manual MFA | Passed; signed-in workspace visibly confirmed |
| Enquiries/Customers primary tab selection | Passed |
| Tool search query filtering and Escape | Passed; hidden after exit and focus returns to Find a Colzo tool |
| Calendar Next/Previous | Passed; November then back to October 2026; no record/date modifications |
| Editor entry | Passed; Title initially receives focus |
| Unsaved Keep/Discard after correction | Passed; draft retained/discarded locally, no extra saved booking |
| Editor dismissal focus | Passed; returns to Add booking |
| Reduced animations | Passed; session class applies and nav transition is 0s; original unchecked state restored |
| Directory/setting headings | Measurements below |
| Populated Customers/Projects/Quotes inspectors | Blocked: each has zero saved records; no records created to populate them |
| KPI numerical update animation | Synthetic regression coverage; live data-changing check not performed |
| Touch swipe/drag on iPhone/Android | Synthetic pointer coverage only; physical acceptance outstanding |
| Frame-rate/performance certification | Not performed |

| Page | Heading size / line / weight | Left / top within content | Horizontal overflow |
| --- | --- | --- | --- |
| Enquiries | 30px / 36px / 700 | 35px / 18px | None |
| Customers | 30px / 36px / 700 | 35px / 18px | None |
| Settings | 30px / 36px / 700 | 35px / 18px | None |
| Projects | 30px / 36px / 700 | 35px / 18px | None |
| Quotes | 30px / 36px / 700 | 35px / 18px | None |
| Actions | 30px / 36px / 700 | 35px / 78px including Back row | None |
| Appearance | 30px / 36px / 700 | 35px / 78px including Back row | None |

The locked Bookings composition is retained; it is not forced into the standard directory geometry.

## Automated verification and evidence

Final npm run verify: 753 tests passed, zero failed/skipped/cancelled, 24.63s. React production build passed. 241 JavaScript files plus secret/temporary-marker validation passed. git diff --check passed.

Runtime commits:
- 6336a870720f8bd9540fc4966ee703afd0f56f03 - modal stacking, warning submit guard, inert form and Active filter reset.
- 18eca9dc985fbd6a4c633503c6f84036bc101462 - pending-dismissal submit protection.

The supplied clean screenshot `colzo-unsaved-warning-corrected.jpg` shows the warning above the editor after correction. It contains no customer contact/payment information. No before screenshot of the faulty click was captured; the initial failed live check and underlying source values are reported rather than presented as visual evidence.

PR26 stays draft. Populated-detail, physical-device, Safari, two-tenant and remaining feature acceptance is still open. This report supersedes earlier sign-in-blocked status for the checks explicitly listed here, not all 122 reference states.
