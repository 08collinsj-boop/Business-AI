# Business AI UK Compliance Pack v1

Status: Pilot implementation prepared for 27 September 2026.

## Implemented in the product

- Public legal centre with Terms of Service, Privacy Notice, Data Processing Agreement, Acceptable Use Policy, Storage/Cookie Notice and Sub-processor Notice.
- Signup requires explicit Terms/AUP agreement and Privacy acknowledgement.
- Authenticated users are gated when the current account-document versions have not been accepted.
- Business owners are gated until the current DPA version is accepted for their business.
- Acceptance records are server-side, versioned and timestamped.
- Customer enquiry UI links directly to privacy and storage information.
- Settings contains permanent legal-document links and current acceptance status.
- Storage notice reflects current Pilot behaviour: authentication browser storage, tenant-scoped sessionStorage for the owner test chat and static PWA caching only; no intentional advertising/behavioural analytics trackers are configured by the application.
- The DPA covers the Article 28 processing details and clauses: documented instructions, confidentiality, security, sub-processors, data-subject rights, compliance assistance, end-of-contract deletion/return and audits.

## Current provider map

- Supabase: database, authentication, private file storage.
- Vercel: hosting/serverless runtime.
- OpenAI: AI receptionist responses and optional live marketing-image generation.
- OpenRouter: AI Marketing text generation and model routing to underlying providers.
- Stripe: checkout/subscription billing.
- Meta Platforms: optional Facebook Page connection/publishing.

## Paid-public-launch blockers

The Pilot must not be represented as a fully completed public legal rollout until the service provider's:
- legal/trading name;
- geographic establishment address;
- direct contact email;
- company/register number if applicable; and
- VAT number if applicable

are published in an easily accessible place and reflected in the Terms/Privacy/DPA.

Also complete:
- ICO data-protection fee self-assessment;
- provider DPA and international-transfer review;
- final retention/deletion operating procedure;
- incident/breach owner and contact process;
- checkout confirmation/email terms for real paid billing.

## Official references used

- ICO — Right to be informed / privacy information.
- ICO — Contracts between controllers and processors / Article 28 clauses.
- ICO — Storage and Access Technologies guidance (finalised 29 April 2026), including the strictly-necessary exception.
- ICO — International transfers guidance (updated January 2026).
- Electronic Commerce (EC Directive) Regulations 2002, regulation 6 and regulation 9.
- GOV.UK — Online and distance selling guidance.

This implementation is a compliance foundation for the Pilot, not independent legal certification.
