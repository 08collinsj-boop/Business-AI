# Business AI UK Compliance Pack v1.4

Status: technical/legal implementation reviewed 5 October 2026 against current UK/ICO guidance. This is not independent legal certification.

## Implemented

- Public Legal centre: Terms, Privacy Notice, DPA, Acceptable Use, Storage/Cookie Notice and Sub-processor Notice.
- Legal documents are versioned and acceptance is recorded server-side where required.
- Signup requires explicit Terms/AUP agreement and Privacy acknowledgement.
- Existing users are gated when accepted versions are no longer current.
- Business owners are gated until the current DPA is accepted.
- Acceptance records are server-side, versioned and timestamped.
- Customer enquiry UI links to privacy information at collection.
- Privacy notice states data categories/sources, purposes/lawful bases, recipients, transfers, retention, rights, complaint route and right to object.
- DPA covers Article 28 processing details and minimum processor clauses.
- Public service-provider identity/contact configuration is populated on Pilot.
- Supabase Auth uses custom Resend SMTP for confirmation/recovery email.
- Owner-only tenant-scoped lead export/anonymisation exists and records audit events.
- `DATA_SUBJECT_RIGHTS_RUNBOOK.md` now documents intake, timing, identity checks, export, erasure, restriction/objection and processor assistance.
- `PUBLIC_LAUNCH_BROWSER_CERTIFICATION.md` consolidates all remaining live/browser acceptance work into one task.

## Current provider map

- Supabase — database, authentication and private file storage.
- Resend — transactional authentication email.
- Vercel — application hosting/serverless runtime.
- OpenAI — AI enquiry processing and configured AI features.
- OpenRouter — AI Marketing text generation/model routing.
- Cloudflare — Workers AI image generation.
- Stripe — checkout/subscription billing.
- Meta Platforms — optional Facebook connection/publishing.

## Current launch decisions / remaining actions

### Can be completed only with operator/browser input

- Complete the ICO data-protection fee self-assessment. Sole traders/organisations processing personal information may need to pay unless an exemption applies; do not infer the result without the operator's factual answers.
- Vercel commercial hosting: the current Hobby terms restrict use to personal/non-commercial use. Resolve this before taking real paid customers by moving to a suitable commercial plan/host.
- Record the final Meta Developer/Platform terms applying to the connected app.
- Confirm VAT/tax presentation before accepting real paid orders.
- Run the consolidated live browser certification, including checkout/legal-document access and fake-data rights-request exercise.

### Deliberately deferred

Managed backups/PITR and the isolated restore drill are a documented post-launch P1. The operator accepted the temporary risk for a small supervised soft launch on 5 October 2026. Do not represent disaster recovery as verified until the restore drill actually passes.

## ICO rights timing used operationally

Current ICO right-of-access guidance requires compliance without undue delay and normally within one month, with a possible further two-month extension in qualifying complex/multiple-request cases where the person is told within the initial month. The rights runbook uses this as the operational deadline framework.

## Current official guidance checked

- ICO — data protection fee self-assessment.
- ICO — right of access guidance (updated December 2025).
- ICO — international transfers guidance (updated January 2026).
- ICO — UK IDTA/Addendum guidance.
- ICO — contracts between controllers and processors / Article 28.
- ICO — Storage and Access Technologies guidance.
- GOV.UK — sole-trader business-name/invoice disclosure rules.
- Electronic Commerce (EC Directive) Regulations 2002.

Because UK data-protection guidance is continuing to change following the Data (Use and Access) Act 2025, review this pack again before a materially larger launch or material processing change.
