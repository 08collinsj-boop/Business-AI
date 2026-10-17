# Colzo page-by-page Dev QA - 17 October 2026

Verdict: CHANGES REQUIRED. Overall UI acceptance 2/5: core directories and forms render real data, but navigation defects, missing native functionality and reference mismatches prevent full acceptance. This score does not certify security, billing or performance.

## Environment and actual evidence

- Browser-audited code: cbec5e1c974fe6bdf41009cde320c0b9c0622448.
- Signed-in Dev preview: https://business-l8cpald5w-buisness-ai1.vercel.app/
- Deployment dpl_72kgMzsgc7DKdQnqUtuUg3yB6VUR is READY/Preview. Exact Dev Supabase target and frontend auth were verified before owner sign-in.
- The existing owner signed in manually. No replacement account/business, reset or MFA change.
- Desktop Chromium only. Browser exposes no supported viewport or Safari device control. iPhone/Android/tablet, keyboard, touch targets, safe areas and frame timing are NOT certified by desktop screenshots.
- No database writes, deletions, approvals, invitations, external communications, schedules, paid AI calls or Production changes during this audit. Appearance preference was toggled and restored.
- Internal controller states are not verified deep links. Most owner tabs leave the URL at /. Browser Back/refresh per nested screen remains an acceptance gap.

## Verified findings and changes

| Finding | Severity | Result |
|---|---|---|
| Enquiry contacts do not open a profile | High | Missing customer route allowlist entry corrected; DOM regression reproduces and passes. |
| Help feedback shortcut returns to Settings | High | Connected to existing native feedback form. |
| Both security-centre controls return to the same Security page | High | Existing secured controls mounted inside native Colzo, retaining handlers and auth gates. DOM lifecycle tests pass; new-candidate authenticated browser check pending. |
| Security UI can retain setup fields across sessions | High | UI state removed on auth loss, stale read guarded; no credential/factor operation changed. Synthetic lifecycle regression passes. |
| Website integration shortcut returns to Settings | Medium | Replaced misleading destination with honest unavailable status. Existing integration data preserved. |
| Duplicate tool search and settings entries; outdated quote description | Medium | Duplicates removed; saved-record descriptions corrected. |
| Product labels in portal/directory retain Business AI | Medium | Static product labels corrected to Colzo; actual saved business name preserved. Old mascot assets/design parity still require migration. |
| Unnamed project progress slider; 1 saved projects/quotes | Low | Accessible name and singular labels corrected. |
| Home trend points and month labels do not align on desktop | Medium | Observed; unresolved. |
| Booking list calls past active bookings Upcoming | Medium | Observed; unresolved. Calendar month navigation itself changes October to November. |
| Past Marketing schedule still labelled scheduled | Medium | Observed; execution/delivery status not inferred or changed. |
| Knowledge summary says awaiting review beside active state | Medium | Existing stored summary is stale; left intact and recorded. |
| Advanced team, website, review/referral and AI settings are absent or incomplete | High | No full native parity; not accepted. |
| Marketing native approve action is absent | High | Draft edit resets approval; complete approval workflow still missing. |
| Billing/voice/push/passkeys/WhatsApp capability | Incomplete | Honest unavailable states or separate branch; not operational acceptance. |
| All eight legal pages retain Pilot wording/operator placeholder | Launch blocker | Legal index plus seven documents opened. No legal text/consent versions changed without verified owner identity. |

## Reference comparison

The actual exports for approved Customer Profile (#001), Quote Details (#008) and Edit Booking (#069) were inspected. Current customer/quote screens preserve core sections but are not pixel-matched; copy actions, related-record presentation and CTA/header placement need work. Booking editing currently uses a modal with more backend fields rather than the full-page approved composition. Unsupported destructive actions shown in a reference must not be added without backend support. The locked Bookings reference itself was not redesigned. Twelve flagged references remain unapproved.

## Complete reference/state inventory

The table covers every one of the 122 located reference exports. An observed entry means exactly the listed checks, never full design/security/write acceptance. Missing/unreachable and authentication/setup-changing flows remain explicitly unverified.

| # | Screen | Route/state | This audit |
|---:|---|---|---|
| 1 | Customer Profile | colzoDetail / clients | Saved QA profile, empty related contacts, Overview and Activity opened; unsupported location/company explicitly disclosed. |
| 2 | Add Customer | clients / create | Creation form opened; unsaved keep/discard prompt exercised; nothing saved. |
| 3 | Edit Customer | clients / edit | Edit form opened with saved QA data; cancelled. |
| 4 | Enquiry Details | lead | QA enquiry details rendered; Edit opens correctly. |
| 5 | Create Enquiry | leadForm / create | Creation form opened and cancelled. |
| 6 | Edit Enquiry | leadForm / edit | Edit form opened with saved QA status and notes; cancelled. |
| 7 | Quotes Directory | quotes | Existing saved quote listed; count grammar corrected in patch. |
| 8 | Quote Details | colzoDetail / quotes | QA quote amount and linked enquiry rendered. Sending/payment unavailable. |
| 9 | Create Quote | quotes / create | Create draft quote form opened and cancelled. |
| 10 | Edit Quote | quotes / edit | Saved draft edit opened; delivery statuses disabled; cancelled. |
| 11 | Projects Directory | projects | Existing QA project listed; count grammar corrected in patch. |
| 12 | Project Details | colzoDetail / projects | Saved QA status, progress and notes rendered. |
| 13 | Create Project | projects / create | Creation form opened and cancelled. |
| 14 | Edit Project | projects / edit | Edit form opened and cancelled; progress accessible name corrected in patch. |
| 15 | AI Receptionist Dashboard | receptionist | Live server status reports voice not connected/disabled. |
| 16 | AI Conversations | Voice conversation list: native parity missing | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 17 | AI Receptionist Settings | AI configuration: advanced settings | Not live accepted. No safely exercised reachable state or full evidence in this audit; remains outstanding. |
| 18 | Business Knowledge | knowledge | Existing knowledge sources and real active/failed status loaded. |
| 19 | Marketing Dashboard | marketing | Existing Marketing draft library loaded without generation. |
| 20 | Marketing Content Creation | marketing / create | Creation fields opened; no generation or allowance use. |
| 21 | Marketing Library and Scheduling | marketing / schedule | Schedule view loaded; past scheduled item flagged, no changes. |
| 22 | Notifications | setting / notifications | Notification permission displayed as denied; push capability honestly unavailable. |
| 23 | Business Settings | setting / profile | Business settings loaded, no edits/saves. |
| 24 | Team and Permissions | setting / team | Existing owner membership loaded; invite form inspected, no invitation created. |
| 25 | Billing and Subscription | billing | Billing returns not enabled; read-only unavailable view. |
| 26 | More Menu | more | More menu opened; repeated settings links removed in patch. |
| 27 | Settings Hub | more | All seven settings pages opened. |
| 28 | Business Actions | actions | Open empty state and all three recorded actions loaded. |
| 29 | Create Action | actions / workModal | New action modal opened and closed without saving. |
| 30 | Analytics | analytics | Server-backed analytics loaded; revenue/pipeline distinction retained. |
| 31 | Automations | automations | Disabled/approval_required automation configuration loaded; nothing run. |
| 32 | Customer Portal | /customer/account | Signed-in Customer Portal: Overview, My enquiries, Account and Find opened; empty history and no-match business search verified. |
| 33 | Public Business Profile | publicProfile; /?profile=<slug> | Public business profile and contact destinations rendered, no contacts initiated. |
| 34 | Review Requests | Advanced review requests | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 35 | Referrals | Advanced referrals | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 36 | Integrations | setting / integrations | Integrations inspected. Website shortcut incorrectly returned to Settings; patched with explicit unavailable state. |
| 37 | Security and Privacy | setting / security | Security settings inspected; both security-centre links were self-loops; patch mounts existing secured controls. |
| 38 | Feedback and Support | feedback | Native feedback form opened, nothing submitted. Help shortcut corrected in patch. |
| 39 | Welcome | welcomeScreen | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 40 | Sign In | authScreen | Signed-out entry observed; initial secure submission rejected, user subsequently signed in manually. |
| 41 | Create Account | signupScreen | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 42 | Verify Email | auth message / email verification | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 43 | Forgot Password | forgotPasswordScreen | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 44 | Reset Password | resetPasswordScreen | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 45 | Authentication Challenge | securityMfaGate | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 46 | Passkey Sign In | colzoPasskeyLogin (capability gated) | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 47 | Choose Business | business selection gate | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 48 | Create Business | businessOnboardingScreen | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 49 | Business Location | configurationOnboarding / location | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 50 | Business Services | configurationOnboarding / services | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 51 | Business Hours | configurationOnboarding / hours | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 52 | Business AI Setup | configurationOnboarding / ai | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 53 | Business Knowledge Setup | configurationOnboarding / knowledge | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 54 | Review Business Setup | configurationOnboarding / review | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 55 | Business Setup Complete | configurationOnboarding / complete | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 56 | Recovery Code Sign In | Recovery code sign-in: capability dependent | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 57 | Manage Passkeys | Security centre / passkeys | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 58 | Set Up Authenticator | Security centre / authenticator | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 59 | Recovery Codes | Security centre / recovery | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 60 | Security Methods | Security centre / methods | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 61 | Account Profile | Account profile: advanced controls | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 62 | Edit Account Profile | Account profile edit: advanced controls | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 63 | Change Password | Security centre / password | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 64 | Active Sessions | Security centre / sessions | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 65 | Privacy and Data | Advanced privacy controls | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 66 | Terms Information | /legal/terms.html | Terms document opened; retains Business AI Pilot wording and identity placeholder. |
| 67 | Privacy Information | /legal/privacy.html | Privacy document opened; retains Business AI Pilot wording. |
| 68 | Create Booking | bookings / workModal create | New booking modal opened and closed. |
| 69 | Edit Booking | bookings / workModal edit | Existing QA booking edit modal opened and closed without saving. |
| 70 | Customer History | colzoDetail / clients / activity | Activity section opened; no fabricated contact matches. |
| 71 | Customer Notes | colzoDetail / clients / notes | Existing synthetic note displayed; edit form opened. |
| 72 | Action Details | actions / workModal detail | Saved synthetic action opened in editor. |
| 73 | Edit Action | actions / workModal edit | Saved synthetic action edit modal inspected and closed. |
| 74 | AI Simulator | Advanced AI simulator | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 75 | Conversation Details | AI conversation details: native parity missing | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 76 | Marketing Draft Review | marketing / edit | Saved QA Marketing editor opened; edits reset approval; nothing saved. |
| 77 | Add Knowledge Fact | knowledge / manual fact | Manual fact form opened; nothing saved. |
| 78 | Review URL Settings | Advanced review URL settings | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 79 | Review Knowledge Fact | knowledge / review | Existing active fact review opened; no confirmation or approval performed. |
| 80 | Public Enquiry | /?business=<slug> | Public assistant finished loading as Online with message field; no AI request sent. |
| 81 | Create Review Request | Advanced review request form | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 82 | Invite Team Member | setting / team / invite | Team invitation form inspected only; access not expanded. |
| 83 | Empty Workspace | shared empty state | Not live accepted. No safely exercised reachable state or full evidence in this audit; remains outstanding. |
| 84 | Search Results | bookings / workSearch | Not live accepted. No safely exercised reachable state or full evidence in this audit; remains outstanding. |
| 85 | Offline and Retry | API error and retry states | Not live accepted. No safely exercised reachable state or full evidence in this audit; remains outstanding. |
| 86 | Form Validation | form validation states | Not live accepted. No safely exercised reachable state or full evidence in this audit; remains outstanding. |
| 87 | Access Unavailable | business access auth gate | Not live accepted. No safely exercised reachable state or full evidence in this audit; remains outstanding. |
| 88 | Loading State | shared loading states | Several owner resource loaders observed then resolved; complete error/slow-network matrix not simulated. |
| 89 | Unsaved Changes | confirmUnsaved dialog | Unsaved customer form showed keep/discard dialog; no persistence. |
| 90 | Delete Confirmation | destructive controls: record DELETE unsupported | Not live accepted. No safely exercised reachable state or full evidence in this audit; remains outstanding. |
| 91 | Customer Request | /customer | Customer enquiry entry rendered without sending. |
| 92 | Business Directory | /customer/account / find | Customer directory and portal Find opened; no-match search verified; product rebrand patched. |
| 93 | Edit Business Profile | publicProfile / form | Public-profile editor loaded with existing business data; no save. |
| 94 | Notification Preferences | setting / notifications | Existing notification permission displayed; no permission requested. |
| 95 | Sign In Error | authScreen / error | Actual rejected owner-sign-in error observed before manual sign-in. |
| 96 | Recovery Link Sent | forgotPasswordScreen / sent | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 97 | Expired Recovery Link | resetPasswordScreen / expired | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 98 | Enquiry Notes | Enquiry notes: native parity missing | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 99 | Enquiry Files | Enquiry files: native parity missing | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 100 | Enquiry Activity | Enquiry activity: native parity missing | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 101 | Enquiry Note Composer | Enquiry note composer: native parity missing | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 102 | Enquiry Reply Draft | Enquiry reply: native parity missing | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 103 | Enquiry Status Picker | leadForm / native status picker missing | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 104 | Add Service | configurationOnboarding / add service | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 105 | Enquiry Filtered List | enquiries / filter | Enquiry filter controls exposed; status counts agree with four displayed records; full filter suite not rerun live. |
| 106 | Enquiry Search Empty | enquiries / search empty | Enquiry no-match search rendered then search cleared. |
| 107 | Empty Booking Day | bookings / empty day | Not live accepted. No safely exercised reachable state or full evidence in this audit; remains outstanding. |
| 108 | Calendar Break Entry | bookings / break state parity missing | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 109 | Feature Catalogue | Feature catalogue: native parity missing | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 110 | AI Simulation Answer | Advanced AI simulator / answer | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 111 | Enquiry Notes Populated | Enquiry notes populated: native parity missing | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 112 | Enquiry Saved Activity | Enquiry saved activity: native parity missing | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 113 | Automation Simulation On | automations / simulation parity missing | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 114 | Marketing Caption Editor | marketing / edit caption | QA saved draft caption fields inspected without saving. |
| 115 | AI Simulation Owner Review | Advanced AI simulator / review | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 116 | Review Requests Populated | Advanced reviews populated | Source inventory: native destination/parity incomplete or unavailable; not live accepted. |
| 117 | Marketing Grounded Draft | marketing / grounded draft | Existing grounded QA draft loaded; no new output generated or grounded-content certification. |
| 118 | Interaction States | shared interactive controls | Tabs, forms, dialogs and reduced-motion preference exercised; full keyboard/contrast/performance audit pending. |
| 119 | Shared Feedback States | shared status feedback | Not live accepted. No safely exercised reachable state or full evidence in this audit; remains outstanding. |
| 120 | Knowledge Approval States | knowledge / approval | Active fact review state rendered. Approval intentionally not submitted. |
| 121 | Service Removal Confirmation | configurationOnboarding / remove service | Not live exercised: account/setup/recovery or security-changing flow. Existing account and MFA preserved; synthetic tests are not live acceptance. |
| 122 | Marketing Approval State | marketing / approval | Draft and approved badges shown; native approve action missing, scheduling available only for approved records. |

## Additional routes

Legal routes opened: /legal/, /legal/terms.html, /legal/privacy.html, /legal/data-deletion.html, /legal/dpa.html, /legal/acceptable-use.html, /legal/storage.html, /legal/subprocessors.html.

Both /marketing.html and /site/index.html were opened. They retain Business AI branding, old promotional/trial claims and sign-in/trial links to https://app.getbusiness-ai.com/. Those links were inspected only, not followed. Colzo launch copy and Dev-safe navigation remain incomplete; neither page is accepted.

## Regression and delivery

Focused DOM regressions passed after reproducing failures. Final npm run verify passed 724/724 with 0 failures/skips after all changes, including security-view teardown; 234 JavaScript paths passed local checks. Draft PR #26 remains unmerged. New feature-branch automatic previews still lack branch-scoped Dev configuration; pinned previews use the existing configured PR19 Dev ref without copying credentials.

Screenshots were captured internally during this run. Private/customer/account screenshots are not committed or published. No before/after acceptance is claimed for the new patch until its candidate is checked after secure sign-in.
