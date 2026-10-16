# Colzo - independent launch-hardening evidence

**16 October 2026. DRAFT ONLY. Public launch remains NO-GO.**
This change set is isolated from Work's authenticated Dev acceptance. It is
not permission to deploy, merge, contact customers, purchase any infrastructure
or modify Production/Pilot. The existing owner account (08collinsj), business
and Microsoft Authenticator must be preserved.

## 1. Backend and record integrity

Reproduced a missing tenant/identity check on enquiry references used by new
Colzo quotes and projects. Existing API authentication already restricted
record reads/writes by business, but valid-looking lead IDs were accepted
without checking whether that enquiry was owned by the same business.
A JavaScript Number also could round an 18-digit enquiry ID.

- The protected write handler now confirms the lead belongs to the authenticated
  business before POST or PATCH reference changes.
- Safe-integer validation rejects a reference that would be rounded.
- Enquiry-less projects are still allowed; mandatory quote references remain.
- Stale version 409 protection, lifecycle constraints, admin-only writes and
  existing metadata-only audit trail are unchanged.
- Synthetic regression tests cover foreign/nonexistent lead references, safe
  IDs, owned success, project without lead, quote reassignment denial and
  preservation of the previous protected-write tests.
- The new check is not proof of live Dev auth isolation: Work still needs
  explicit actual-tenant acceptance and must validate no cross-tenant relation
  can be introduced through alternate API routes.

## 2. Mobile accessibility and UI

Added synthetic Chromium sign-in/onboarding accessibility acceptance covering
320x700, 390x844 and 1366x768. Verifies sign-in/sign-up input labels, keyboard
focus, correct onboarding progress semantics and absence of sideways overflow.
The runner is read-only, blocks real external network traffic and does not
exercise the real Supabase account or MFA.

The 12 previously flagged Stitch screens are still NOT APPROVED. Work has
the full app route-by-route acceptance responsibilities.

## 3. Marketing and AI safeguards

Changed automation eligibility so a malformed non-null last-run timestamp
is **not** treated as an immediately due job. This reduces the risk of
repeated AI generations on corrupted data. Null (never run) remains eligible
when enabled; disabled jobs remain ineligible. Existing safety tests continue
to cover owner approval, pause/kill switch, caption review hashes, schedule
frequency and blocked automatic publication.

This does not automatically enable, run, publish, or call any AI provider.
All tests use synthetic fixtures.

## 4. Public website and commercial claims

Continue reviewing standalone website/design and legal copy in draft
[PR #20](https://github.com/08collinsj-boop/Business-AI/pull/20)
without copying it into this branch. Public pages remain Business AI-branded.
This hardening branch does not replace any live marketing HTML, enable checkout,
change pricing, alter Stripe, or edit legal versions.

Unverified claims, booking confirmation, delivery of follow-up communications,
phone/WhatsApp availability, connected Meta publishing, support priority and
commercial hosting are out of scope for approved public advertising.
The separate no-checkout Colzo landing preview is a visual reference only.

## 5. Backup, data recovery and security evidence

Dev Supabase read-only inspection returned:
- Project ID: mvwseobgkexzpmmkgcxe.
- Private Storage buckets: business-knowledge, marketing-images.
- Public Storage bucket: business-profile-media.
- Postgres leads table stores an integer (bigint) ID and a tenant UUID.
- The Colzo Clients, Projects and Quotes tables exist and have tenant UUIDs.
- Applied migration versions include 20261012223925
  (post_pilot_colzo_projects_quotes_clients) and 20261016153313
  (colzo_whatsapp_synthetic_inbox_dev_20261016), but matching SQL files were
  **not present in the checked-out repository migration folder**.
- Existing Dev security advisories include one leaked-password-protection
  warning and eight informational server-only RLS no-policy findings; do not
  weaken access policies just to silence these.

Added a local-only recovery-evidence checker and test suite. With no verified
restorable backup, no isolated restore drill, no verified Storage reconciliation
and no checked-in SQL for those provider-applied versions, it reports BLOCKED.
A source-control commit, a Vercel rollback and a functioning Dev database do
NOT substitute for a restorable database plus associated object storage.
Do not initiate a restore, alter backups or enable a paid feature without
owner approval. The caller cannot prove a migration is in source by merely
supplying a made-up filename.

## Required steps before public release

1. Work completes real authenticated Dev customer flows, existing account/MFA
   and membership, correct Dev environment, and tenant-isolation tests.
2. Recover exact migration SQL for the applied Colzo changes, review and
   reconcile against existing schema before proposing a reproducible new
   environment. Never automatically run unreviewed migrations.
3. Produce backup inventory and a documented tested restore in a segregated
   environment with authorisation, then reconcile all three Storage buckets.
4. Owner approves legal identity, commercial hosting, ICO/security and
   pricing/paid-billing scope.
5. Rerun full test suite and browser tests on exact release SHA, and complete
   owner-authorised Production backup and rollback check.

**Release conclusion: NO-GO until the unresolved items have real evidence.**
