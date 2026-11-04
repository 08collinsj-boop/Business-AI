# Colzo G5/G7 legal, support & data-exit sign-off evidence — 2 November 2026

**Status: REVIEWED / PARTIALLY EVIDENCED / NOT FORMALLY SIGNED / NOT AUTHORISED FOR REAL CUSTOMER DATA.**
Owner request: complete the remaining legal, support and data-exit checks without a browser, independently where safe. This file reports executed non-destructive evidence. It is **not** an operator signature, legal advice, a participant's DPA acceptance, a tested full-business export/deletion, or activation permission. Production, billing, project permissions, paid providers, user grants, real customer records and Preview deployment remain untouched.

## 1. Legal: document and identity review

- Inspected actual existing source `legal/terms.html` v1.2, `legal/privacy.html` v1.1, `legal/dpa.html` v1.1, `legal/acceptable-use.html` v1.1, `legal/storage.html` v1.1 and `legal/subprocessors.html` v1.3, plus `lib/legal.js`.
- DPA v1.1 sets out subject matter, processing duration, purposes, controller/processor roles, data subject categories, documented instructions, confidentiality, security, sub-processors, international transfers, rights assistance, incident notification, controller-choice return/deletion, and audit rights. **Source has core clauses but is not independent certification or proof of operational performance.**
- Confirmed historical **29 October protected Preview /api/legal-public acceptance** in `PREVIEW_LEGAL_REDEPLOY_ACCEPTANCE_20261029.md`: identity_configured=true, trading name Colzo, sole-trader operator, existing seven branch-only encrypted legal fields, public address shown only under retained consent, legal pages rendered after dynamic identity loading. Do **not** publicly paste address, telephone or private identity details from environment.
- Legal source contains *initial static* `invitation-only` and `identity not configured` fallback wording. Prior browser test verified dynamic replacement for that older approved Preview; a **new candidate Preview must be checked again**. Before public self-service, invitation-only/approval language must be revised and reversioned as applicable; do not silently reuse acceptance of older versions.
- Verified applicable UK ICO guidance: processor/controller contracts require Article 28 subject/duration/purpose/cases and return or delete at controller's choice, subject to lawful retention; an organisation must have data-protection complaint route and acknowledge complaints within 30 days, with investigation/outcome without undue delay. Sources: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/contracts-and-liabilities-between-controllers-and-processors-multi/what-needs-to-be-included-in-the-contract/ and https://ico.org.uk/for-organisations/how-to-deal-with-data-protection-complaints/what-do-we-do-when-we-receive-a-complaint/
- User terms/AUP/privacy acceptances do **not** stand in for business-specific DPA v1.1, a newly agreed participant addendum, an explicit prerelease recovery-risk acknowledgment or authorisation of a specific business. Do not precheck or auto-accept these.
- Pilot limits are 336 elapsed hours free, no card, no automatic paid conversion, manual Marketing drafts (not AI generation/social autopublishing), no phone AI; real customer information requires reviewed risk/legal/exit gates. "No long-term paid commitment" is truthful; "no contract" would conflict with the intended participation terms.

**Legal sign-off:** documentary review COMPLETE; accountable operator final sign-off **OUTSTANDING**; participating business accepted DPA/addendum/risk disclosure **NONE**; not a legal GO.

## 2. Support: executed route check

- Existing published support route in draft: `support@getbusiness-ai.com`.
- Earlier **7 October** Business AI support forwarding test was located in the connected inbox, along with other inbound mail addressed to this alias. Historical receipt does not establish November 2026 delivery.
- On **2 November 2026**, a **non-sensitive** test was sent from the connected Gmail account to the existing published alias with subject `Colzo pilot support route test — 2 November 2026`. Gmail returned a sent message; subsequent subject search showed **SENT only** and not a separate INBOX arrival. Same-account deduplication/forwarding may affect this observation. **Do not represent the destination mailbox as externally deliverable or actively monitored based on this alone.** No customer info or credentials were sent and no third-party business was contacted.
- Use the existing address for support only after independent external-origin delivery is observed and someone accepts responsibility for monitoring. Verify published telephone independently, appoint a backup contact privately, and establish who will respond when the operator is unavailable. No 24/7 availability or guaranteed response time can currently be promised.
- Minimal operational triage: severity `incident/privacy` (immediate containment and operator escalation), `access/data-return` (identity and authority verification), `ordinary issue` (reply through support route). Keep a private ticket ledger of arrival, business scope, category, owner, next action, and closure without copying raw customer data into GitHub.
- Processor personal-data breach: notify relevant tenant controller without undue delay. As controller for its own data, assess ICO notifiability and the statutory 72-hour clock where applicable. Do not wait for a fixed support SLA. Data-protection complaints have a separate 30-day **acknowledgment** requirement; rights requests normally have one-month response rules subject to applicable exceptions.

**Support sign-off:** send attempt COMPLETE; independent current receipt **NOT CONFIRMED**; monitored mailbox, backup/escalation and live telephone verification **OUTSTANDING**. Not operationally signed.

## 3. Data exit: exact live read-only metadata and fictional fixture inventory

Read-only Development SQL used project `Business-AI-Dev` `mvwseobgkexzpmmkgcxe`; **no data was changed, deleted, copied out or sent to a recipient**. Existing fictional workspace identified by the exact non-personal name `QA Example Garden B — TEST ONLY` and verified to exist exactly once, with no source business ID in this document.

- PostgreSQL catalog: **47 public base tables with `business_id`** and RLS enabled. A read-only `COUNT(*) WHERE business_id=(SELECT id FROM businesses WHERE name=QA...)` query checked all 47, with no row-content retrieval.
- **9 tables nonempty** for the fictional QA business: `business_audit_events` 16; `business_configurations` 1; `business_data_lifecycle_policies` 1; `business_memberships` 1; `business_public_routes` 1; `business_referral_profiles` 1; `business_settings` 1; `colzo_clients` 1; `colzo_pilot_access` 1. The other 38 had zero rows for that exact fictional business at inspection time. These are counts only; **not proof of full export**.
- Shared-member account check for the QA business returned **0** cross-business memberships. This specific QA fact does **not** allow a general delete-`auth.users` rule: user identities may be shared, and Auth, sessions, factor records and legal acceptances need an independent preservation/removal decision.
- `storage.objects` had **12 objects overall**. QA object-name checks for `<qa-business-uuid>/...` and nested `.../<qa-business-uuid>/...` returned **0**. This **does not rule out** files referenced by database path columns or stored with another key convention. No Storage bytes, object paths or private metadata were exported.
- Relevant legal/operator exit scope includes owner account and workspace, customers, enquiries/leads, lead history, bookings, actions, projects, quotes, knowledge metadata **and source file bytes**, legal acceptance, audit records, marketing drafts and applicable provider references; charge/referral/security audit and billing may require lawful exceptions. `storage.objects` and Auth are not scoped by `business_id`; follow explicit references and shared-identity handling.
- Existing 29 Oct `QA_CUSTOMER_EXPORT_REHEARSAL_20261029.md` proves one fictional customer CSV/JSON serialization/readback; not 47-table scoped manifest+contents, not whole-tenant return, not deletion. The 365-/730-day settings are **review periods**, not a deletion engine.
- Existing `lib/data-subjects-handler.js` deliberately refuses scoped-pilot DELETE to prevent non-atomic partial erasure; do **not** remove this safeguard to claim deletion is implemented. A safe, independently reviewed transactional, tenant-bound data deletion process and Storage/Auth/provider lifecycle still need a synthetic isolated rehearsal and separately authorised action. Do not run DELETE against shared Development or Production.

**Proposed safe handover plan, requiring tests and operator acceptance**:
1. Authenticate requesting business owner with an approved independent contact channel; record the owner's choice to return or delete and verify their authority. Retain a minimal private, timestamped request record.
2. Build a fully tenant-scoped export manifest covering all 47 business-linked table categories, linked files in Supabase Storage (where relevant), and documented exceptions; validate IDs/relationships against the target business, field sensitivity, counts, files and checksums. Separate Colzo controller records from data processed for the business.
3. Generate JSON/CSV with spreadsheet formula-injection protection plus an attachment bundle, using a protected channel and an independently verified recipient. Prove fictional round-trip completeness, denied foreign-tenant access and omission of secrets before delivering real data.
4. Subject to controller's instruction and legally necessary preservation, rehearse **atomic** DB deletion with dependent records, verify post-deletion counts and foreign-tenant preservation, safely delete authorised file bytes and deal separately with Auth/memberships, downstream processors, provider backups and retention cycles. Preserve an audit/hold exception record. No personal data should remain accessible outside the allowed exceptions.
5. Obtain an operationally **demonstrated** return window and deletion/backup lifecycle before putting any dates into participant terms. Do not promise automatic deletion on the 14-day pilot's expiry. Proposed 14-day return-request / 30-day primary deletion targets in the previous packet remain **non-binding ideas**, not current guarantees.

**Data-exit sign-off:** exact table scope and fictional non-destructive counts COMPLETE; full-tenant export/delivery **NOT DEMONSTRATED**; isolated end-to-end erasure **NOT DEMONSTRATED**; Storage/backup/Auth full lifecycle **NOT DEMONSTRATED**; operator return/deletion policy and deadlines **NOT ACCEPTED**. Not a data-exit GO.

## 4. Signature/GO boundaries and accountable decisions

To avoid false legal assent, no software agent can sign as the legal operator, bind a real participant to the DPA, invent monitored support availability or guarantee untested erasure. This review was conducted without those signatures.

| Requirement | Evidence | Current decision |
| --- | --- | --- |
| Existing Colzo operator identity shown on older approved Preview | 29 Oct independent runtime readback | Previously verified; recheck on exact release |
| Terms/Privacy/AUP/DPA/Storage/sub-processors | Source/versions inspected | Content reviewed; update public-self-service wording, final operator approval needed |
| Support route | 2 Nov harmless test sent; only SENT observed | Delivery/monitoring/escalation not signed |
| Complaint/rights/breach handling | Written internal procedure, ICO checks | Owner acceptance and working monitor needed |
| Data return | 47-table inventory and 1-customer fictional serialization | Whole-tenant return blocked pending rehearsal |
| Erasure | Deliberate scoped DELETE refusal | Safe deletion/export/backup exceptions not implemented |
| Recovery disclosure | Proposed addendum explains unverified complete source/Auth/Storage restoration | Participant must individually acknowledge; not equivalent to safe recovery |
| DPA and participant addendum | Draft v1.1 DPA and unaccepted addendum | Specific authorised business acceptance needed |
| Pilot activation | Requires security G1–G4, G6 and release approval | **NO-GO for real customer data; fictional demo only** |

**Final decisions only an accountable person can make:** approve accurate operator/legal and processor list; confirm who monitors published support and the incident backup; accept a workable written data-return/deletion policy **after** tested capability, review recovery limitation and approve a particular business's informed participation. No payment resources or deployment is authorised by this review.

**Source evidence:** `PILOT_LEGAL_SUPPORT_DATA_LIFECYCLE_PACKET_20261102.md`, `PREVIEW_LEGAL_REDEPLOY_ACCEPTANCE_20261029.md`, `ORIGINAL_LEGAL_IDENTITY_REUSE_20261029.md`, `QA_CUSTOMER_EXPORT_REHEARSAL_20261029.md`, `DATA_SUBJECT_SAFETY_FIX_20261029.md`, current schema inventory and non-destructive counts. This is a technical/operational review, not a solicitor's certification.
