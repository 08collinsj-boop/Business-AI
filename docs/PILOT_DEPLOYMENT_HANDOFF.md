# Pilot deployment handoff for Codex

This is the authoritative deployment sequence for the final local source package. **Do not touch Production.** Target only the existing `Business-AI-Dev` Supabase project and `business-ai-pilot` Vercel project after confirming their identities from the user's existing configuration.

## 1. Inspect before changing live systems

- Unpack the final project.
- Review `git diff`/source before applying anything.
- Confirm the target is Business-AI-Dev / Pilot, not Production.
- Confirm no real `.env`, tokens or secrets are present in the archive.
- Run `npm run verify` locally. The final source baseline is **174/174 tests passing**; require 174 tests or more with zero failures, plus all local verification checks passing.

## 2. Supabase Dev/Pilot migrations

Determine which migrations are already recorded in Business-AI-Dev; never blindly replay already-applied migrations. Apply only outstanding files in filename order. The newest local migrations are:

1. `20260923190000_add_ai_enquiry_reservation_release.sql`
2. `20260923193000_add_business_knowledge_uploads.sql`
3. `20260923200000_add_marketing_publishing_and_feedback.sql`

Earlier migrations are dependencies and must already exist or be applied in their existing order.

After migration:
- verify RLS on all new public tables;
- verify `business-knowledge` is private with the expected MIME/size restrictions;
- verify OAuth/token tables are not browser-readable;
- verify `claim_due_marketing_publications`, `claim_marketing_publication` and `sync_business_billing_from_stripe` are service-role-only;
- run Supabase security/performance advisors and investigate new warnings rather than suppressing them.

## 3. Pilot environment configuration

Use `.env.example` as the inventory. Configure secrets only in the Pilot environment. Keep Production unchanged.

Required for core app: Supabase keys/URL, OpenAI key, auth gates and public enquiry rate-limit secret/mode.

Stripe: use Test mode only. Keep base plan prices at Trial £3.99 one-off, Starter £29/month, Pro £69/month and Business £149/month. `STRIPE_PRICE_ADDON_AI_MARKETING` must remain blank until the user has explicitly approved the Marketing add-on price and the matching Stripe Test Price has been created.

Meta: do not invent version/scopes. Verify current Meta documentation/app settings first. Keep `META_PUBLISH_ENABLED=false` until OAuth/account discovery and one owner-approved harmless Page post have passed.

Scheduler: configure a strong `MARKETING_SCHEDULER_SECRET` and a supported server cron/scheduler to POST to `/api/marketing-scheduler`. Do not use a browser timer.

## 4. Tests before deploy

- `npm run verify` (includes the full automated test suite, `.js`/`.mjs` syntax checks, inline `index.html` script parsing, real-secret pattern scan and temporary-marker scan);
- review the output rather than bypassing any failed check;
- confirm the Vercel physical API module count remains within the project's plan limit.

Stop and diagnose any failure before deployment.

## 5. Commit/push and deploy Pilot only

Commit the final source to the intended Pilot-connected repository/branch, record the commit SHA and deploy only `business-ai-pilot`. Do not deploy or promote to Production.

## 6. Live Pilot smoke tests

### Auth/onboarding
- signup, verification, interrupted onboarding/resume and completion;
- exactly one owner membership/tenant;
- public link resolves without exposing tenant IDs.

### Receptionist
- active subscription normal conversation;
- multi-message conversation uses one enquiry-session allowance;
- direct human request does not burn AI allowance;
- provider failure releases reservation;
- off-topic question is not a lead/handover;
- legitimate missing business knowledge can hand over;
- false-positive phrases such as `fire alarms`, `emergency callout`, `property manager`, and `I don't need a human` do not trigger the wrong handover;
- owner AI instructions and approved Knowledge affect the correct tenant only.

### Knowledge
- owner/admin upload, member denied mutation;
- PDF/JPG/PNG/WebP/TXT/CSV harmless test files;
- duplicate/oversize/MIME mismatch rejection;
- review/edit/exclude/approve;
- cross-tenant denial;
- replacement remains non-destructive until approval;
- malicious document instructions stay untrusted.

### Stripe Test
- Trial purchase/duplicate-trial refusal;
- Starter/Pro/Business lifecycle;
- renewal, cancellation, `past_due`, failed payment and portal;
- webhook replay/idempotency and deliberately out-of-order subscription events;
- base plan determined from configured Price ID, not metadata;
- Marketing add-on only after its price is approved/configured; purchase/cancel must change entitlement only after verified webhook.

### Marketing
- generation/history/edit/regenerate/delete;
- admin/member cannot approve; owner can approve;
- only approved draft can create publication;
- no external publish without selected server-discovered account;
- scheduler claim/cancel/failure/retry paths.

### Meta (only when credentials/permissions are ready)
- OAuth state/callback/replay rejection;
- Page discovery and server-side selection;
- disconnect removes stored tokens/accounts;
- one harmless owner-approved Facebook test post;
- ambiguous provider result does not auto-retry;
- Instagram remains blocked until media publishing is actually implemented.

### Feedback/privacy
- member can submit feedback without conversation auto-attachment;
- owner/admin can review own-tenant feedback only;
- retention save, export/anonymisation and public data-use notice are visible/working.

## 7. Final report

Report:
- target project IDs/names confirmed;
- migrations applied/skipped;
- advisor results;
- test count/result;
- commit SHA;
- Pilot deployment URL;
- Stripe results;
- Knowledge results;
- Marketing/Meta results;
- scheduler configuration;
- any failed/blocked live verification.

Do not touch Production even if all Pilot checks pass. Production rollout is a separate explicit decision.
