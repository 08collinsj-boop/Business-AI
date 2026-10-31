# Fictional demonstration and physical Safari acceptance

Status: prepared script only. No live demo account or matching Preview is ready.
Use an accepted exact-SHA Preview only after the release procedure gates pass.
Never reuse a real customer's business/profile or manually fabricate a session.

## Fictional records to enter through the accepted UI

| Item | Business A | Business B |
| --- | --- | --- |
| Name | QA Example Electrical A | QA Example Garden B |
| Services | Fictional indoor lighting and socket enquiries | Fictional garden maintenance enquiries |
| Area | Example Town A | Example Town B |
| Hours | Monday-Friday 09:00-17:00 | Tuesday-Saturday 10:00-16:00 |
| Contact | qa-electrical@example.invalid | qa-garden@example.invalid |
| Customer | QA Alex Example | QA Sam Example |
| Customer email | alex.qa@example.invalid | sam.qa@example.invalid |
| Telephone/address | Leave optional fields blank | Leave optional fields blank |

These .invalid addresses are sample record fields, not working Auth identities.
Two separately approved, deliverable test identities are still required for real
email-confirmation/recovery tests. Map each identity privately to its exact Dev
user ID and business. An older account's MFA does not prove MFA on Dev 08collinsj.
Two businesses each need a separate owner; a second seat must be a separately
approved recipient. Under the no-invitation restriction, invitation reservation,
expiry and acceptance are synthetic-only until separately authorised. Never send
an invite or email to an unapproved identity merely to complete this checklist.

Approve only these manual example facts for A: the services, area and hours above;
all requests are reviewed by a person; appointment requests need confirmation.
Do not invent prices, qualifications, emergency coverage, guarantees or reviews.

## End-to-end result sheet

Record exact Preview URL, deployed Git SHA, UTC timestamp, private identity alias,
business ID and result/reference per row. Until executed, every row is NOT RUN.

| Step | Input/action | Acceptance evidence |
| --- | --- | --- |
| 1 | Owner A confirms email, signs in, completes MFA | Verified correct project/user; protected route requires AAL2 |
| 2 | Verify business/contact, enter and approve example facts | Approved facts persist after refresh; no file token/upload |
| 3 | Ask “What are your opening hours?” | Grounded answer or honest human handover; no invented claim |
| 4 | “Please quote for replacing two indoor lights. QA Alex Example, alex.qa@example.invalid.” | Saved enquiry/lead and correct owner next step |
| 5 | “Please request an appointment next Tuesday afternoon.” | One pending request; never described as confirmed |
| 6 | “Do not book anything. I only want information.” | No new booking; existing records are not silently cancelled |
| 7 | Duplicate/concurrent booking submissions | Exactly one pending AI booking per business/lead, one history/audit |
| 8 | Controlled failed persistence in disposable environment | Honest retry/direct-contact response; no false saved/sent claim |
| 9 | Refresh owner/customer views | IDs/status/data remain consistent; no unsupported customer reply |
| 10 | Owner B attempts A record IDs through UI/API | Read/write denied; B's own records remain usable |
| 11 | Missing auth and forged client business_id | Private API denied; server-resolved tenant cannot be overridden |
| 12 | Pending invite/third seat/replay | Reservation counts toward two; recipient/expiry/replay checks deny |
| 13 | Exact boundary/revoked fixture grant | Before boundary allowed, at/after denied; B unaffected |
| 14 | Password reset, token rotation and sign-out/revocation | Correct redirect/account; old sessions denied as designed; original grant timestamps unchanged |
| 15 | Inspect important audit/history events | Creation, grant, booking, membership and revocation evidence; no secrets |
| 16 | Visit deferred feature UI and APIs | Billing/Voice/WhatsApp/Marketing/uploads/Connect/style/push remain unavailable |

Never shorten or rewrite a real user's 336-hour grant to simulate expiry. Boundary
and failure injection require disposable, explicitly owned fixtures. No shared QA
cleanup is authorised; retain exact ownership evidence before any later removal.

## Physical iPhone Safari handoff

Handoff fields: device model ___; iOS version ___; Safari version ___;
Preview URL ___; deployed SHA ___; test date/time ___; private account aliases ___;
business IDs ___; tester ___; each result PASS/FAIL/BLOCKED with redacted evidence.
No credentials, QR seeds, codes or recovery URLs belong in this record.

1. Open the exact approved Preview in Safari. Confirm secure sign-in and MFA on
   the mapped Dev account; use the authenticator locally without sharing codes.
2. Check navigation, portrait/landscape, safe areas, bottom bar and long pages.
   Scroll to every control; no horizontal overflow or obscured/inaccessible button.
3. Open each business/knowledge/enquiry form with the keyboard visible. Check focus,
   labels, validation, dropdowns, submit and safe scrolling; dismiss keyboard safely.
4. Perform enquiry, quote, booking and “Do not book anything” cases above. Verify
   owner lead/action visibility and clear handover. Requests stay unconfirmed.
5. Save, refresh, close/reopen the tab and verify actual persistence. Check error
   messages preserve drafts and do not claim success when the server rejects a save.
6. Sign out; Back/refresh cannot reveal protected data. Test controlled recovery in
   Safari, confirm correct account/Preview and MFA behaviour, then sign out again.
7. Use approved expired/revoked fixtures to check access messages and recovery.
   Recovery does not extend/restart the pilot. Check active B remains independent.
8. Record all results. Any failed security/persistence/usable-control case blocks
   activation. Emulator/browser screenshots do not replace this physical-device gate.
