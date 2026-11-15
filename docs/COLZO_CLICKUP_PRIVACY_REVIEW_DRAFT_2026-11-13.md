# Colzo — ClickUp privacy and processor-disclosure review DRAFT
**Prepared:** 13 November 2026. **Status:** INTERNAL REVIEW ONLY — NOT PUBLISHED, ACCEPTED OR LEGAL SIGN-OFF.
**Scope:** draft PR #77, Development only. This file does not change public legal notices, DPA versions, provider credentials or the integration flag.

## Verified current source and reason for this draft

- `legal/privacy.html` is version 1.1 (27 September 2026), `legal/dpa.html` is version 1.1 (27 September 2026), and `legal/subprocessors.html` is version 1.3 (1 October 2026). The latter lists Supabase, Resend, Vercel, OpenAI, OpenRouter, Cloudflare, Stripe and Meta; **ClickUp is not explicitly named**.
- PR #77's ClickUp connector remains disabled and unconnected in hosted Development: `colzo_clickup_connections` and `colzo_clickup_oauth_states` have not been installed. No live provider processing is asserted.
- The implementation is **not** generic multi-app AI access: only the OAuth-authorising Colzo owner/admin can access that person's ClickUp tasks/lists and approve task creation or updates. Other admins and ordinary staff cannot inherit this token. This does not constitute continuous bidirectional synchronisation.
- A `connected_by` Colzo identity, business-scoped encrypted access credential, selected provider workspace/task/list metadata, limited fetched task names/statuses/priority/dates, and explicit user-approved task changes are the proposed processing flows; task text could contain personal data if a business enters it in ClickUp. The precise provider response/data fields, audit retention and transferred locations must be confirmed in live integration testing.
- `Disconnect` removes the Colzo-side connection, **not necessarily** the provider-side OAuth grant. A separate ClickUp-side revocation validation is required. No customer-data deletion or retention guarantee is made here.

## Draft privacy-notice addition — for legal/operator review, not for automatic publication

> **Optional connected work applications.** Where your business chooses to connect ClickUp, Colzo may retrieve the authorised workspace, list and task details needed to display tasks inside your Colzo workspace and perform changes that an authorised business user explicitly approves. This information may include task titles, descriptions, statuses, dates and associated business-user identifiers, including personal data if included in the connected workspace. Colzo stores an encrypted connection credential server-side and records relevant connection and action events for security and accountability. Access is restricted to the relevant signed-in authorised user and business. ClickUp remains an external system of record. Disconnecting from Colzo does not necessarily revoke access at ClickUp, where the business may also need to manage connected applications. Colzo does not currently promise automatic or background task synchronisation or independent multi-app AI execution.

Review exact fields, purposes, lawful roles, notices presented to end users, retention schedule, technical security and any transfer information before adopting this wording.

## Draft DPA processing-schedule addition — for legal/operator review

> **Optional connected task-management work.** Upon the Controller's deliberate activation and authorised user instructions, Colzo may access, organise, display and send limited work-management data between Colzo and the connected ClickUp account, including task and list content, status and permitted actions. The Controller is responsible for selecting an appropriate connected workspace and ensuring the sharing instructions and personal data entered there are lawful and necessary. Colzo will enforce per-business identity and action-approval checks and will not represent the connection as autonomous or equivalent to general cross-app permission.

Assess whether this requires a new formal DPA version/addendum and additional specific instructions. The existing DPA's return/deletion commitments require an *operationally demonstrated* tenant-wide data exit and must not be strengthened by untested promises.

## Conditional provider-notice entry — proposal, not a classification decision

| Question | Required decision before enabling |
| --- | --- |
| Name | ClickUp, conditional on user-initiated integration |
| Purpose | Authorised work-management OAuth, permitted task/list retrieval and confirmed task changes |
| Data categories | Connected user/workspace identifiers, task/list fields, permission/status metadata, business-entered text |
| Relationship | Determine formally whether ClickUp is a Colzo sub-processor for each relevant flow, a provider contracted directly by the business, or acting in another role. **Do not assume every integration is automatically a Colzo sub-processor.** |
| International processing | Assess ClickUp's current DPA, location/sub-processor list and transfer safeguards for actual data flows. Do not promise UK-only hosting. |
| Authorisation | Obtain controller authorisation/notification where required before material new processing. Ensure the business can object when the contractual general-authorisation model requires notice. |
| Exit | Test Colzo credential deletion, provider revocation and handling of data previously fetched or written. Do not claim that removing Colzo tasks deletes provider tasks. |
| Permission model | Confirm OAuth grant belongs to exact user, not business-wide inherited authority. Validate denied staff/foreign tenant access with live evidence. |

## Operator acceptance and release checklist (unexecuted)

- [ ] Review provider agreements, ClickUp DPA and current sub-processor/location information against actual integration flow.
- [ ] Decide and document data protection roles and whether an added sub-processor notification, contract or controller consent is required.
- [ ] Review and version relevant privacy notice, provider list, DPA processing schedule and pilot addendum **before publication**, including the actual integrated runtime and data categories.
- [ ] Independently exercise OAuth, credential handling, per-identity permissions, disconnect/provider revocation, retention and data-return boundaries with *fictional* Development data.
- [ ] Record explicit operator approval, business-owner acceptance of relevant current documents and any required changes, and named support/incident responsibilities.
- [ ] Keep integration disabled and real customer data excluded until both security and legal approval gates are satisfied.

## Sources for operator review (checked 13 Nov 2026)

- UK ICO guidance on sub-processor specific/general written authorisation, notification and contractual safeguards:
  https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/controllers-and-processors/controllers-and-processors/what-does-it-mean-if-you-are-a-processor/
- UK GDPR Article 28 (processor and sub-processor requirements):
  https://www.legislation.gov.uk/eur/2016/679/chapter/IV/section/1/2026-03-31
- ClickUp Data Protection Addendum:
  https://clickup.com/terms/dpa
- ClickUp's currently referenced sub-processor disclosures:
  https://clickup.com/dpa/subprocessors
- Internal implementation reference: `docs/COLZO_WORK_HUB_INTEGRATION_CONTRACT_2026-11-12.md`.

**Safety:** This is a decision draft, not legal advice or a change to published policy. No signature, provider processing, pilot invitation, Production action, paid service or data mutation results from committing this file.
