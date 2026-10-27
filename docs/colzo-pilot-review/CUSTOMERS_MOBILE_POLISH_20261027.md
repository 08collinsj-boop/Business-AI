# Customers mobile polish — 27 October 2026

The user confirmed that the deployed demonstration looks okay in physical iPhone Safari, while requesting visual improvements to the Customers screen. Record this as user-reported Safari acceptance of the existing deployment, not an independently observed device test.

## Scope

A Customers-only stylesheet and its final stylesheet link. The toolbar stays in normal flow to avoid covering the page heading during scroll. Search uses one transparent input background. Saved and enquiry contacts use separate compact row groups, with long names wrapping and visible keyboard focus. Enquiry contacts retain the existing explanation that they are not saved customer profiles. Bottom content clearance includes the device safe area.

No JavaScript, data, authentication, tenant, provider, billing or deployment configuration changes. All add, search and detail event contracts remain as implemented.

## Validation

- Existing React directory/controller suites: 24 passed.
- Full verify results are recorded in the release report after completion.
- Live rendering of this new stylesheet and physical Safari recheck remain pending deployment.

The currently protected Preview remains at 28530d043a0e387eadd86505770fd3958cb535ff. This change is prepared for review in PR #65; it is not automatically deployed. No Production release or merge is authorized.
