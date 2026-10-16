# Colzo legal-centre rebrand - DRAFT FOR OWNER AND LEGAL REVIEW

**Status: PROPOSAL ONLY. NOT APPROVED, NOT EFFECTIVE, NOT PUBLISHED.**
Prepared 16 October 2026 on a branch separate from Work's development PR.
This file is an editing plan, not a legal opinion. The eight live legal HTML
pages, their URLs, acceptance records and current contract versions MUST remain
unchanged until the owner reviews the full replacement agreements.

## Evidence and proposed universal edits

- Static audit identifies **86 occurrences of "Business AI" in eight legal HTML
  documents**. Every document still uses the old brand in its page title.
- Proposed name for the customer-facing product: **Colzo**, subject to owner
  confirmation that its trading name, domain and contact addresses are ready.
- Proposed legal operator phrase for review:
  **"[OWNER-VERIFIED LEGAL NAME], sole trader trading as Colzo"**.
  Do not invent a company number, Ltd status, VAT number or registered office.
- The source currently uses an older product name in contractual clauses,
  examples, the dynamic service-provider text, Meta connection instructions,
  and footer notices. Do NOT do a global text replacement: a Meta developer app
  may still actually be named "Business-AI Pages" and external integrations,
  historical contracts and current Pilot customer identifiers can have distinct names.
- Keep the existing Legal Centre URL structure /legal/* until every incoming
  link, customer-facing consent screen and export has been checked.
- Existing dynamic operator data comes from /api/legal-public through
  legal/operator.js. Before publication verify that its real operator name,
  trading name, contact email, geographic correspondence address and business
  structure match the new agreements. A legal identity notice is not the same
  as an agreed trading identity.
- **Do not change legal version numbers or automatically reaccept terms.**
  Decide which material changes require a new approved version and customer
  reacceptance. Review privacy notice updates before new processing uses.

## Individual document review matrix

| Current public page | Existing source version | Proposed editorial change | Mandatory owner/legal verification |
| --- | --- | --- | --- |
| legal/index.html | References pack v1.1 | Retitle "Colzo Legal Centre"; group clear Terms, Privacy, DPA and data requests | Verify documents, their individual versions, effective dates and link labels |
| legal/terms.html | Terms v1.2 | Define "Colzo" as the product and specify the real sole trader operator | Product scope, payment/trial rights, cancellations, limitations, disputes, jurisdiction, support route |
| legal/privacy.html | Privacy v1.1 | Describe Colzo as the service while distinguishing business controller/customer and platform controller roles | Real purposes, lawful bases, retention, security, processors, transfers, data-rights route, marketing and AI providers |
| legal/dpa.html | DPA v1.1 | Where appropriate change references to "the Colzo service" and its verified operator | Article 28 processing details, instructions, breach notices, subcontractors, security, transfers, return/deletion, new acceptance |
| legal/acceptable-use.html | AUP v1.1 | Rename the service only; keep abuse controls intact | What AI/marketing integrations actually permit; permitted users and complaints |
| legal/storage.html | Storage/Cookie v1.1 | Rebrand visible page and align cookies with actual app behaviour | Cookie classifications, consent requirements, retention, analytics and storage claims |
| legal/subprocessors.html | Subprocessors v1.3 | Update product references without claiming an unconnected provider is live | Reconcile Supabase, Vercel, OpenAI/other AI gateways, Stripe, Meta, Twilio with CURRENT data flows, roles and transfer details |
| legal/data-deletion.html | Instructions unversioned | Rebrand platform rights-request instructions, keep clear controller/processor separation | Preserve accurate "Business-AI Pages" wording until Meta developer app is actually renamed; verify email, token deletion and retention processes |

## Proposed wording snippets (not publication-ready)

**Legal centre header:**
"Colzo legal information. Review the Terms of Service, Privacy Notice,
Data Processing Agreement and other policies before using the service.
The legal operator is [OWNER-VERIFIED LEGAL NAME], trading as Colzo,
at [VALID BUSINESS CORRESPONDENCE ADDRESS], contact [VERIFIED SUPPORT ROUTE]."

**Sole-trader identification:**
"Colzo is a trading name of [OWNER-VERIFIED LEGAL NAME], who operates the
service as a sole trader." Add details required for the specific document,
but no Companies House or VAT references unless independently verified.

**Enquiry/booking transparency:**
"The AI receptionist can answer supported website enquiries and record
booking requests. A booking request is not a confirmed appointment until
the business confirms it through its own booking process."

**Data deletion:**
"To request access to or deletion of information held by Colzo, use
[VERIFIED DATA RIGHTS CONTACT]. Depending on the information involved,
Colzo may act as controller for account and security information and
as processor for a business's customer enquiry records."

These are editorial proposals and MUST be checked against the actual
backend and UK GDPR controller/processor responsibilities before use.

## Non-negotiable publication checks

1. Owner confirms correct legal identity, trading name and a suitable valid
   postal correspondence/service address. Do not silently publish a home address.
2. Owner verifies real monitored support and rights-request contacts. Old
   support@getbusiness-ai.com may remain if it is actively monitored and the
   transition is disclosed; do not invent a support@colzo address.
3. Review each full agreement, not merely find-and-replace. Legal and product
   promises must reflect working application behaviour.
4. Owner approves document versions/effective dates and the plan for
   existing users' acceptance/reacceptance. Do not write new acceptance
   events by automation.
5. Review provider lists, transfer safeguards, payment paths and cookie claims
   against actual enabled infrastructure and a suitable legal review.
6. Keep any newly drafted wording in this review directory until explicit
   approval for publication and documented rollout/rollback.

## Reference guidance (review again on publication date)

- ICO privacy information checklist:
  https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/
- ICO controller/processor contract requirements:
  https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/contracts-and-liabilities-between-controllers-and-processors-multi/what-needs-to-be-included-in-the-contract/
- GOV.UK sole trader trading name:
  https://www.gov.uk/become-sole-trader/choose-your-business-name
- GOV.UK invoices and identifying information:
  https://www.gov.uk/invoicing-and-taking-payment-from-customers/invoices-what-they-must-include

**Release gate: BLOCKED pending identity, policy, consent and effective-date review.**
