# Pilot privacy and data controls

Status: technical controls are implemented locally; final business/legal wording still requires approval before real-customer use.

## What the Pilot stores

Business AI may store customer enquiry/contact details, lead history, booking requests, actions, human-handover records and limited audit events so the business can manage enquiries. It also stores business configuration, approved Business Knowledge and optional Marketing records.

The public customer page states that the assistant is AI, asks customers not to send payment/card details, and tells them that submitted details are stored for the business to manage the enquiry.

## Tenant and role boundaries

Private data is resolved through the authenticated user's server-verified membership. Customer data export/anonymisation and retention controls are protected server operations. Browser-supplied tenant IDs are never authority.

Audit metadata deliberately excludes common secret/personal-data fields. Pilot feedback automatically includes only safe application context such as page/category/version; it does not attach customer conversation content.

## Retention

`business_data_lifecycle_policies` stores owner-configurable review periods for lead data and audit records. These values are operational review settings, not an automatic claim of legal compliance and not a substitute for the business deciding whether it has a lawful reason to retain/delete data.

The Pilot owner UI exposes the retention settings and makes clear that the business remains responsible for deletion/anonymisation decisions.

## Data access / deletion foundation

The protected data-subject API supports owner-only export/anonymisation for an individual tenant-scoped lead. It is intentionally deliberate rather than an unattended bulk-delete mechanism.

Before real Pilot use, verify the workflow with fake data and document who receives and processes customer requests.

## Knowledge and provider data

Business Knowledge source files are private. Extracted facts are untrusted until a business user reviews/approves them.

Stripe and Meta credentials/tokens remain server-side. Meta tokens are encrypted at rest in application tables. No payment/card details should be entered into the Business AI customer chat.

## Decisions required before real customers

- final privacy notice / controller-processor wording appropriate to the operating business;
- support/contact route for access or deletion requests;
- retention periods and incident owner;
- whether additional consent/notice is needed for any future call recording or analytics;
- review of third-party provider terms/data-processing settings.

This document describes technical behaviour only and is not legal advice.
