# Colzo account journey - UI implementation batch

Scope: isolated Graphite & Volt visual refinement of the account journey.
Based on fix/colzo-composio-first-protected-writes-20261015.
Does not merge to Pilot/Production, change subscription terms, or alter any
Supabase Auth, DPA, MFA, tenant membership, signup or onboarding API semantics.

## Updated screens

- Business sign-in entry retains the native Colzo shared login and the same
  authentication controls, passkey gating and customer route.
- Business sign-up: uses the native Colzo SVG directly instead of the Business
  AI mascot asset, improved spacing, consent visibility and a clear first stage.
- Password recovery, legal and DPA gates: actual Colzo brand asset in HTML;
  legal document names and assent gates remain unchanged.
- Create business: distinct stage indicator and Graphite & Volt form.
- Seven-step business onboarding: visible step caption and progressbar with
  aria-valuenow 1-7, consistent lime progress indicators, safe action buttons.
  Existing save/resume, Back and Finish logic remains unchanged.
- Mobile: safe-area padding, readable fields, keyboard focus, reduced motion,
  viewport 375, 390, 430 and 1366 inspected for horizontal overflow.

## Acceptance evidence

Static tests: node --test tests/colzo-account-journey-ui.test.mjs
Browser smoke, with Playwright and local Chromium installed:
node scripts/colzo-account-journey-browser.cjs
It serves the real index.html and CSS locally, blocks off-site requests,
and drives sign-in/sign-up navigation, the business creation screen,
the wizard progress display and its Back action. A pre-existing jsDelivr
request is explicitly blocked by the test.

Not yet verified: live signup/email, existing owner MFA, authenticated
database writes, real customer paths, assistive technologies, or pixel
parity of all accepted Stitch references. Twelve flagged reference screens
remain unapproved; this batch does not silently approve or implement them.

## Follow-up: recovery, legal gates and mandatory MFA review

- Password recovery now has an explicit **Request a new reset link** action
  when a reset is expired or needs replacing. An existing Supabase recovery
  session must sign out successfully first; otherwise the current recovery
  screen remains visible and an error is shown. After success, the temporary
  password fields are cleared and the normal existing reset-request flow is
  presented. This does not bypass Supabase token validation or AAL2.
- Legal acceptance and DPA screens keep their existing real document URLs,
  consent checkboxes and server-enforced requirements. The new Graphite &
  Volt styling improves link cards, checkboxes, safe areas and keyboard
  focus without rewriting legal agreements.
- New offline browser QA checks reset-request/back navigation, simulated
  logout success/failure, legal/DPA page visibility and links, and mobile
  overflow for widths 375, 390, 430 and 1366. Existing isolated mandatory
  MFA browser suite also remains a release gate.
- No live authenticator credentials, email, database mutations or customer
  records are used in these tests.
