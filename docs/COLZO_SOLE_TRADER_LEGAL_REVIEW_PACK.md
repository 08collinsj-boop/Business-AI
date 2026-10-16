# Colzo sole-trader legal and operator handover - INTERNAL REVIEW DRAFT

> **UNPUBLISHED. NOT A LEGALLY APPROVED CUSTOMER CONTRACT.**
> Prepared for the controlled Colzo v1 launch. Do not deploy, publish, merge, accept agreements on behalf of a customer, create a company, pay fees, make personal-data disclosures or enable billing because of this document.
> Owner decision as of 15 October 2026: Colzo will operate under an individual **sole-trader trading name**, not through a registered limited company.

## 1. Operator position agreed vs outstanding

| Item | Proposed value / status | Can be made public now? |
| --- | --- | --- |
| Trading name | Colzo | Public as a brand; check conflicting trade marks before relying on exclusive rights |
| Operator type | Sole trader (`sole_trader`) | Yes, after operator verifies |
| Individual legal name | **[OWNER TO CONFIRM EXACT LEGAL FORM]** | Not until owner authorises disclosure |
| UK address for service/geographic establishment | **[OWNER-APPROVED VALID CONTACT/SERVICE ADDRESS]** | **NO** until safe address and explicit approval; never infer or expose home address |
| Customer support email | **[OWNER-APPROVED INBOX]** | **NO** until tested; old Business AI address must not be silently presented as Colzo |
| Direct customer contact telephone | **[OWNER-APPROVED NUMBER]** | **NO** until verified and owner approves; currently a required identity readiness field in code |
| VAT number | **[EMPTY UNLESS ACTUALLY REGISTERED]** | Never invent |
| Companies House number / "Colzo Ltd" | **Not applicable to proposed sole trader** | Never invent or imply incorporation |
| ICO registration number | **[NOT CONFIRMED]** | Never claim registered without verification |
| HMRC Self Assessment | Owner intends to register when required | The UK £1,000 threshold concerns **gross trading income in a tax year**, not profit or lifetime sales, and does not waive other obligations |

For draft/customer-facing wording **after details are confirmed**, propose:
**"Colzo is a trading name used by [INDIVIDUAL FULL LEGAL NAME], a sole trader operating in the United Kingdom. Contact [VERIFIED CONTACT EMAIL] or [VERIFIED CONTACT TELEPHONE]. Service address: [APPROVED UK ADDRESS]."**
Review whether additional disclosures are needed for the final B2B/consumer distribution model and whether any verified details should be disclosed in supplementary channels.

Source checks: https://www.gov.uk/become-sole-trader , https://www.gov.uk/become-sole-trader/choose-your-business-name , https://www.gov.uk/invoicing-and-taking-payment-from-customers/invoices-what-they-must-include .

## 2. Verified deployment blocker

At the **correctly isolated** branch Preview `https://business-ai-git-fix-colzo-composio-first-pr-378bde-buisness-ai1.vercel.app`:

- `GET /api/public-config` confirms `Business-AI-Dev` Supabase `mvwseobgkexzpmmkgcxe`.
- `GET /api/legal-public` returns `legal.identity_configured=false`. Operator name/type/trading name/contact/address readiness fields are absent in this Preview.
- `lib/legal-handler.js` refuses the owner DPA acceptance with HTTP 409 until the provider identity is configured. **Real business onboarding is therefore blocked** until approved operator details are applied in the correct non-production environment and tested.
- No fake name, personal address, invented phone or old Production service secrets should be inserted merely to change the boolean.

The current readiness contract is in `lib/legal-public-handler.js`. The following **configuration keys** are used (values must be reviewed, not shared in PR text):

```text
LEGAL_OPERATOR_NAME=[CONFIRMED SOLE-TRADER LEGAL NAME]
LEGAL_TRADING_NAME=Colzo
LEGAL_OPERATOR_TYPE=sole_trader
LEGAL_OPERATOR_ADDRESS=[APPROVED AND VALID CONTACT/SERVICE ADDRESS]
LEGAL_OPERATOR_ADDRESS_PUBLIC_CONFIRMED=true   # ONLY after explicit approval
LEGAL_CONTACT_EMAIL=[VERIFIED SUPPORT EMAIL]
LEGAL_CONTACT_PHONE=[VERIFIED DIRECT CONTACT NUMBER]
LEGAL_COMPANY_NUMBER=[EMPTY FOR SOLE TRADER]
LEGAL_VAT_NUMBER=[EMPTY UNLESS VERIFIED REGISTERED]
```

Never edit the shared Pilot Auth project, older Pilot identity, Production or external finance accounts to repair a preview launch gate. Review preview branch-specific Vercel target scopes before any setting changes.

## 3. Customer-facing legal document inventory (source checked 15 Oct)

| Current path | Source version | Required review for Colzo |
| --- | --- | --- |
| `legal/index.html` | Portal v1.1 | Brand, operator identity, pilot-only wording, legal access from signup |
| `legal/terms.html` | Terms v1.2 | Sole trader as contracting party; current product feature claims, pricing, trial, fair cancellations/refunds, support |
| `legal/privacy.html` | Privacy v1.1 | Controller/processor split, AI providers, lawful bases, transfers, retention, marketing/data rights |
| `legal/acceptable-use.html` | AUP v1.1 | Brand, prohibited uses, business account obligations, supported AI safeguards |
| `legal/dpa.html` | DPA v1.1 | Processor legal identity, Article 28 obligations, sub-processors, transfers, deletion, versioned signature |
| `legal/subprocessors.html` | **Page v1.3** | Confirm actual provider list/regions/contracts; API metadata had incorrectly reported 1.1; isolated QA PR #13 corrects API version to 1.3 with 6 regression tests |
| `legal/storage.html` | Cookies v1.1 | Verify actual local storage, analytics/cookies, cache and PECR position |
| `legal/data-deletion.html` | Separate instructions | **URGENT mismatch:** currently hard-codes an individual and the old "trading as Business AI" name plus old support inbox instead of using the shared `/api/legal-public` identity source. Review/replace intentionally, preserve a functioning rights-request route and any Meta-required URL. |

All eight pages still use Business AI or Pilot branding; **do not blind-replace legal claims**. A UK consumer may have specific pre-contract/cancellation rights if Colzo is sold to consumers, so the initial strict B2B positioning must be independently checked against actual buyer type. Useful sources: https://www.gov.uk/online-and-distance-selling-for-businesses and https://www.legislation.gov.uk/uksi/2013/3134 .

## 4. Safely controlled acceptance and versioning

`lib/legal.js` currently exposes:

```text
terms 1.2
privacy 1.1
acceptable_use 1.1
dpa 1.1
storage 1.1
subprocessors 1.3  # corrected on isolated QA branch
```

Before changing public documents to a materially different Colzo trading entity/name:
1. Keep prior document bodies and acceptance records retrievable; do not rewrite history or mark past acceptance as new Colzo acceptance.
2. Review each new legal version with the owner. Where new assent is required, raise the corresponding `LEGAL_VERSIONS` value and ensure owner/member account acceptance is re-requested in the existing gating flow. The DPA is a separate owner-only acceptance.
3. Test `GET /api/legal-public` identity fields only after public disclosure approval, and verify the DPA gate permits appropriate real owners while denying non-owner and unconfigured identity cases.
4. Test signup legal text, all legal links, customer portal, support/deletion route, marketing opt-in, billing checkout and cancellation wording against the same operator identity.
5. Never infer an existing customer accepted new terms just because the URL or title changed; review legal need for notices, acceptance, change date and electronic records.

## 5. Other obligations independent of HMRC £1,000 registration threshold

- Keep actual **gross receipts, expenses and invoices** from the first sale. The owner's preference to postpone tax registration until required does not defer record keeping, applicable UK GDPR/PECR and ICO duties, or third-party hosting terms.
- The project prior ICO self-assessment indicated a fee may be required; owner must check current exemption, amount, registration and payment status. Do not state registered/paid unless verified.
- Vercel team's Hobby tier was identified as inappropriate for commercial paying use; do not upgrade or incur costs without approval.
- Test Stripe only in TEST mode, after exact plan prices and free-Pilot entitlements are reconciled and checkout properly displays the legal entity.
- Establish a working direct support contact, a lawful data rights/deletion contact and an actual rollback/backup plan before inviting non-test customer data.
- Check the Colzo name for trade-mark conflicts (using official UK IPO search before relying on exclusivity) and appropriate domain, avoiding any unverified claims of registration.

## 6. Work handover / acceptance record

**Do now without owner disclosure:** review the implementation of operator identity and versioned legal acceptance; build unpublished Colzo copy drafts for the eight legal pages; preserve functional links and existing Business AI rights request pages; prepare tests.

**Do only with operator approval:** configure a public service address and customer contact info, publish full legal identity, approve final document versions, enable paying subscriptions and customer onboarding, migrate data, change domains or deploy Production.

### Exit criteria for this legal blocker

- [ ] Sole-trader legal name and contact/service address explicitly approved for use
- [ ] Contact email and number verified functional and approved
- [ ] Correct non-production identity endpoint returns configured with no misleading company/VAT details
- [ ] All eight pages rebranded and legal assertions reviewed, signed off and versioned where needed
- [ ] Owner DPA gating and past acceptance records verified with test data
- [ ] ICO/trading/hosting/payment disclosures resolved for the intended offer
- [ ] No new legal or personal data exposure occurred during the work

**Status:** Legal operator confirmed as *sole trader*, but **public identity, DPA onboarding, final document wording and commercial launch remain BLOCKED**.
