# Controlled release procedure - 26 October 2026

Status: NOT AUTHORISED for shared SQL, deployment or activation. This is the exact
review sequence, not an instruction to bypass a failed gate.

## Candidate and integration

PR #63 was freshly verified as draft/unmerged at db4e5ebc7cfb719615118c9efafcaf23f848767e.
The continuation fix/colzo-pilot-continuation-20261025 was verified at
91e0d0d6babcbdca961d6985bba2843f1f7de2ee, 17 commits ahead and zero behind.
The new fix/colzo-pilot-release-gates-20261026 starts at that exact continuation.
No divergent work was silently merged and neither existing branch was changed.
Learn My Style remains outside this candidate. The two older integration heads
904abd210d63e5609b162d64cb430e3f64d373b4 and
4c25c7fb56e9ff7315e57771e687e12026eca11a are historical integration alternatives,
not authority to replace the continuation.

Both Vercel configuration files explicitly disable automatic deployment of this
new branch and the existing continuation/PR branches. Vercel project-level Git
deployment creation remains enabled for other branches. Do not assume the
branch safeguard disables deployment for the entire repository.

## Source recovery before SQL

Development only: mvwseobgkexzpmmkgcxe. Managed backup inventory is empty and
PITR is off. Metadata tools are not a pg_dump connection or a Storage-byte export.
The complete procedure remains in RECOVERY_AND_RECONCILIATION_20261024.md.

The operator must first open the project's **Connect** screen, identify the
Development connection (direct or session pooler), and arrange a private password
file/secret-manager injection into an approved export runtime. Do not reset the
shared password, paste a connection string into chat, or store it in Git.
Use PostgreSQL 17 pg_dump with complete schema/data/ACL/sequence coverage and a
consistent snapshot. Preserve Auth users, identities, MFA and session tables;
capture custom roles without passwords. Stop on incomplete privileges.

Choose an operator-controlled encrypted local destination and recoverable key
held separately before exporting private data. Existing colzo-backup-integrity.mjs
supports AES-256-GCM seal/verify/extract of an existing private file outside Git;
it neither exports the source nor certifies recovery. No real-data destination or
operator-held recovery key was established in this execution. Do not export real
records into tool output, public artifacts or a generic download link.

Capture all Storage bucket/metadata definitions and actual bytes with per-object
size/SHA256 and before/after inventory reconciliation. Current aggregate: three
buckets, 12 objects, 9,867,566 metadata-reported bytes. Capture Auth/email/redirect,
API/Storage/provider/project configuration privately, tracking masked secrets and
MFA/signing-key recovery limitations. Restore into a network-isolated compatible
Supabase stack with SMTP, providers, jobs and webhooks disabled. Compare complete
row/sequence/schema/grant/policy/function/extension and byte integrity; perform
real local login/reset/MFA/session tests with approved identities. An independent
reviewer must sign off the real-source recovery certificate and migration plan.

## Exact staged SQL review and application proposal

All five sources remain outside automatic migrations. Required order:

1. scoped-pilot-access.STAGED.sql: grant table; requires existing businesses/users.
2. pilot-expiry-enforcement.STAGED.sql: private schema and restrictive policies.
3. pilot-provisioning.STAGED.sql: private audit/invitations/operator/seat checks.
4. pilot-workspace-provisioning.STAGED.sql: existing create_business_for_owner RPC.
5. pilot-idempotent-bookings.STAGED.sql: grant/leads/bookings/history/audit dependency.

Run release-preflight.READONLY.sql again immediately before the proposed change.
Any duplicate pending AI booking group, colliding staged object, missing dependency
or unreviewed migration drift stops application. Never rewrite/delete records to
make the index succeed. Review exact file SHA256 values from the candidate, SQL
owner, search_path, schema exposure, RLS and effective privileges. The booking
RPC is service_role-only; private provision/grant/invite/accept/revoke functions
are operator-only; anon/authenticated/service_role cannot provision. The operator
role remains NOLOGIN/NOINHERIT without members. Do not add it to a browser/API role.

Each file has an explicit transaction. An approved operator must choose and review
the atomic application packaging: do not wrap these files naively in psql -1,
because embedded COMMIT statements defeat one enclosing transaction. A reviewed
combined script must remove only the five outer BEGIN/COMMIT pairs, retain every
function-body transaction statement, use one BEGIN/COMMIT, lock/statement timeouts
and ON_ERROR_STOP, and be hashed and replayed in isolation before approval.
No combined shared script was executed here. Obtain James's explicit approval of
that exact script and recovery evidence before any shared write.

Before commit verify trusted ownership and has_function_privilege for PUBLIC,
anon, authenticated, service_role and colzo_pilot_operator; inspect operator-role
membership and policies; verify zero grants/activations were introduced. If a
check fails, ROLLBACK before commit. After commit refresh the API schema cache
only through the separately reviewed mechanism, then verify managed permissions.

## Rollback without losing data

Before commit: ROLLBACK the single reviewed transaction. No records are deleted.
After commit: stop activation/invitations and keep scoped access fail-closed; do
not turn off scoped enforcement as a shortcut to restoring legacy access. Keep
new tables, restrictive policies, immutable audit and records. An approved app
rollback must retain equivalent tenant/expiry/MFA denials and use the exact last
accepted scoped build. There is currently no accepted candidate deployment to
roll back to. Suspend designated workspaces through the audited revocation flow
if separately approved; preserve expiry/audit history. No DROP/reset/history repair.

## Preview environment acceptance

After genuine recovery, SQL review/application approval and exact candidate
approval: create only a separate Preview; verify Git SHA and Development project
mapping. Current continuation/new branch have no approved branch-specific env set.
Do not inherit the global Preview environment without verifying every value.
Auth site_url still references the older Pilot; correct only approved Development
redirect settings for the exact Preview after review, without changing that Pilot.

Require TENANCY_AUTH_ENABLED=true, FRONTEND_AUTH_ENABLED=true,
COLZO_SCOPED_PILOT_ACCESS=true, PILOT_FREE_STARTER_MARKETING=false,
BILLING_ENABLED=false, and Development-only Supabase URL/keys/expected ref.
Verify service credentials stay server-only. Omit paid AI/provider credentials
from this no-cost Preview; use deterministic/manual handling and verify its
limitations honestly. Do not call a configured provider to test whether it costs.
Verify Voice, WhatsApp, Marketing/automation/scheduler, billing, uploads, Connect,
Learn My Style and unsupported customer replies are denied by server and UI.
Review cron packaging so no scheduler is activated. No alias/domain promotion.

## Remaining approvals

Genuine recovery and independent SQL review remain missing. No shared SQL or
Preview approval is requested until those are concrete. Managed two-account,
MFA/reset/rotation/revocation, complete enquiry journey, physical iPhone and
legal/operator/provider acceptance remain blocking. Final business authority,
named users and explicit activation approval are separate; no invitation is sent.
