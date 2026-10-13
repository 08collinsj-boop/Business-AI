# Colzo — six-screen reference acceptance and release plan

Status: **development only**. This checklist uses the user-supplied six-phone Colzo Graphite & Volt artwork as the design target. It distinguishes code verified by tests from browser-tested product behaviour. It is **not** a claim of pixel-perfect certification.

## Acceptance scope

| Screen | Implemented in feature branch | Remaining before acceptance |
|---|---|---|
| Welcome / sign in | Colzo splash/manifest icons, dark auth layout, email/password Supabase sign-in and provider-gated Apple/Google/Microsoft buttons | Check phone rendering against reference; configure and test each OAuth provider separately, including callback URLs and account ownership; no inactive button should claim login success |
| Home | Dashboard cards for real enquiry count, active projects and **won estimates**, six-month **enquiry** chart, four quick actions | Verify time-zone/month boundaries, empty states, role permissions and exact visual spacing. Won estimates **must not** be labelled booked revenue. Actual revenue reporting requires payment/invoice data and a separate definition |
| Enquiries | Search, All/New/In Progress/Won filters, private enquiry list based on real leads | Test status counts, long names, empty results, accessibility, role permissions, keyboard navigation and mobile dimensions |
| Enquiry details | Real customer details, phone/email links, schedule handoff, make project, create quote and stage update | End-to-end test status changes and all contact actions; ensure no auto-contact is implied; user input must render without HTML injection |
| Projects | Tenant-scoped Postgres records, API, status filters, linked enquiries and progress values, create/edit forms | Test insert/update/conflict handling, role permissions, persistence on refresh, correct client association, and data exports/retention |
| Settings | Reference menu, business profile, team, integrations, real in-app work reminders, appearance, security and support; advanced features retained | Verify every menu route, MFA/AAL2 and legal screens, permissions, support links, keyboard navigation and accessibility; notification list is **not** push or email delivery |

## Related real operations

- **Clients:** dedicated tenant-scoped contacts; do not silently create a customer account or send invitations.
- **Quotes:** server-scoped, audit-logged quote drafts and human-confirmed statuses; **not** automatic emailing, PDF generation, payment collection or legal acceptance.
- **Reviews:** Google/Facebook/Trustpilot destinations, manual fallback; auto sending intentionally disabled pending compliance and provider testing.
- **Complaints:** signed-in customer intake and private owner/admin workflow, never public or AI-resolved without human action.
- **Existing modules:** booking/calendar, actions, AI receptionist, marketing, knowledge, billing, referrals and permissions must remain discoverable and pass regressions after the navigation change.

## Test evidence as of 12 October 2026

- `npm run verify`: **614/614 passed**, including static UI, workflow validation, database security and auth gating. These are automated/source tests, **not** interactive acceptance.
- Supabase **Business-AI-Dev**: four post-Pilot migrations applied (Trustpilot; complaints; review queue; Projects/Quotes/Clients). **IMPORTANT: the currently live `app.getbusiness-ai.com/api/public-config` also points to this Supabase project. Despite its name, do not treat this as a disposable/isolated development database.** `colzo_projects`, `colzo_quotes`, `colzo_clients` have RLS on, no `SELECT` grants to `anon` or `authenticated`; service role only. No test records were seeded, and no existing customer rows were intentionally changed; however these migrations made additive schema changes on a project used by the live application.
- Preview deployment is automatic on Vercel project `business-ai`, separate from the old Pilot project. Preview is behind Vercel SSO. Visual inspection could not be completed without authenticated browser access.
- Vercel preview environment values are masked to the integration; the PREVIEW-to-Supabase mapping remains **unverified**. The LIVE app-to-Supabase mapping was verified using its public `/api/public-config` URL (without exposing the public key). Do not infer which database a preview targets based on environment variable names alone.
- Apple, Google, Microsoft OAuth provider flags remain disabled unless deliberately configured server-side. No real customer review emails or notifications have been sent.

## Release gates — all required

1. **CRITICAL database preservation:** treat `Business-AI-Dev` as currently LIVE because the public app references it; do not reset users, reseed accounts, apply further schema changes, or point an untested preview at the live service-role credential. Confirm current backups and independently isolate future QA before any changes.
2. **Protected preview access:** sign in to a test owner account through an authorised Vercel session. Verify mobile viewport 375×812, 390×844, 430×932 and desktop 1366×768, 1440×900 against the reference image. Record screenshots, contrast, touch targets and any overflow. Do not use a production customer account as a test fixture.
3. **Functional browser run:** owner and customer roles; create, edit and refresh a test enquiry, client, quote and project; verify enquiry link isolation between two test tenants, valid stage transitions, duplicate protection, no unexpected email, and no broken navigation or errors. Use disposable test fixtures in an isolated database.
4. **Environment certificate:** confirm each Vercel project's deployment ref, targets, Supabase project URL, auth/role settings, CDN/asset path and Meta/Stripe separation without exposing credentials. Check source SHA.
5. **Legal/domain change:** confirm Colzo trading identity and updates to site copy, privacy/terms/DPA, sender branding, business pages and help/support channels. Preserve historical acceptance/audit records and avoid invalidating existing customer agreements without a reviewed process.
6. **Rollback plan:** save current `app.getbusiness-ai.com` deployment ID, branches, database backups and deployment mappings. Align the old `main` history with the Pilot-derived code before merging. Test a rollback on staging.
7. **Only then promote:** deploy the accepted SHA and compatible migrations, verify PWA cache changes, PWA name/icon, signed-in owner and customer flows, and monitor logs/errors. Do not automatically switch on outbound email or OAuth providers.

**Current public status:** `app.getbusiness-ai.com` still serves the previous application; completion of tests or a READY preview does not mean users can see the redesign in their installed app.

## Sign-in report and mobile visual fix

- A screenshot of the Vercel preview shows an existing owner login failing. No assertion of incorrect credentials is justified until the PREVIEW Supabase URL and anon/publishable key are compared with the original app, then OAuth/recovery/tenant membership checked with an authorised test account. Do not solicit or log user passwords.
- The prior auth UI was a large legacy form with iOS Safari light-yellow autofill. Commit `542676e` adds a separate Colzo welcome screen consistent with the six-phone reference; the existing email/password and role flows remain intact under Sign in.
- Mobile CSS fixes focus on input autofill, 16px zoom-safe input text, safe-area spacing and dark graphite fields. `617/617` automated tests pass; not authenticated browser-certified.
- The public application and previously saved customer data must stay unchanged while preview environment authentication is resolved. Never claim that a Vercel READY build or a new CSS file fixed login without a successful end-to-end sign-in test.
