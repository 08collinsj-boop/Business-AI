# Colzo Dev acceptance - 16-17 October 2026

Status: draft development only. Public launch remains NO-GO. This report records the observed scope, not complete acceptance of every screen.

## Source and environment

- Draft PR #19, `feature/colzo-account-journey-graphite-volt-20261016`.
- Authenticated browser tests below ran on `bff0421da805a3a810001e43b852ec3804db91c3`, https://business-gwj0f1i4l-buisness-ai1.vercel.app/.
- Customer directory fixes committed as `8a654138b31266964f024d2a4fd529367598885b`, READY Preview https://business-kzbax02mv-buisness-ai1.vercel.app/.
- Both previews' application health returned 200/ok through the authorised Vercel connector. Public configuration returned frontendAuthEnabled=true and exactly https://mvwseobgkexzpmmkgcxe.supabase.co. No credentials are recorded here.
- Existing owner and business reused. Secure sign-in and Microsoft Authenticator MFA succeeded twice. No account, business or MFA factor was recreated.
- Active business displays Business AI and contains existing historical records. Those records, settings and schedules were not edited as test fixtures.

## Live browser results

| Flow | Observed evidence | Limits |
| --- | --- | --- |
| Sign-in / MFA | Existing account reached locked MFA gate; secure verification opened workspace | Recovery/email delivery not exercised |
| Customers | Created `DEV QA 20261016 Work acceptance`; edited its internal note; refreshed page and reopened saved note | No email/phone supplied, no messages |
| Enquiries | Created same labelled QA contact with synthetic description; changed status to Contacted and saved notes; status remained after next session | Public customer submission and AI response not tested |
| Bookings | Created `DEV QA 20261016 Work booking`, linked to QA enquiry, 20 October 10:00-10:30 browser-local time, requested status; visible after next sign-in | No confirmation, completion, review request or customer notification |
| Projects | Created `DEV QA 20261017 Work project`; edited to paused with notes; paused record remained after reload | No milestones or delivery fields added |
| Project concurrency | Opened same QA project in two editor tabs. Second saved newer notes. First attempted stale note update and displayed `This record has changed. Reload it before saving.` | Conflict UI verified; exact HTTP status and post-conflict reload were not independently captured |
| Quotes | Created `DEV QA 20261017 Work quote - do not issue`, linked only to QA enquiry, draft £1; edited to £2; £2/draft remained after reload | No issue/send, payment, accepted-state mutation or lifecycle certification |
| AI receptionist | Server-backed status reported not connected, live calling disabled and environment gate disabled; enquiry handover count displayed | Web assistant grounded response/escalation not exercised; no provider calls |
| Marketing | Loaded 10 existing draft-library entries and the existing scheduled item | Existing content untouched; generation, edit/approval and delivery untested |
| Automations | Loaded disabled state, approval_required mode, disabled image generation and existing last-run data | No trigger or configuration changes |
| Analytics | Loaded recorded enquiry, opportunity and attribution totals with accurate revenue caveats | Numerical reconciliation with independent database query outstanding |
| Knowledge | Loaded existing active and failed sources | No upload, new fact, approval or removal |
| Public profile | Loaded existing profile preview and edit fields | No save or public customer transaction |
| Settings | Opened business profile, team, integrations, notifications, appearance, support and security screens; navigation returned to More | No invitations, access changes, browser permissions or support submissions |
| Actions | Loaded empty open-task state and recorded status counts | Create/edit not exercised live |
| Billing | Opened read-only screen, observed loading state | Final response and Stripe TEST flow unverified |

Only five labelled records were created: customer, enquiry, requested booking, project and draft quote. Updates were limited to these QA records. They remain in Dev for review. No deletions, external communications, provider generations, payments, Production deployment or merges were performed.

## Verified fixes and draft UI work

1. Customer list split initials on a literal backslash instead of whitespace. Multiword initials now match the saved profile.
2. Unmatched customer search incorrectly claimed no saved customers. Loading, empty directory and no-match states now differ; singular counts are corrected.
3. Enquiry detail incorrectly said draft quotes were not saved. It now explains that drafts are saved to the business without automatic delivery.
4. Quote detail adopts the approved #008 estimate card, linked record section, notes and edit action using actual saved fields. Actual linked enquiries use existing navigation. Sent/accepted term locks are retained; no delivery controls or fake references are introduced. Browser/mobile acceptance of this new layout remains pending.
5. Four existing Marketing allowance tests depended on an entitlement expiring on 17 October at noon. Pinning their Date clock to the existing fixture time keeps malicious billing-field rejection checks deterministic. Runtime billing logic is unchanged.

## Design evidence and remaining coverage

Read the current `Colzo_Design_Handover.zip` (version 4) and complete `Colzo_122_Screen_Design_Review.md`. Inspected approved Customer Profile/Add Customer, Quote Details #008, Project Details #012 and the repository Settings reference.

Customer profile/add/edit preserve the prior approved structure with only persisted fields. Company/location/customer type, project milestones/budget/delivery date and fabricated quote references are not added. Quote detail #008 implementation is draft and still needs rendered comparison. The five locked baselines remain unchanged. This work does not claim all 107 accepted references have been implemented or all routes/states verified. The 12 held references remain unapproved.

## Validation and blockers

- Initial exact-base repository verification: 681/681 tests, 206 JS files.
- Customer fix verification: 684/684 tests, 207 JS files; three red-before/green-after behavioural regressions.
- Quote detail focused regressions: 4/4 pass, including escaping, actual enquiry navigation and sent/accepted edit locks. Final `npm run verify`: **688/688 pass, 0 failures/skips**, 208 JavaScript files checked; `git diff --check` passed.
- Local synthetic Chromium rerun could not start: Playwright browser executable missing; browser download failed. The earlier handoff's 15/15 remains historical evidence, not a rerun result.
- Updated-preview secure sign-in was cancelled. No further credential request was made. After screenshots and final-candidate authenticated regression remain pending.
- Cloud browser refused a local-file layout preview under its URL policy. No alternate browser surface or workaround was used.
- Before screenshot exists for customer directory with QA-only search. No after screenshot is claimed.
- Independent authorised second tenant is unavailable; tenant isolation and unauthorised API denial are not certified by this run. One protected onboarding fetch returned an outer deployment authentication error, which is not application-level auth evidence.
- Public web assistant, no-cost grounding/escalation, Marketing write/review, complete quote lifecycle, customer portal, all mobile sizes and assistive technology checks remain outstanding.
- Existing Marketing schedule dated 11 October still displays scheduled; investigate separately without triggering or cancelling it.
- Eight legal pages, operator review, compliant hosting, backup/restore and remaining release gates in the launch runbook remain unresolved.

Next authenticated pass should verify the latest PR SHA/Dev configuration, capture before/after at matching viewports, verify surviving records and conflict preservation, then continue the unmet flows above. Preserve the existing owner/business/MFA and all Production boundaries.
