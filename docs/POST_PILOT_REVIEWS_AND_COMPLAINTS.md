# Post-Pilot customer experience: reviews and complaints

**Status:** Trustpilot link support is a source change only. It is not deployed. Automatic customer messaging and the dedicated complaints workflow are not implemented.

## Review requests (implemented)

- Owners may choose Google, Facebook or Trustpilot and save a validated HTTPS review link.
- The first time a booking is completed, the existing flow prepares one tenant-scoped **request_review** action.
- Staff check the neutral invitation and send it manually. The customer portal only shows a review link after the action is marked sent.
- Never filter customers by expected star rating or offer rewards in return for positive feedback.
- Nothing in this change automatically sends email, SMS or a Trustpilot API invitation.

## Automatic review requests (planned)

Add an owner-controlled opt-in feature using a verified mail provider and lawful contact preferences. Use a durable per-booking idempotency key, configurable delay, suppression/unsubscribe handling as applicable, audit trail, rate limiting and duplicate-safe retries. Do not send if the booking is cancelled, contact details are unverified or the customer has opted out. Review requests must always seek honest feedback.

## Customer complaints procedure (planned)

1. **Received:** Accept a complaint through the website or customer portal, acknowledge it and generate a tracking reference.
2. **Triage:** Route urgent safety, safeguarding and privacy concerns to authorised human staff immediately.
3. **In review:** Assign an accountable team member and record an internal due date, notes and progress.
4. **Responded:** Provide a factual human-approved response and log proposed remedies. AI must not promise refunds or binding resolutions.
5. **Resolved or reopened:** Record closure, notification and any further correspondence.

Implementation prerequisites: tenant-scoped data model with restrictive RLS, private complaint history, authenticated access to case details, anti-spam controls, retention/deletion policy, audit events, and secure human escalation. A complaint must not influence who is invited to leave a public review.

## Product examples

- https://getbusiness-ai.com/
- https://business-ai-pilot.vercel.app/

These links illustrate the current platform, not features still being planned.

## Checks before release

- [ ] Review and apply the Trustpilot schema migration to development only.
- [ ] Run `npm run verify`; check Google/Facebook compatibility, Trustpilot URL validation, owner settings and tenant-scoped portal responses.
- [ ] Separately implement and test automatic sends and complaints workflow.
- [ ] Explicitly approve any promotion to main or live deployment.


## 12 October development update — code complete, deployment pending

- Signed-in customers can submit one complaint per tracked enquiry. Owner/admin staff see a private case queue in Actions, with human response notes and audited status transitions. No automated response or public posting occurs.
- Automatic review invitation **queue and provider worker are implemented as source code**. Owners must enable review requests, select a valid review URL, and separately enable auto-email queueing. Each booking must have a valid contact email and explicit review-contact permission. Outbox is unique per tenant/booking; delivery uses atomic claims and a provider idempotency key. A case with a complaint is suppressed.
- The Resend delivery worker refuses any send unless `REVIEW_EMAIL_DELIVERY_ENABLED=true`, `REVIEW_EMAIL_SCHEDULER_SECRET`, `RESEND_API_KEY`, and verified sender `REVIEW_EMAIL_FROM` are configured. **No scheduler has been activated**, so no real messages can be sent from this source branch.
- **Do not enable delivery until** verified sender/domain, recipient contact preferences and suppression/unsubscribe handling, privacy and retention review, provider DPA, operational monitoring, complaint exclusion, and a controlled test email are approved. An ambiguous provider result is marked `unknown` rather than automatically retried.
- Deployment requires applying `20261012220000`, `20261012233000` and `20261012234000` in migration order to a reviewed isolated dev database, then full end-to-end UI and backend checks; leave Pilot/Production untouched until approved.
