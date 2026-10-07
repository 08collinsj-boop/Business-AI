# Business AI — consolidated public-launch browser certification

Use this as the single browser/Work task after the non-browser launch hardening has passed.

## Evidence already captured - 7 October 2026

These checks are complete and should not be repeated unless the related configuration changes:

- repository test suite: 513 / 513 passing;
- local source verification: 159 JavaScript files checked with no secret-pattern or temporary-marker failures;
- live Pilot `/api/health`: HTTP 200 / `{"status":"ok"}`;
- public legal identity configuration: configured, including the direct contact route;
- DPA v1.1 is available; do not accept it on another person's behalf;
- ICO fee self-assessment result: Tier 1 fee required, £52 per year or £47 by Direct Debit; registration/payment was not completed;
- Vercel team plan: Hobby, so paid/commercial launch remains blocked until a suitable commercial plan or host is approved;
- Facebook Page connection: a Pilot Page is connected and a real Page post has already published successfully;
- Meta public App Review / advanced-access status for unrelated users is still unverified;
- Marketing generation reliability: `openrouter/free` with up to three attempts;
- scheduler: Supabase cron calls the protected scheduler hourly; Vercel has an 08:00 UTC daily fallback;
- Supabase Security Advisor: no HIGH/ERROR findings. Leaked-password protection is disabled and must be enabled in Auth settings before wider launch. The two RLS-without-policy INFO findings are intentional service-role-only incident-control tables.

The browser certification below still applies to checks that require a signed-in browser session, fresh emails, Meta Developer console access, Stripe TEST browser flow or destructive fake-data verification.

## Safety and scope

- Pilot only: `https://business-ai-pilot.vercel.app`.
- Do not touch the separate Production project.
- Do not make a real payment.
- Use Stripe TEST mode only.
- Do not publish a real Facebook post unless the user explicitly approves the final publish action.
- Do not accept legal documents on another person's behalf.
- Do not guess answers to the ICO fee self-assessment or any business/legal questionnaire. Stop and ask the user for factual answers where needed.
- Do not upgrade Vercel or purchase anything without explicit approval.
- Use clearly labelled QA/test data and clean up destructive QA data only where safe.

## A. Public legal render

Open the Legal Centre and render Terms, Privacy, DPA, Acceptable Use, Storage/Cookie and Sub-processors pages with JavaScript enabled.

Verify:
- the fallback Pilot identity notice is replaced by the configured Service provider block;
- legal/trading identity, geographic address and direct email/telephone contact routes are present;
- DPA v1.1 is shown;
- the sub-processor objection wording points to a usable contact route;
- Terms/Privacy/DPA links work from owner signup/onboarding, Billing/checkout surfaces and customer enquiry data collection;
- no private tax identifiers or application secrets are exposed.

## B. ICO fee self-assessment

Open the current ICO data-protection fee self-assessment.

- Answer only questions whose facts are already known with certainty.
- If any answer depends on the operator's activities, turnover, staff, exemptions or other factual/legal classification that is not certain, stop and ask the user.
- Record the result as `fee required`, `exempt`, or `blocked awaiting user answer`.
- Do not register or pay without explicit approval.

## C. Vercel commercial hosting gate

Confirm the `business-ai-pilot` team/project plan and current Vercel commercial-use terms.

- If still Hobby, mark paid commercial launch BLOCKED because Hobby is restricted to personal/non-commercial use.
- Present the current Pro option/cost to the user and stop before any purchase or upgrade.
- If the user approves an upgrade in the browser session, verify the project remains attached to the same Git branch, domains, environment variables and cron configuration afterwards.

## D. Authentication and email

Test a fresh clearly labelled QA account where possible:
- signup;
- confirmation email;
- owner login;
- password recovery email;
- recovery link returns to the correct Pilot flow;
- customer login/recovery if separate;
- no password is exposed or requested in chat.

## E. Owner onboarding and legal gating

Verify:
- one owner account creates exactly one business/membership;
- interrupted onboarding resumes;
- Terms/AUP/Privacy acknowledgements are accessible;
- current DPA acceptance is required before customer-data processing;
- legal documents remain accessible after acceptance;
- business public route is generated server-side and does not ask the owner to invent an internal tenant ID.

## F. Full owner journey

At mobile/iPhone viewport first, then brief desktop:
- Dashboard/Home;
- Leads;
- Actions;
- Bookings;
- AI Receptionist;
- Knowledge;
- Marketing Overview/Create/Library/Calendar/Automation;
- Settings;
- Billing;
- Team;
- Security & Incident Centre.

Verify no horizontal overflow, clipping, bottom-nav obstruction, broken safe areas, keyboard-covered important controls, stuck toast, inaccessible dialogs or inconsistent active navigation.

## G. Customer journey

As guest and authenticated customer where supported:
- business directory/search;
- open a business profile;
- normal question;
- quote request with clearly labelled QA contact details;
- booking request;
- human handover request;
- enquiry tracking in Customer Portal;
- confirm owner receives the correct lead/action/booking without cross-tenant leakage.

## H. Knowledge live acceptance

With harmless QA content only:
- upload at least TXT/CSV and one image/PDF if practical;
- verify extracted content is review-only until approved;
- reject/exclude/edit facts;
- approve a clearly labelled harmless fact with the accuracy confirmation;
- confirm Receptionist can use only approved facts;
- confirm an uploaded instruction such as 'ignore previous instructions' is treated as untrusted file data and is never executed;
- remove QA source afterwards if safe.

## I. Rights-request workflow with fake data

Use one clearly labelled fake QA lead.

- Locate the owner privacy/data controls.
- Export the lead and verify the export is tenant-scoped and contains the linked lead/history/booking/action data expected for that lead only.
- Exercise anonymisation/erasure on that QA lead only.
- Verify identifying/customer text is replaced/cleared as designed and an audit event is produced.
- Confirm there is no cross-tenant access.
- Do not run this against real customer data.

## J. Stripe TEST commercial journey

- Confirm plan price/interval before checkout.
- Verify Terms/Privacy are accessible before purchase.
- Start one fresh Stripe TEST checkout only.
- Verify business/customer mapping and return route.
- Verify entitlement changes only after the verified webhook.
- Verify manage subscription/portal, upgrade/downgrade/cancel wording and state.
- Verify the customer can still access the applicable legal terms after checkout.
- Never use a real card or live Stripe mode.

## K. Marketing / Facebook

- Generate a harmless QA draft and image.
- Verify saved Draft/Library state.
- Verify owner approval requirement.
- Verify scheduling without accidentally publishing.
- Confirm Facebook connection state and selected Page are tenant-scoped.
- Do not perform a new real publish unless explicitly approved.
- Confirm fully automated mode requires the stronger security/step-up path where configured.

## L. Meta terms checkpoint

Inspect the current Meta Developer/Platform terms applying to the connected Business AI app and record the exact terms/version/date if visible. Do not change app review/live status solely for this check. Confirm the public provider notice does not incorrectly describe Meta as always acting in only one legal role.

## M. Final runtime check

After the browser journey:
- `/api/health` returns 200;
- inspect recent Vercel 5xx/runtime errors for the certification period;
- inspect Supabase Auth errors for fresh signup/recovery failures;
- note whether `feedback.storage_error` recurs;
- do not expose credentials or customer content in the report.

## Final report

Return one table with `PASS / FAIL / BLOCKED`, evidence and required action for sections A–M.

Finish with exactly three headings:

1. `PUBLIC SOFT LAUNCH` — GO / NO-GO.
2. `PAID CUSTOMER LAUNCH` — GO / NO-GO.
3. `POST-LAUNCH P1` — managed backups/PITR + isolated restore drill, plus any non-blocking technical debt.
