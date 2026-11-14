# COLZO — first-pilot operator sign-off, support, incident and data-exit pack
**Prepared:** 14 November 2026 (UK) | **State:** INTERNAL DRAFT — NOT APPROVED, NOT CUSTOMER-FACING | **External pilot decision:** NO-GO

**Target:** Draft PR #77 `feature/colzo-connected-workspace-20261112`, Development Supabase `mvwseobgkexzpmmkgcxe`. Do not amend Production, paid services, Stripe/billing, user grants, Preview secrets, published legal policies, pilot invitation/activation, or merge PR #76/#77 merely because this pack exists.

This is a **working operator pack**, not a completed sign-off, a legal opinion, a commitment to an SLA, or evidence of customer-data deletion. Fill the decision and receipt fields with real accountable approvals before the first external real-data pilot. No named operator, corporate identity, contact address, legal version, SLA, subprocessors determination or customer consent is invented below.

## A. Exact current-product facts (verified source and independent Work report)

| Current source / evidence | Verified current behaviour | Launch consequence |
|---|---|---|
| `legal/privacy.html` v1.1 (27 Sep 2026), `legal/dpa.html` v1.1 (27 Sep), `legal/subprocessors.html` v1.3 (1 Oct), `legal/operator.js` | Public identity/contact display depends on `/api/legal-public` returning `identity_configured`. Independently rendered protected Preview legal pages still show an **operator identity/contact-not-configured** notice | Provide verified legal/trading name, business structure, establishment/contact address, support/privacy email and any applicable registered details. Review/version/publish the approved documents, not this draft |
| `docs/COLZO_CLICKUP_PRIVACY_REVIEW_DRAFT_2026-11-13.md` | Proposed ClickUp data-flow and provider-role wording is review-only; ClickUp integration not active | Establish provider/controller roles, contracts, transfers, retention, OAuth authorisation, revocation and notices **before** enabling ClickUp or using real provider information |
| `lib/data-subjects-handler.js` | Owner-only `GET` returns **one selected lead** and verified same-business `lead_history`, `bookings` and `actions`; audit event is recorded. Scoped-pilot `DELETE` returns HTTP **503** (automated erasure unavailable) | **Do not represent as complete business export or self-service erasure**. A broader, safe and tested data-exit process is required |
| `lib/data-subjects-handler.js`, legacy non-scoped branch | Older anonymisation uses four non-transactional table PATCH requests | Do **not** use as a tenant-wide safe deletion guarantee; no all-or-nothing evidence |
| `lib/data-lifecycle-handler.js`, Privacy v1.1 | Only GET/PATCH business review values; lead review default 365 days and audit review 730 days, neither an automatic deletion schedule | Define actual lifecycle owner, records, review frequency, exceptions and deletion mechanism separately |
| PR #77 independent Work report, 14 Nov | A different-sender message reached the support inbox on 6 Nov (narrow inbound-delivery evidence only) | Real monitoring, response, incident routing and backup person are **not** demonstrated |
| Operator's verified Chromebook/USB archives | DB and Storage encrypted backup integrity and USB copyback passed; independent compatible restore with Auth/MFA, Vault and actual Storage bytes still unproven | Disaster-recovery acceptance remains **PARTIAL/BLOCKED**. Do not change this gate to PASS |

Detailed engineering/evidence reference: `docs/COLZO_PILOT_ACCEPTANCE_EVIDENCE_LEDGER_2026-11-14.md` and the latest PR #77 independent Work acceptance report.

## B. Operator and communications decision register — all OPEN until witnessed

Complete privately in an authorised record, not by putting personal phone numbers, passwords or private residential addresses into GitHub.

| Required appointment/decision | Named role / private verified record reference | Evidence/approval | Status |
|---|---|---|---|
| Sole trader / legal service-provider identity and trading name | **Operator to supply** | Cross-checked with actual legal/public identity | OPEN |
| Geographic correspondence/contact address | **Operator to supply** | Reviewed for publication/privacy and legal requirements | OPEN |
| Monitored public support email and fallback | **Operator to supply** | Independent inbound, independent reply, monitoring schedule | OPEN |
| Day-to-day support owner and backup/holiday cover | **Operator to supply** | Written role acceptance, monitored route | OPEN |
| Incident commander and substitute | **Operator to supply** | Written incident/escalation ownership | OPEN |
| Personal-data breach assessment owner | **Operator to supply** | Legal/controller/processor notification decision maker | OPEN |
| Database/Storage recovery operator and rollback authoriser | **Operator to supply** | Independent restore receipt and credentials kept off repo | OPEN |
| Tenant data export, retention/hold and deletion authoriser | **Operator to supply** | Verified access, controller instruction and dual-check process | OPEN |
| Privacy/DPA/subprocessor document approver | **Operator / adviser to supply** | Source version, effective date and acceptance mechanism | OPEN |
| Pilot scope, access duration, participants, risk and final GO approver | **Operator to supply** | Signed dated release decision and customer consent | OPEN |

No one should infer 24/7 service, a fixed response SLA or a staffed incident team from a functioning email alias. Public response targets must be set to actual capacity.

## C. Support operation — private execution procedure for approval

**Scope until sign-off:** internal fictional-data testing only. External pilot support service must not be advertised as available until an owner and cover are verified.

1. Verify inbox delivery using an **independently sent** message and a response from the actual operator to an authorised test sender; use only subject/status/timestamp in a redacted receipt. Do not send unsolicited real-business messages.
2. Establish check frequency, hours of coverage, backup arrangement, where support requests are logged, and escalation/absence procedure. Write actual agreed times here: **[coverage not approved]**.
3. Triage each inbound request: security/privacy, access/authentication, data correctness, integration/provider, usability or other. Record case ID, date/time, workspace (redacted), severity, owner, customer action/consent and closure evidence.
4. For account recovery or data disclosure, verify the requester and role through the established authenticated route; never disclose another tenant's data or ask for passwords, MFA OTPs, service-role keys or bearer tokens over email.
5. For requests needing data export/correction/erasure or incidents, log the controller/business instruction and refer to approved workflow in Sections D/E rather than promising immediate deletion.
6. Record the first full dry-run receipt: test start/time, independently received?, reply observed?, owner?, backup cover?, incident escalation tested?, evidence reference and result. **All untested fields remain OPEN.**

## D. Incident runbook — internal draft, no automatic production authority

**Trigger examples:** cross-tenant disclosure, suspicious account access, unintended publication, token/secret exposure, production outage or failure to restore data.

1. **Recognise and log** the event promptly: immutable case ID, discovery UTC timestamp, reporter, suspected systems/tenants, initial severity, approximate data categories (redacted), and named incident decision maker. Avoid exporting secrets/customer records into tickets.
2. **Contain within authority:** restrict affected functionality or revoke access using the *approved* incident procedure, avoiding actions that irreversibly delete evidence or break customers. Isolate Development testing. Production credential rotations, sweeping revocations and restore/rollbacks require an authorised emergency operator and recorded decision.
3. **Preserve relevant evidence** securely: limited redacted logs, timeline, incident decision record, read-only provider status, affected data categories, recovery impact and secure access audit. Keep evidence access limited.
4. **Classify Colzo's role for each data set:** for a customer's records Colzo usually acts as **processor**, so notify that business/controller **without undue delay** as required; do not automatically assume Colzo has sole regulatory reporting responsibility. For Colzo-controlled account/admin data, the operator may be the **controller**. Assess duties separately.
5. **Risk and reporting:** document likely risk to individuals, affected records and mitigation. For a controller-reportable UK GDPR personal-data breach, the ICO generally must be informed without undue delay and, where feasible, within **72 hours of becoming aware**; high risk to individuals may require direct notice without undue delay. Not all security incidents are reportable, but keep records of all personal-data breaches. Use qualified advice for ambiguous cases; don't turn 72 hours into a delayed internal escalation target.
6. **Recovery:** inspect backup/restore status and named recovery owner. Never restore an unverified archive into Production or existing Development without explicit change review. Verify affected Auth, RLS, Storage bytes and linked provider credentials, then observe service and prevent recurrence.
7. **Close only after** authorised stakeholder/controller notifications, regulator decision record, restoration verification, root-cause analysis, remediation owner and a recorded sign-off. Conduct fictional/tabletop exercise before first pilot.

**Exercise record to fill:** scenario ___ / date ___ / first detection ___ / decision owner ___ / controller informed? ___ / risk documented? ___ / containment authorised? ___ / recovery path tested? ___ / result **UNTESTED**.

Sources for operator/legal review:
- ICO personal data breaches: https://ico.org.uk/for-organisations/report-a-breach/personal-data-breach/personal-data-breaches-a-guide/
- ICO processor contracts: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/guide-to-accountability-and-governance/contracts/

## E. Data request, full tenant exit and deletion acceptance — not yet executable

**Important implementation limit:** existing lead GET is NOT a workspace export; scoped-pilot DELETE intentionally fails closed with HTTP 503. Do not claim `retention_days` is an automatic erasure job. Do not erase any actual Development fixture, shared Auth identity or Storage object simply to fill the receipt.

**Preflight on a separately authorised disposable fictional tenant AFTER sufficient recovery/rollback evidence:**
1. Capture the exact tenant ID internally, scope, controller instruction, data-subject/request type, requester's authority, legal hold and retention exceptions, approved execution author and independent witness. No passwords/tokens in evidence.
2. Create an **inventory of all data classes**, not just a lead: memberships/invitations, business and settings, customers/leads, lead history, bookings, Actions, projects/quotes, Knowledge and approvals, marketing drafts/library/schedules, media/Storage file **bytes** and object keys, audit/security events, support and billing/entitlement metadata, integrations and encrypted credentials, Auth accounts/MFA/sessions, provider-side records and shared user identities. Mark anything unavailable explicitly.
3. Prove an authorised **full-tenant export** with counts and per-class coverage, tenant-scoped ownership, source snapshot/time, filenames/hashes/format, secure delivery to verified controller, role-denied foreign tenant attempts and return receipt. The current selected-lead endpoint alone does not meet this.
4. Obtain separate documented authority for irreversible deletion. Establish an atomic/recoverable procedure or safe sequence with failure/retry behaviour and referential/trigger handling; isolate the test tenant. Define treatment of shared Auth users, audit/legal records, backups, external providers and Storage bytes. Do not delete shared users or neighbouring tenant records.
5. Independently verify all relevant active records and Storage bytes are absent (or legally retained under documented exception), and unrelated tenant/shared-identity data remain unaffected. Document how immutable backups expire or are handled according to approved schedule.
6. Verify no remaining API/hidden DOM access for removed tenant; check signed-out/stale JWT denial and provider token revocation where applicable.
7. Capture a **redacted receipt** with scope, executor, independent reviewer, query/count evidence, Storage actual-byte checks, exception/hold register, rollback owner and outcome. All unsupported steps stay BLOCKED.

**Rights-request triage:** normally route customer-enquiry individuals to their business controller. For Colzo as controller, verify identity and record receipt/response timeline. UK ICO guidance says access and erasure requests generally require response within one month, subject to applicable circumstances and extensions; do not promise automatic immediate erasure. References:
- https://ico.org.uk/for-the-public/getting-copies-of-your-information-subject-access-request/what-to-expect-after-making-a-subject-access-request/
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-erasure/

## F. First participant information & consent — UNSENT REVIEW DRAFT

**Proposed participant text (requires approved pilot offer, signed controller/DPA terms and privacy review):**

> Colzo is inviting a small number of businesses to an evaluation pilot of its desktop-first business workspace. The proposed pilot lasts 14 days, with the agreed features and access dates confirmed before activation. The platform is in testing and is not yet approved for business-critical operations. Your organisation remains responsible for deciding what information to enter and for verifying the accuracy of any generated or connected-app output. We will confirm the supported features, known exclusions, support contact and operating hours, privacy notice, Data Processing Agreement, applicable providers, retention/data-exit process and how to report an issue before you use real customer information.
>
> ClickUp connectivity and individual staff assignment are not currently active; we will not represent them as included until separately tested and approved. Participating does not authorise us to connect to your other software, retrieve external records, create staff accounts or send messages on your behalf without appropriate permissions and a verified integration.

**Required participant record, not yet obtained:** business legal name ___ / business controller representative ___ / exact feature scope (core-only or ClickUp-capable) ___ / pilot start and expiry ___ / data types permitted ___ / privacy/DPA and provider notice versions actually shown ___ / signed contract/acceptance reference ___ / support contact and cover explained ___ / export/deletion arrangements disclosed ___ / external access consent recorded ___ / incident route explained ___ / GO approver and date ___.

Avoid unconditional “no contract” claims when a DPA, privacy acceptance or pilot terms are necessary; verify any no-card, free-period or no-charge offer before external publication. Do not use real customer data until genuine GO.

## G. Gate decisions and remaining blockers

| Gate | Documentation prepared here | What still prevents PASS |
|---|---|---|
| Support and incident operation | Support workflow, triage and incident/tabletop procedure | Identified operator/backup, monitored replies, coverage, real tabletop exercise |
| Legal/operator identity | Exact missing identity/contact fields and current version references | Verified identity/address/email, lawful processor roles, approved publication + versions |
| Data rights and tenant exit | Precise code limitation and broad exit verification/receipt | Safe full tenant export and deletion implementation, authorised isolated live exercise and independently checked Storage/Auth/shared-users |
| Customer invitation and consent | Unsent, qualified pilot participant information and consent fields | Exact pilot scope, controller signed agreements, accepted version receipts, actual GO |
| Backup/rollback | Recorded real encrypted archive verification boundary | Independent full Development restore, Auth/MFA/Vault/Storage byte recovery and named decision owner |
| ClickUp | Review-only privacy and connection scope | Recovery gate, exact separate SQL/config approvals, fictional provider and positive/negative live tests |

**Final decision: EXTERNAL PILOT NO-GO.** Do not check off owner, backup, exercise, privacy publication, support monitoring, participant consent, data deletion, or independent recovery until evidence exists. No real customer outreach or activation is authorised by this document.

## H. Final sign-off form — intentionally unfilled

- Selected pilot scope: **NOT APPROVED**
- Operator legal identity and public contact details: **NOT CONFIGURED/NOT VERIFIED**
- Support primary/cover: **NOT VERIFIED**
- Security, mobile and UI acceptance receipt(s): **OPEN**
- Real Development full restore receipt and rollback owner: **BLOCKED**
- Customer data exit/deletion receipt: **BLOCKED**
- Privacy/DPA/provider legal approval and accepted versions: **OPEN**
- Participant opt-in + scope/term consent: **NOT OBTAINED**
- Release decision maker: **NOT ASSIGNED**
- Actual approval date, decision and evidence reference: **NONE**
- **CURRENT VERDICT: NO-GO**
