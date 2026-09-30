# Business AI UK Compliance Pack v1.2

Status: Pilot legal/compliance implementation updated 30 September 2026 against current UK government and ICO guidance. It is not independent legal certification.

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
- Provider map includes Cloudflare Workers AI for Marketing image generation.
- Legal operator identity is browser-safe and server-configurable through environment variables rather than hard-coded into source.
- The public identity model supports a sole trader correctly: legal name and trading name are separate, business structure can be shown as `Sole trader`, and a Companies House number is optional rather than implied.
- Billing UI links to Terms/Privacy and reminds users to review plan, price, interval and tax treatment before payment.

## Browser-safe legal identity configuration

Required before paid public launch:
- `LEGAL_OPERATOR_NAME` — the operator's legal name.
- `LEGAL_TRADING_NAME` — for the current service, `Business AI`.
- `LEGAL_OPERATOR_TYPE` — for the current sole-trader structure, `sole_trader`.
- `LEGAL_OPERATOR_ADDRESS` — an address where legal documents can be delivered.
- `LEGAL_CONTACT_EMAIL` — a monitored business contact address.

When genuinely applicable:
- `LEGAL_COMPANY_NUMBER` — leave blank for a sole trader unless the operator later incorporates a company and the legal documents are updated for that company.
- `LEGAL_VAT_NUMBER` — populate only if a VAT registration number applies.

Do not publish a UTR, National Insurance number or other private tax identifier in these variables. The public `/api/legal-public` route exposes only the deliberately public fields above and never exposes application secrets.

For a sole trader using the Business AI trading name, the public legal identity should show both the individual's legal name and `Business AI` as the trading name. The service-address requirement should be satisfied with an address the operator is prepared and legally able to publish; do not silently substitute a private address.

## Current provider map

- Supabase — database, authentication, private file storage.
- Vercel — application hosting/serverless runtime.
- OpenAI — AI enquiry processing and configured AI features.
- OpenRouter — AI Marketing text generation/model routing.
- Cloudflare — Workers AI image generation.
- Stripe — checkout/subscription billing.
- Meta Platforms — optional Facebook connection/publishing.

## Remaining organisation-specific launch blockers

- Populate and verify the legal identity variables above.
- Complete the ICO data-protection fee self-assessment; pay/register if required.
- Review/record provider DPA and international-transfer safeguards.
- Nominate the incident/privacy-request owner and operating contact route.
- Verify the deletion/retention operating procedure with fake data.
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
