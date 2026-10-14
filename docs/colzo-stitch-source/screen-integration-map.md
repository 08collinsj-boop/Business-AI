# Colzo Stitch screen integration map

Owner-approved design direction: all 38 new screens approved on 14 October 2026. This approval locks visual direction; it does not imply that every workflow is production-ready.

Legend:
- **Existing data / native route**: screen can be connected to already-loaded authenticated tenant records or existing app flow.
- **Draft / read-only**: UI may be shown but must disclose its limits; no fabricated persistence.
- **Backend gap**: do not simulate a successful save, publish, send, invite or payment.

| # | Screen | Integration target | Status / safety boundary |
|---:|---|---|---|
| 1 | Customer Profile | Native Colzo customer view | Integrated in this branch; derived read-only from existing enquiry records |
| 2 | Add Customer | Existing enquiry creation route | Separate customer persistence unavailable; do not claim a standalone customer was saved |
| 3 | Edit Customer | Existing enquiry editor only when editing an enquiry | No standalone customer record API verified |
| 4 | Enquiry Details | Native enquiry details | Uses authenticated enquiry records and existing editor |
| 5 | Create Enquiry | Existing authenticated enquiry form/API | Use existing validation and tenant checks |
| 6 | Edit Enquiry | Existing authenticated enquiry form/API | Use existing validation and tenant checks |
| 7 | Quotes Directory | Native quote draft view | Draft-only; no verified quote persistence |
| 8 | Quote Details | Native quote draft view | Do not claim sent/accepted/paid |
| 9 | Create Quote | Draft form | Copy-only until quote API exists |
| 10 | Edit Quote | Draft form | Copy-only until quote API exists |
| 11 | Projects Directory | Existing bookings/actions summary | Dedicated Projects module is not implemented |
| 12 | Project Details | Existing booking/action details where relevant | No standalone project record |
| 13 | Create Project | No verified persistent target | Backend gap; don't write project data into unrelated resources |
| 14 | Edit Project | No verified persistent target | Backend gap; don't write project data into unrelated resources |
| 15 | AI Receptionist Dashboard | Existing assistant controls and records | Design simulator is not a live model/voice integration |
| 16 | AI Conversations | Existing recorded conversation data only | No live inbox or fabricated conversation records |
| 17 | AI Receptionist Settings | Existing settings only where API supports them | Verify each setting before enabling writes |
| 18 | Business Knowledge | Existing knowledge controls | Keep owner-confirmation facts distinct from verified facts |
| 19 | Marketing Dashboard | Existing marketing module | Metrics must derive from actual drafts/posts |
| 20 | Marketing Content Creation | Existing draft workflow | No implied image generation or direct publishing |
| 21 | Marketing Library and Scheduling | Existing draft/library workflow | Scheduling/channel connection only if backend confirms it |
| 22 | Notifications | Native notification settings where supported | No claims of live channels until verified |
| 23 | Business Settings | Existing authenticated business settings | No unsupported “live workspace” status |
| 24 | Team and Permissions | Existing owner/team endpoints where supported | Do not invent members or imply an invitation succeeded |
| 25 | Billing and Subscription | Existing billing state | No fake checkout, payment or subscription status |
| 26 | More Menu | Native navigation | Show only supported modules and truthful status labels |
| 27 | Settings Hub | Existing settings screens | All links remain inside Colzo/native routes |
| 28 | Business Actions | Existing actions endpoint | Use authenticated existing API and confirm writes |
| 29 | Create Action | Existing action form/API | Save only after API success |
| 30 | Analytics | Aggregate existing tenant records | No invented revenue or growth numbers |
| 31 | Automations | Existing automation settings only | All switches stay off unless execution and approvals are verified |
| 32 | Customer Portal | Existing public/customer route if enabled | Do not imply public sign-in is available without verified configuration |
| 33 | Public Business Profile | Existing public profile data | Use verified business facts only |
| 34 | Review Requests | Existing manual draft workflow | Do not claim reviews were requested without a configured channel |
| 35 | Referrals | Existing referral capability if configured | No invented credits, rewards or redeemable codes |
| 36 | Integrations | Existing provider connection state | Disconnected until actual provider status confirms otherwise |
| 37 | Security and Privacy | Existing security controls | Display verified controls only; preserve auth and MFA gates |
| 38 | Feedback and Support | Existing support/contact route | Confirm submit destination and result before claiming sent |

## Integration rules
1. The authenticated existing backend remains the source of truth for identity, tenancy, records, permissions and business configuration.
2. Never create a new /api/colzo/* endpoint or assume a table exists without verifying it.
3. Never use sample/demo records as a fallback for a signed-in owner.
4. Preserve visible draft/read-only states when persistence is not available.
5. Each workflow needs tests for success, validation, API failure, tenant isolation and mobile layout.
6. This map is a staged integration plan, not a claim that all 38 screens are implemented.
