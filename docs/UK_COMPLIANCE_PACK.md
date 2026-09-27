# Business AI UK Compliance Pack v1.1

Status: Pilot legal/compliance implementation updated 27 September 2026 against current ICO guidance and the Electronic Commerce (EC Directive) Regulations 2002. It is not independent legal certification.

## Implemented

- Public Legal centre: Terms, Privacy Notice, DPA, Acceptable Use, Storage/Cookie Notice and Sub-processor Notice.
- All legal documents versioned at 1.1.
- Signup requires explicit Terms/AUP agreement and Privacy acknowledgement.
- Existing users are gated when accepted versions are no longer current.
- Business owners are gated until the current DPA is accepted.
- Acceptance records are server-side, versioned and timestamped.
- Customer enquiry UI links to privacy information at collection.
- Privacy notice now states data categories/sources, purposes/lawful bases, recipients, transfers, retention, rights, complaint route and a separately highlighted right to object.
- Storage notice reflects the ICO's 2026 Storage and Access Technologies guidance and the Pilot's current essential-only storage posture.
- DPA covers Article 28 processing details and minimum processor clauses.
- Provider map includes Cloudflare Workers AI for Marketing image generation.
- Legal operator identity is browser-safe and server-configurable through environment variables rather than hard-coded into source.
- Billing UI links to Terms/Privacy and reminds users to review plan, price, interval and tax treatment before payment.

## Browser-safe legal identity configuration

Required before paid public launch:
- `LEGAL_OPERATOR_NAME`
- `LEGAL_OPERATOR_ADDRESS`
- `LEGAL_CONTACT_EMAIL`

When applicable:
- `LEGAL_COMPANY_NUMBER`
- `LEGAL_VAT_NUMBER`

The public `/api/legal-public` route exposes only these deliberately public details. It never exposes secrets.

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

- ICO — Right to be informed / required privacy information.
- ICO — Right to object.
- ICO — Contracts between controllers and processors / Article 28.
- ICO — Storage and Access Technologies guidance, finalised April 2026.
- ICO — International transfers guidance, updated January 2026.
- ICO — Personal-data breach guidance.
- ICO — Data protection fee self-assessment.
- Electronic Commerce (EC Directive) Regulations 2002, regulations 6 and 9.

Because ICO guidance is being updated following the Data (Use and Access) Act 2025, this pack should be reviewed again before a later Production launch.
