# Pilot privacy and data controls

Status: the technical controls and v1.1 UK Pilot legal wording have been reviewed against current ICO guidance as of 27 September 2026. This is not legal certification. Paid public launch remains blocked until the operator identity/contact details and organisation-specific compliance decisions below are completed.

## What the Pilot stores

Business AI may store customer enquiry/contact details, lead history, booking requests, actions, human-handover records and limited audit events so the business can manage enquiries. It also stores business configuration, approved Business Knowledge and optional Marketing records.

The public customer page states that the assistant is AI, links to privacy information at the point customer data is collected, asks customers not to send payment/card details, and explains that submitted details are stored for the business to manage the enquiry.

## Controller / processor model

For customer enquiry data, the subscribing business normally decides why and how the information is used and is therefore the controller. The Business AI operator processes that data on the business's documented instructions and is normally the processor. Business AI is a controller for its own account administration, billing, security, legal records and Pilot support.

The DPA is versioned and owner acceptance is required before customer-data processing is enabled for a business.

## Tenant and role boundaries

Private data is resolved through the authenticated user's server-verified membership. Customer data export/anonymisation and retention controls are protected server operations. Browser-supplied tenant IDs are never authority.

Audit metadata deliberately excludes common secret/personal-data fields. Pilot feedback automatically includes only safe application context such as page/category/version; it does not attach customer conversation content.

## Retention

`business_data_lifecycle_policies` stores owner-configurable review periods for lead data and audit records. The current defaults are 365 days for lead review and 730 days for audit review. These are review settings, not automatic deletion promises.

Before paid public launch, the operator must document the operational deletion schedule, backup/deletion handling, legal-record retention and who performs periodic reviews.

## Data access / deletion

The protected data-subject API supports owner-only export/anonymisation for an individual tenant-scoped lead. Before paid public launch, verify the complete rights-request workflow with fake data and document the person/contact route responsible for receiving and tracking requests.

## Providers and transfers

The legal sub-processor notice now reflects Supabase, Vercel, OpenAI, OpenRouter, Cloudflare, Stripe and Meta. Provider contracts/DPAs, data locations and international-transfer safeguards still need an organisation-specific review before paid public launch. Current ICO international-transfer guidance uses a three-step assessment and the ICO states that the existing IDTA/Addendum should continue to be used until updated versions are issued.

## Device storage / PECR

The Pilot intentionally uses only storage required for requested authentication/app functions and static app delivery. It does not intentionally configure advertising or behavioural-tracking technologies. If non-essential storage/access is added later, assess the current PECR exception/consent requirements before enabling it.

## Incident handling

Maintain an incident log for all personal-data breaches. If a breach is notifiable, the controller must notify the ICO without undue delay and, where feasible, within 72 hours of becoming aware. Where a breach is likely to create a high risk to people, affected individuals may also need to be informed without undue delay. Processor-to-controller notification is covered in the DPA.

See `docs/PRIVACY_INCIDENT_RUNBOOK.md`.

## Remaining paid-public-launch decisions

- Configure `LEGAL_OPERATOR_NAME`, `LEGAL_OPERATOR_ADDRESS` and `LEGAL_CONTACT_EMAIL`.
- Configure company/register number and VAT number where applicable.
- Complete the ICO data-protection fee self-assessment and register/pay if required.
- Record the operator's incident owner and privacy-request contact/process.
- Review provider DPAs and restricted-transfer arrangements.
- Confirm tax/VAT presentation before taking real paid orders.
- Verify checkout/order confirmation and access to the accepted terms.
- Review retention/deletion operations with fake data.
- Obtain professional legal review if the risk profile, customer type or processing becomes materially more complex.

This document describes the current technical/compliance position and is not legal advice.
