# Colzo — 14-day pilot participation addendum and accountable acceptance
**Draft v0.2 | Prepared 2 November 2026 | NOT APPROVED, NOT SIGNED, NOT PUBLISHED**

> **Use only after operator review and proof that the agreed data-return/deletion annex can be honoured.** This is a template for one limited UK business pilot, not a substitute for the Colzo Terms, Privacy Notice, Acceptable Use Policy and Data Processing Agreement (DPA), or for professional legal review. It does not alter existing legal document versions or grant any account access.

## 1. Parties and business authority

**Colzo operator**: the legal sole-trader identity, trading name, service/contact address and published legal contact verified through the final approved release's `/api/legal-public`. Do not duplicate private address or contact details in this repository.

**Pilot business/controller**: [legal business name, service address], represented by [authorised owner/position]; confirm their authority separately through authenticated onboarding and recorded consent.

## 2. Trial, permitted scope and exclusions

- Free limited-use trial for exactly **336 consecutive hours (14 days)** from the timestamp written into the audited business grant, ending at the recorded expiry. No card, no automatic subscription, no charges, no automatic extension, no obligation to join a paid plan.
- Permitted functionality is the specific current Preview capability the operator has independently tested and enabled: business workspace, enquiries/leads, follow-ups/actions, requests/bookings, approved Knowledge, and **manual unpublished Marketing drafts**. The user approves important customer content and booking confirmations.
- Not included: AI telephone answering, AI Marketing generation, automatic or social publishing, paid billing, Stripe checkout, and any provider integration or service not explicitly enabled.
- The owner may create an individual verified login and workspace *without operator approval for each signup only after the technical release has been authorised*. Secure login, MFA/AAL2 where required, legal acceptance, DPA, audit and tenancy boundaries remain mandatory.
- A public/demo link is not legal acceptance, contract commencement or an assurance that a real-customer-data pilot is cleared.

## 3. Data and roles

- The participant is normally Controller for data from its own customers and enquiries. The verified Colzo operator is Processor under **DPA v1.1**, acting on documented business instructions. Colzo is Controller for its own account, security and support records under **Privacy Notice v1.1**.
- The controller provides appropriate notices and lawful basis and avoids unnecessary sensitive/special-category or criminal-offence information, credentials, payment cards and health/safety-critical facts in this restricted pilot.
- **No real customer personal data is authorised until** operator and participant approve the data-exit annex below and the technical security/recovery limitations. Until then, use clearly fictional demonstration content only.
- Current Terms v1.2, AUP v1.1, Storage Notice v1.1 and Sub-processors Notice v1.3 remain separately versioned. Revalidate their exact published versions on the final release and renew acceptance if content changes.

## 4. Support, privacy incidents and security

Contact: use the verified and published Colzo support/legal contact; `support@getbusiness-ai.com` is the candidate support alias **subject to separate live external delivery and monitoring confirmation**. No 24/7 coverage or fixed response-time promise is implied.

Report a suspected incident promptly through the verified contact without attaching passwords, MFA codes, account tokens or full customer lists. Colzo will take proportionate containment steps and, as Processor, notify the business controller of a customer-data breach without undue delay. The controller determines any regulatory or data-subject notifications. Colzo also handles statutory controller obligations for its own account/support data. An ordinary support query does not replace emergency business contact.

Privacy complaints may be made via the published route and will be acknowledged within the applicable 30-day period, investigated and responded to without undue delay. Rights requests will be verified, routed to the appropriate Controller and processed with assistance under the DPA.

## 5. Prerelease recovery disclosure — separately acknowledge

The pilot is prerelease software. The operator has **not verified a complete source database, Auth-account and Storage-object backup and isolated restoration**. A technical fault could cause unavailable or permanently lost records. No recovery-point objective, recovery-time objective, uptime or loss-free performance is promised. The business **must not use Colzo as the sole copy of important records**.

This warning does not exclude non-excludable rights or replace the Processor's duties under UK GDPR and the DPA. The account owner must actively tick/approve a distinct acknowledgment before permission to enter real customer data.

## 6. End-of-pilot data return/deletion — owner-choice annex required

The 14-day expiry restricts workspace access; it does **not** erase the data. Under DPA Article 28 terms the participant Controller must be given a choice, subject to lawful storage exceptions, of return or deletion of the personal data Colzo processes on its behalf.

**To be completed before real personal-data collection, with tested implementation:**

| Item | Agreed and demonstrated value |
| --- | --- |
| Controller-authorised choice | [Return / Delete, including requests for additional export before deletion] |
| Export scope | [Enquiries, customers, histories, bookings, actions, projects, quotes, Knowledge including file bytes, Marketing drafts, other linked data, clearly documented exclusions] |
| Return format, completeness and delivery | [JSON/CSV, attachments/manifest/checksum; protected recipient channel and authority verification] |
| Request route and cutoff | [Owner authenticated route, mutually accepted feasible period] |
| Return lead and deadline | [Accountable operator; actually demonstrated and agreed date] |
| Primary data-deletion trigger/deadline | [Reviewed and accepted, only after tested transactional procedure] |
| Storage/Auth/processor/backups | [Object paths/reference mapping; shared user decisions; provider and backup lifecycle] |
| Security/legal retention exceptions | [Allowed categories, justification, restricted access and review/deletion trigger] |
| Synthetic rehearsal evidence | [Link to CI + independently reviewed scope, foreign-tenant denial and verification] |
| Operator acceptance | [Legal operator identity, dated recorded signature/approval] |
| Business controller instruction | [Authorised owner, dated recorded instruction/acceptance] |

**No calendar deadline is agreed by this blank template.** Do not insert a speculative 14-day export or 30-day deletion promise until engineering demonstrates it can be met. If technical export and deletion cannot be supported, the pilot must remain restricted to **fictional data only**. Ending a pilot does not waive the controller's Article 28 rights.

## 7. Recorded informed acceptance — separate affirmative actions

The system/operator must store one versioned, timestamped record of each real business owner making each choice:

- [ ] I am authorised to act for the named pilot business.
- [ ] I reviewed and accept the exact versioned Colzo Terms/AUP/Privacy documents.
- [ ] As business controller, I reviewed and agree to the current Colzo DPA.
- [ ] I accept this particular 336-hour free trial scope and exclusions; no card or automatic paid conversion.
- [ ] I read and understand the **specific unverified full-backup/restore and potential data-loss disclosure**.
- [ ] I approved the **completed, technically demonstrated** business-specific data return/deletion annex; I understand expiry does not itself erase records.
- [ ] My business and the verified Colzo operator have agreed who monitors support and the incident escalation route.

**Participant business**: [business ID/private consent ledger pointer]; **accepted versions and timestamps**: [immutable private record]. **Operator**: [signed/approved person, time, policy version]. **Pilot release**: [deployed SHA, QA acceptance evidence, approved flag]. **Activation timestamp**: [UTC]; **expiry**: [UTC +336 h].

**This document intentionally contains no pre-ticked boxes or simulated electronic signatures.**

## 8. Unresolved legal/operations checks before publication

1. Final operator confirmation of public legal identity and contact, accurate current processors/transfer safeguards, and self-service wording versus legacy invitation-only template text.
2. Prove a current independently received support email, determine monitoring owner and fallback coverage; no unsupported uptime/SLA.
3. Agree and actually demonstrate whole-tenant return and authorised deletion, including Supabase Storage, Auth and provider data/backup cases.
4. Evaluate whether Colzo's own controller processing requires the **ICO data-protection fee**, using the ICO exemption/self-assessment tool; do not assume a zero-cost exemption. This draft does not authorise a payment.
5. Obtain real operator approval and separately captured business-owner informed acceptance; do not edit, auto-agree or publish as a binding contract on an assistant's authority.

**ICO reference:** https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/contracts-and-liabilities-between-controllers-and-processors-multi/what-needs-to-be-included-in-the-contract/ and https://ico.org.uk/for-organisations/how-to-deal-with-data-protection-complaints/ . **Fee self-assessment:** https://ico.org.uk/for-organisations/data-protection-fee/
