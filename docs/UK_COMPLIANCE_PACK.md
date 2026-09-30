# Business AI UK Compliance Pack v1.3

Status: Pilot legal/compliance implementation updated 1 October 2026 against current UK government and ICO guidance. It is not independent legal certification.

## Implemented

- Public Legal centre: Terms, Privacy Notice, DPA, Acceptable Use, Storage/Cookie Notice and Sub-processor Notice.
- Legal documents are versioned and acceptance is recorded server-side where required.
- Signup requires explicit Terms/AUP agreement and Privacy acknowledgement.
- Existing users are gated when accepted versions are no longer current.
- Business owners are gated until the current DPA is accepted.
- Acceptance records are server-side, versioned and timestamped.
- Customer enquiry UI links to privacy information at collection.
- Privacy notice states data categories/sources, purposes/lawful bases, recipients, transfers, retention, rights, complaint route and a separately highlighted right to object.
- Storage notice reflects the ICO's 2026 Storage and Access Technologies guidance and the Pilot's current essential-only storage posture.
- DPA covers Article 28 processing details and minimum processor clauses.
- Provider map includes Resend for transactional authentication email and Cloudflare Workers AI for Marketing image generation.
- Legal operator identity is browser-safe and server-configurable through environment variables rather than hard-coded into source.
- The public identity model separates legal name and trading name, keeps business-structure wording optional, and does not imply that a Companies House number exists.
- Billing UI links to Terms/Privacy and reminds users to review plan, price, interval and tax treatment before payment.
- Supabase Auth is configured to use a verified, domain-restricted Resend SMTP sender for confirmation and recovery email rather than the built-in development mail service.

## Browser-safe legal identity configuration

Required before paid public launch:
- `LEGAL_OPERATOR_NAME` — the legal identity of the person or entity actually operating the service.
- `LEGAL_TRADING_NAME` — for the current service, `Business AI`.
- `LEGAL_OPERATOR_ADDRESS` — a geographic address where legal documents can be delivered.
- `LEGAL_CONTACT_EMAIL` — a monitored business contact address.

Optional descriptive/public fields:
- `LEGAL_OPERATOR_TYPE` — populate only if a business-structure label is accurate and should be shown publicly.
- `LEGAL_COMPANY_NUMBER` — populate only if a registration/company number genuinely applies.
- `LEGAL_VAT_NUMBER` — populate only if a VAT registration number genuinely applies.

Do not publish a UTR, National Insurance number or other private tax identifier in these variables. The public `/api/legal-public` route exposes only the deliberately public fields above and never exposes application secrets.

The provider identity must reflect the actual operator at launch. Business AI does not require `LEGAL_OPERATOR_TYPE` or a Companies House number for `identity_configured` to become true. Do not describe the operator as a sole trader, company or partnership unless that description is accurate at the time.

## Current provider map

- Supabase — database, authentication and private file storage.
- Resend — transactional authentication email for confirmation, recovery and account-security messages.
- Vercel — application hosting/serverless runtime.
- OpenAI — AI enquiry processing and configured AI features.
- OpenRouter — AI Marketing text generation/model routing.
- Cloudflare — Workers AI image generation.
- Stripe — checkout/subscription billing.
- Meta Platforms — optional Facebook connection/publishing.

## Remaining organisation-specific launch blockers

- Populate and verify the public legal identity variables above.
- Complete the ICO data-protection fee self-assessment; pay/register if required.
- Review/record provider DPA and international-transfer safeguards, including Resend.
- Configure the monitored public privacy/contact route through `LEGAL_CONTACT_EMAIL`.
- Verify the documented rights-request and retention/deletion procedures with clearly labelled fake data.
- Confirm VAT/tax presentation before accepting real paid orders.
- Confirm real checkout/order confirmation wording and retained access to contract terms.
- Re-run the full launch smoke-test after all above items are complete.

## Current official guidance checked

- GOV.UK — sole trader business-name rules: a sole trader can use a trading name, and official paperwork must show the trader's name and business name.
- GOV.UK — sole trader invoice rules: where a business name is used, invoices must show the trader's name and an address where legal documents can be delivered.
- ICO — Right to be informed / required privacy information.
- ICO — Right to object.
- ICO — Contracts between controllers and processors / Article 28.
- ICO — Storage and Access Technologies guidance, finalised April 2026.
- ICO — International transfers guidance, updated January 2026.
- ICO — Personal-data breach guidance.
- ICO — Data protection fee self-assessment.
- Electronic Commerce (EC Directive) Regulations 2002, regulations 6 and 9.

Because ICO guidance is being updated following the Data (Use and Access) Act 2025, this pack should be reviewed again before a later Production launch.
