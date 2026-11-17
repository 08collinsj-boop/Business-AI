# Colzo — fictional LeadConnector → ClickUp connected-workflow demonstration

**17 November 2026 · Internal Development concept · No real customer data · No external pilot GO**

## Why this exists

Colzo's strongest customer proposition is reducing the time spent moving between existing systems, rather than replacing the systems businesses already trust. This small standalone, interactive demonstration shows **one** narrow workflow in a hypothetical service business. It is not a functioning provider connector and does not imply that LeadConnector or ClickUp authorises the integration.

The example organisation **Northfield Property Care**, person **Morgan Example**, contact address under **example.invalid**, enquiry, requested appointment and task identifiers are all invented. Do not add information about any real charity employee, service user or customer.

## 90-second demonstration

1. **LeadConnector source of truth (0:00–0:20).** Show the fictional kitchen tap enquiry and the *requested, not confirmed* appointment. Explain that the existing CRM/appointments application remains authoritative.
2. **Colzo context (0:20–0:40).** Show the suggested follow-up and the proposed recipient ClickUp task. Explain that Colzo could reduce manual handoffs after a real authorised integration is built.
3. **Human approval (0:40–1:00).** Select **Review suggested action**, inspect the dialog and choose **Simulate approval**. The page shows an illustrative local result, **not** a task in ClickUp.
4. **Failure and control (1:00–1:15).** Reset, choose **Mock provider unavailable**, try the handoff and demonstrate that no task appears. Reset again, review and **Decline** to show approval is not automatic.
5. **Close (1:15–1:30).** Ask the prospect which enquiry-to-task handoff costs the most time. Do not guarantee savings or promise provider functionality that has not passed independent acceptance.

## Exact implementation

- `demo/connected-workflow/index.html`: accessible, noindex static UI with an explicit fictional-data/no-provider-connection notice, strict `connect-src 'none'` Content Security Policy, modal confirmation, source labels and illustrative workflow.
- `demo/connected-workflow/style.css`: Graphite & Volt desktop-first layout, responsive to smaller screens, visible keyboard focus and reduced-motion handling.
- `demo/connected-workflow/model.js`: immutable fictional fixtures and a pure state machine. A review step and separate approval are required; rejection, repeated approval and simulated provider outage never send or persist actions.
- `demo/connected-workflow/app.js`: local DOM updates only; **no fetch, WebSocket, storage, OAuth, credentials, server requests or actual AI action**.
- `tests/colzo-fictional-connected-demo.test.mjs`: fictional boundaries, source ownership, approval ordering, idempotence, outage and reset.
- `scripts/colzo-cross-app-demo-browser.cjs`: four synthetic Chromium viewport runs, no external/writing requests, click-through approval/rejection/outage and screenshots.
- `scripts/build-colzo-react.mjs`: copies the demonstration route into the app bundle **only** for `VERCEL_ENV=preview` with `VERCEL_GIT_COMMIT_REF=feature/colzo-fictional-cross-app-demo-20261117`. Not copied into Production, other Preview branches or the standalone public-site build.
- `.github/workflows/pilot-verify.yml`: seventh isolated synthetic browser suite. This is Chromium emulation, **not** evidence of genuine iPhone Safari or authorised production provider acceptance.

### Local / verified Preview route

Under local static serving from the repository root: `/demo/connected-workflow/index.html`. Under a correctly built and *protected* exact feature Preview: `/demo/connected-workflow/`. **Do not advertise an unverified deployment URL**. This route is separate from the logged-in Work Hub, because the Work Hub must not show a fake ClickUp connection or pretend LeadConnector is a supported provider.

## What the demo does and does not do

| Property | Demonstrated | Not demonstrated |
| --- | --- | --- |
| Fictional enquiry / appointment context | Static invented LeadConnector-labelled examples | Live LeadConnector API, account permissions or calendar sync |
| Proposed follow-up | A task proposal based on the example | Live AI planning or an authorised provider task |
| Approval gate | Click-to-review, separate simulated approval, decline and reset | Backend audited, role-scoped provider writes |
| Failure handling | A mock unavailable scenario blocks local task creation | Genuine provider 401/403/429/timeout and retry contract |
| Visual layout | Synthetic desktop/mobile Chromium tests | Protected real-user Preview and iPhone Safari acceptance |

## Acceptance and commercial boundaries

This is an **illustrative sales/discovery tool**, not a pilot deliverable, a provider connector or evidence of live data isolation. Do not present its simulated action as real or say Colzo is already synchronising the two services. The first real integration pilot still requires source-of-truth and data mapping approvals, customer/controller and provider permissions, independent Development restoration, W1/W2/W3 live acceptance, retention/data-exit readiness, support owner and explicit GO. Keep draft PRs unmerged, no Production, billing, marketing publishing, unsolicited customer messages or pilot activation.

**External customer pilot remains NO-GO.**
