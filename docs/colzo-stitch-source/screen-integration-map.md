# Colzo Stitch screen integration map

All 38 Stitch designs were approved by the owner on 14 October 2026. This locks the visual direction; it does not mean the screens are all integrated.

## Verified repository/backend facts
- Existing app API handlers include authenticated leads/enquiries, bookings, actions, business settings/configuration, marketing, billing, team and security operations.
- Read-only inspection of the **Business-AI-Dev** Supabase project confirmed that tables named `colzo_clients`, `colzo_projects` and `colzo_quotes` exist there, with business_id tenant columns. However, this repository branch has no matching API handlers or migrations for those tables, and the preview's effective database target has not been confirmed. Do not assume those tables exist in another environment or wire writes until the target is confirmed.
- The native Customer Profile added in this branch is derived from the authenticated tenant's existing enquiry records. It is read-only and does not yet use `colzo_clients`.
- A live unauthenticated check of `business-ai-pilot.vercel.app/api/business-onboarding` returns the expected 401 and `/api/health` returns 200. That does not reproduce the user's authenticated HTTP 500. Vercel runtime logs were unavailable for the relevant time window, so the cause of the sign-in/onboarding failure is still unconfirmed.

## Screen-by-screen status
| # | Screen | Current integration target | Status / boundary |
|---:|---|---|---|
| 1 | Customer Profile | Existing authenticated enquiry records | Integrated read-only in feature branch; separate saved customer records use Customers directory |
| 2 | Add Customer | `POST /api/colzo-records?resource=clients` | Integrated create form; owner/admin only; preview DB target still requires confirmation |
| 3 | Edit Customer | `PATCH /api/colzo-records?resource=clients&id=...` | Integrated edit form; tenant-filtered; preview DB target still requires confirmation; dedicated read-only profile detail added |
| 4 | Enquiry Details | Existing authenticated lead records | Native details screen exists |
| 5 | Create Enquiry | Existing authenticated `POST /api/leads` | Native Colzo form; server derives tenant membership and confirms successful creation |
| 6 | Edit Enquiry | Existing authenticated `PATCH /api/leads` | Native Colzo form for status, estimated value, priority, follow-up date and internal notes; uses only supported status values |
| 7 | Quotes Directory | `GET /api/colzo-records?resource=quotes` | Integrated list from tenant-scoped API |
| 8 | Quote Details | Saved quote records and related enquiry | Native read-only detail page with related enquiry, amount, status, notes and explicit edit action |
| 9 | Create Quote | `POST /api/colzo-records?resource=quotes` | Integrated save form; sending/emailing is not implemented |
| 10 | Edit Quote | `PATCH /api/colzo-records?resource=quotes&id=...` | Integrated edit form; sending/emailing is not implemented |
| 11 | Projects Directory | `GET /api/colzo-records?resource=projects` | Integrated saved projects list, status and progress |
| 12 | Project Details | Saved project record | Native read-only detail page with customer, status, progress, notes and explicit edit action |
| 13 | Create Project | `POST /api/colzo-records?resource=projects` | Integrated create form with server-side validation |
| 14 | Edit Project | `PATCH /api/colzo-records?resource=projects&id=...` | Integrated edit form with server-side validation |
| 15 | AI Receptionist Dashboard | Authenticated `/api/voice-status` | Native status view shows provider/live-call/environment gates only when server confirms them; no fake calls or transcripts |
| 16 | AI Conversations | Existing recorded call/enquiry data | Do not show fabricated conversation records |
| 17 | AI Receptionist Settings | Existing settings/configuration APIs | Verify each setting before adding writes |
| 18 | Business Knowledge | Existing authenticated `/api/knowledge` | Native source list, manual fact entry and explicit review/accuracy confirmation; file upload/extraction remains pending in the native UI |
| 19 | Marketing Dashboard | Native Colzo Marketing screen + existing `/api/marketing` | Native screen lists saved drafts from the authenticated tenant; create, edit and delete supported |
| 20 | Marketing Content Creation | Native Colzo draft form + existing `/api/marketing` | Explicit submit uses the existing AI Marketing allowance; nothing publishes automatically |
| 21 | Marketing Library and Scheduling | Existing `/api/marketing-schedules` | Native draft-library/schedule tabs; schedule only approved drafts, list upcoming/status and explicitly cancel upcoming schedules |
| 22 | Notifications | Supported native settings | No claims of live channels until configured |
| 23 | Business Settings | Existing authenticated settings/configuration | Do not claim unsupported settings were saved |
| 24 | Team and Permissions | Existing team/invitation operations | Confirm endpoint success before claiming invite |
| 25 | Billing and Subscription | Existing authenticated `GET /api/billing` | Native read-only Colzo summary shows returned plan/status/entitlements; checkout and subscription mutations remain intentionally unavailable here |
| 26 | More Menu | Native navigation | Self-contained menu routes supported screens and settings within Colzo; no undefined menu data dependency |
| 27 | Settings Hub | Existing settings routes | All navigation stays within Colzo |
| 28 | Business Actions | Existing actions API | Authenticated, tenant-scoped actions |
| 29 | Create Action | Existing actions API | Save only after API success |
| 30 | Analytics | Existing authenticated `/api/value-dashboard` | Native read-only metrics use real tenant data; opportunity value is clearly distinguished from revenue and delivery is not inferred from saved status |
| 31 | Automations | Existing automation settings | Remain disabled/approval-required until execution verified |
| 32 | Customer Portal | Existing public/customer routes | Do not imply public login unless configured |
| 33 | Public Business Profile | Existing verified public profile data | No invented business facts |
| 34 | Review Requests | Existing manual review workflow | Don't claim sent without channel confirmation |
| 35 | Referrals | Existing referral APIs | No invented credits/rewards |
| 36 | Integrations | Existing provider connections | Show connected only when API confirms |
| 37 | Security and Privacy | Existing security controls | Preserve auth, tenancy and MFA gates |
| 38 | Feedback and Support | Existing authenticated `/api/feedback` | Native Colzo form with categories, validation and success only after the API confirms a saved record |

## Required safeguards
1. The authenticated backend remains the source of truth for identity, tenancy, records, permissions and business configuration.
2. No new endpoint may trust a client-supplied business_id; derive it from authenticated membership.
3. Never use demo records as fallback for signed-in users.
4. Never claim a save, publish, send, invite or payment succeeded without API confirmation.
5. Before using the new write flows with real data, confirm the preview's Supabase target. No production DB changes or test rows were made.
6. Each workflow needs success, validation, API failure, tenant-isolation and mobile-layout tests.
