# Customer booking consent — 25 October 2026

Two fresh handler-level reproductions exposed gaps in the existing consent guard. With an intentionally incorrect synthetic model response, `Please don’t book me in.` created a booking because the refusal regex recognised only ASCII apostrophes. A valid `I’d like to book for Saturday` was also missed. Separately, single-quoted examples such as `You said ‘book me in’ as an example` could authorise a booking; a quoted negative example could incorrectly block a separate explicit positive request. These were local mocked-transport tests: no live enquiries, records, AI calls or customer messages.

The minimum correction normalises common smart apostrophes for consent checks and removes bounded single-quoted examples while preserving apostrophes inside contractions. Existing double-quoted example filtering remains. Pure explicit refusals still short-circuit before model, enquiry, booking or follow-up work. A separate explicit positive request remains actionable. No booking confirmation, pricing promise or natural-language accuracy guarantee is introduced.

Red evidence: both smart-apostrophe tests failed before the correction, and both quoted-example tests failed before quote filtering. First F01 group: 6 tests passed, zero failures/skips; covers five smart-refusal variants, four single-quoted examples, positive controls and existing refusal/history cases. Full unchanged-source `npm run verify`: **1,354 passed, zero failures/skips/cancellations; build passed; 349-file static checks passed; exit 0.** Whitespace check passed. Exact commit recorded in the publication evidence.

Natural-language safeguards are deliberately conservative and remain subject to real customer acceptance. This is not a physical iPhone or live AI test. No shared environment was changed and no deployment was created.


## Extended consent and failed-save checks

Further handler reproductions showed `I can’t book an appointment yet` and informational phrases could also pass the old unanchored booking-word match. The correction recognises negative contractions, rejects leading conditional/informational requests and requires the imperative form to start a sentence (allowing ordinary greetings and polite requests). Eight informational/refusal examples and four explicit positive controls now pass. The final F01 group has 8 tests.

A separate failure injection reproduced the model reply `You're booked in.` after the database save failed. Deterministic capture also previously returned the vague `Thanks. I have your details.` after a failed save. The customer response now explicitly says the enquiry could not be saved and offers retry/direct contact whenever an intended capture failed; existing safety/handover failure wording retains priority. Six variants cover both paths, and successful booking/handover controls remain green.

Final full `npm run verify` on the combined customer/website working source: **1,357 passed, zero failures/skips/cancellations; build passed; 349-file static verification passed; exit 0.** No live AI or database requests were made by these tests.
