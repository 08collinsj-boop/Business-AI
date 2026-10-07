# Business AI UK Compliance Pack v1.5

Status: technical/legal implementation refreshed 7 October 2026. This is not independent legal certification.

## Implemented and verified

- Public Legal Centre: Terms, Privacy Notice, DPA, Acceptable Use, Storage/Cookie Notice, Sub-processor Notice and Data Deletion Instructions.
- Legal documents are versioned and required acceptance is recorded server-side.
- Signup requires explicit Terms/AUP agreement and Privacy acknowledgement.
- Existing users are gated when accepted versions are no longer current.
- Business owners are gated until the current DPA is accepted where required.
- Public service-provider identity, geographic address and direct contact routes are configured on Pilot.
- DPA v1.1 is available.
- Customer enquiry UI links to privacy information at collection.
- Owner-only tenant-scoped lead export/anonymisation exists and records audit events.
- Data-subject-rights and disaster-recovery runbooks exist.
- Supabase Auth uses custom transactional SMTP.
- Meta data-deletion instructions are publicly available and the authenticated disconnect deletes stored Meta connection/account records.

## ICO data-protection fee

The ICO self-assessment was completed on 5 October 2026. The result was Tier 1: a £52 annual fee, or £47 with Direct Debit.

The assessment stopped before registration, declaration or payment. Those actions require operator approval and must not be completed automatically.

## Current provider map

- Supabase - database, authentication and private file storage.
- Resend - transactional authentication email.
- Vercel - application hosting/serverless runtime.
- OpenAI - AI enquiry processing and configured AI features.
- OpenRouter - AI Marketing text generation/model routing.
- Cloudflare - Marketing image generation.
- Stripe - checkout/subscription billing.
- Meta Platforms - optional Facebook connection/publishing.

## Current launch decisions / remaining actions

### Operator/browser input required

- Complete ICO registration/payment if the operator approves proceeding with the Tier 1 result.
- Resolve commercial hosting before taking real paid customers. The current Vercel team is Hobby and current terms restrict Hobby to personal/non-commercial use.
- Enable Supabase leaked-password protection in Auth settings.
- Complete the Meta Developer-console checkpoint: current App Review/advanced-access state, any required verification for unrelated businesses, data-deletion setting and current Developer/Platform terms.
- Run the remaining signed-in browser certification, including fresh signup/recovery, fake-data rights request and Stripe TEST commercial journey.
- Confirm VAT/tax presentation before accepting real paid orders if/when that becomes applicable.

### Deliberately deferred

Managed backups/PITR and the isolated restore drill remain a documented post-launch P1 for the small supervised Pilot. Do not represent disaster recovery as verified until that drill actually passes.

## Operational rights timing

Continue to use the documented current ICO right-of-access response timetable in `DATA_SUBJECT_RIGHTS_RUNBOOK.md`. Recheck ICO guidance before materially larger launch or processing changes.
