# Business AI data-subject-rights runbook

Last reviewed: 5 October 2026. Operational guidance only; not independent legal advice.

## Intake route

Use the public legal/privacy contact route configured through `LEGAL_CONTACT_EMAIL` for Business AI's own controller requests. For customer-enquiry data, the subscribing business is normally the controller and the request should normally be directed to that business first; Business AI provides processor assistance and tenant-scoped technical tools.

A request does not need special wording or a particular form to count. Record the date received, requester/contact route, affected business/tenant if known, requested right, owner of the response and the response deadline.

## Timing

For UK GDPR subject-access requests, respond without undue delay and normally within one month of receipt (or receipt of information reasonably requested to confirm identity). Where the request is complex or the person has made a number of requests, the response period may be extended by up to a further two months where permitted, but the person must be told within the initial month and given the reason.

Use the same one-month operational target for other applicable data-rights requests unless current law/guidance requires a different period. Escalate uncertainty rather than silently missing the deadline.

## Identity and scoping

- Request only proportionate identity information needed to avoid disclosing data to the wrong person.
- Determine whether Business AI is controller or processor for the relevant data.
- Identify the correct tenant before using any owner data-control endpoint.
- Never accept a browser-supplied business ID as authority.
- Never disclose another tenant's data to help 'prove' a negative result.

## Access/export

The protected `/api/data-subjects` GET path is owner-only and resolves tenant authority through the authenticated membership. For a selected tenant-scoped lead it exports the lead plus linked lead history, bookings and actions, and records a `data_subject.exported` audit event.

Before release to a requester:
- review the export for third-party personal information or information that should not be disclosed;
- provide the required supplementary privacy information where applicable;
- use a secure delivery method;
- record completion and date.

## Rectification

Where information is inaccurate, use the normal authenticated owner controls to correct the relevant tenant record. If data has been sent to another provider and correction there is required, record the follow-up rather than assuming the local edit propagated everywhere.

## Erasure/anonymisation

The protected `/api/data-subjects` DELETE path is owner-only and tenant-scoped. For the selected lead it anonymises direct identifiers/customer text in the lead and linked bookings/actions/history and records a `data_subject.erased` audit event.

Erasure is not absolute. Before acting, check whether data must be retained for an applicable legal obligation, dispute, security investigation, fraud prevention or other lawful reason. Retain only what is necessary and document the reason/review date.

Do not promise that an operational delete immediately disappears from all provider backup copies. If a later restore reintroduces previously erased/anonymised data, re-apply the decision where reasonably practicable.

## Restriction, objection and portability

The current Pilot does not have a dedicated automated UI for every UK GDPR right. Receive these requests through the same monitored contact route, record them, assess the applicable right/lawful basis, and apply the necessary service/configuration/data changes manually. Where processing should be restricted, avoid further use of the affected data while retaining only what is permitted.

Direct-marketing objections must be respected where applicable. Business AI customer-enquiry processing is not intended to make solely automated decisions with legal or similarly significant effects.

## Processor assistance

When a subscribing business asks Business AI to help fulfil a customer request:
- confirm the requesting business is authorised for the tenant;
- act only on that controller's documented instruction;
- use the tenant-scoped export/anonymisation tools where appropriate;
- do not contact the controller's customer independently unless authorised/required;
- record the assistance in the operating record.

## Browser acceptance

The final live fake-data exercise is grouped into `PUBLIC_LAUNCH_BROWSER_CERTIFICATION.md`. Use only clearly labelled QA data and never test erasure on a real customer record.
