# Customer Stitch implementation — first batch

The customer-facing section now uses the Graphite & Volt layouts reviewed on 20 October. This is a development implementation, not a production release or proof that every customer journey is complete.

## Scope and reference mapping

| Existing surface | Implementation |
| --- | --- |
| Customer sign-in and create-account forms | Compact typography, labelled controls, password guidance, separate privacy link, valid-input submit states and accessible action sizes. Existing shared identity and provider handlers retained. |
| Recovery request and confirmation pending | Existing inline outcomes and resend/reset handlers retained and styled. The standalone Stitch compositions are not new routes in this batch. |
| Portal overview, Find businesses, My enquiries and Account | Consistent cards, fields, four-item bottom navigation, real safe-area spacing and responsive content width. Empty and populated views retain actual server data. |
| Customer search unavailable | Explicit retryable error, retained query and latest-response protection; failures no longer appear as an empty match list. |
| Public directory start, results and empty state | Shared search controls, simpler hierarchy, real results and responsive result cards. |
| Public business profile | Refined identity, actions and content; configured contacts and media retained. |
| Public assistant conversation, quick actions and unavailable state | Refined bubbles, composer and actions; existing availability and submission rules retained. No AI request is made by this implementation work. |
| Legal centre, DPA, device storage, service providers and data deletion | Opt-in reading layout. Existing legal text, versions, links and operator configuration unchanged. |

The proposed individual customer enquiry-tracking detail design has no corresponding functional route in the current application. This batch does not invent that route or claim it works.

## Preserved and deferred

- Established owner references and three previously approved customer-management screens are not regenerated or replaced.
- The seven flagged Stitch candidates are not copied: Session expired, Find empty, Account save error, Business unavailable, Terms, Privacy and Acceptable Use. Existing functional states remain; shared customer components may affect their appearance, without accepting their rejected compositions.
- Terms, Privacy and Acceptable Use HTML and legal content are unchanged. No placeholder legal text is imported.
- No backend, tenant, billing, provider configuration, database, credentials or production settings are changed.
- No hard-coded sample records, operating-system status bars or fixed iPhone canvas are shipped.

## Verification

Four new runtime regression tests were demonstrated failing before the fixes and passing afterwards: HTTP search failures, out-of-order responses, clearing an outstanding search, and customer form validity. The stylesheet-order regression now checks the exact customer layer after the shared brand layer on the six opted-in entry points, retaining the original requirement elsewhere.

`npm run verify` passed: 1,085 tests, build and local syntax/secret/temporary-marker checks. `git diff --check` passed. Rendered preview checks and any limitations are recorded in the implementation handover; automated tests alone do not certify responsive appearance or authenticated acceptance.

## Remaining acceptance

Review the generated development preview at the exact implementation commit. Verify narrow iPhone widths, keyboard/safe-area behaviour and real-device accessibility. Authenticated portal, account-save, confirmation delivery and recovery journeys need controlled acceptance without using real customer records. Correct and resubmit the seven flagged design candidates separately. Visual reference acceptance does not prove feature, security or content correctness.
