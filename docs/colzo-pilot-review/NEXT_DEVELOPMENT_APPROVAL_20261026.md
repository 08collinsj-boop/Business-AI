# Corrected Development change - NEW approval required

James explicitly deferred full backup/recovery verification to public launch on
26 October 2026, then asked to continue safe work. Record that decision as
DEFERRED / UNVERIFIED. It is not recovery acceptance, SQL/deployment approval,
permission to weaken authentication or approval to activate a real business.
For this controlled-pilot preparation, this decision supersedes earlier procedural
backup prerequisites, the earlier procedural backup prerequisite. Genuine recovery remains mandatory before public launch.

## Approval requested only after final verification and independent review

Target: Business-AI-Dev, mvwseobgkexzpmmkgcxe. No other project.
Executor: Composio SUPABASE_BETA_RUN_SQL_QUERY, a single invocation with exact
JSON payload in pilot-release-management.PROPOSED.json, read_only=false.
This file is inert review material; no tool automatically executes it.

Exact management query SHA256:
ab3131c87a430aea23e1157774f6a0bcbd6c7a5cbe50e63abb87d43a6f9a69be
Exact UTF-8 management JSON file SHA256:
af5efe66d96a426251a597e607a9ac72ad91da5c58cd00ad9038dc3788cde5ab
Corrected psql application SHA256:
56c45dd5e69273258d0ac9b563fecc8daabe42abe785e750a7a7ba2c4095c498

## Previous approved attempt failed closed

The user's “jeep going” response to the exact SQL approval request authorised the
previous payload only. It was invoked once on Development at approximately
17:38 UTC and failed with P0001 “unsafe operator role”. No retry occurred.
Readbacks at 17:38:30 and 17:49:24 UTC confirmed all staged objects/operator absent,
59 migration entries and no partial installation. The immediately preceding
17:37:26 preflight confirmed all 59 SQL fingerprints unchanged, zero duplicate
pending groups and all baseline dependencies. Raw aggregate evidence is retained
in APPROVED_ATTEMPT_PREFLIGHT, FAILED_INSTALL_RESULT and FAILED_INSTALL_READBACK.

Managed postgres is NOSUPERUSER/CREATEROLE/BYPASSRLS. PostgreSQL 17 automatically
grants a new role back to a non-superuser creator with ADMIN TRUE, INHERIT FALSE,
SET FALSE, issued by bootstrap superuser OID 10. The creator cannot revoke that
bootstrap-issued edge. The previous superuser fixtures missed this distinction.
See https://www.postgresql.org/docs/17/role-attributes.html.

The corrected wrapper permits only that exact edge to trusted postgres, with
bootstrap OID 10 still superuser and installer NOSUPERUSER/CREATEROLE. Every other
edge touching the operator, including outbound grants, is rejected. Runtime
anon/authenticated/service_role must have neither MEMBER nor SET access. All
original role flags, function ownership/search_path, effective EXECUTE and direct
write checks remain. All five staged SQL source hashes remain unchanged.

This changes the invariant from literally zero members to zero runtime members
with one platform-issued administrator edge. ADMIN lets postgres subsequently
regrant SET/INHERIT: these options are accident prevention, not a boundary against
that trusted administrator, who already owns the definer functions and CREATEROLE.
This is a changed security assertion and needs explicit NEW approval of these
hashes. Prior approval does not authorise it.

The API query removes only the psql client directive from the application file;
its server transaction/settings/DDL/assertions/COMMIT are identical. Fresh faithful
non-superuser PGlite checks pass 13/13, including seven invalid membership rollback
cases; independent reviewer rerun also passes 13/13 with no Critical/Important
findings. Alternate grantor is disposable superuser catalog fault injection only.
Fresh native PostgreSQL 17.11 checks pass 9/9 on a private socket, TCP disabled,
NOSUPERUSER/CREATEROLE postgres fixture; cluster stopped. These are synthetic checks,
not managed Auth or genuine-source recovery acceptance. An initial native runner
syntax error was corrected before this clean-cluster passing run.

## Effects and boundaries

Install the five staged proposals in dependency order: pilot grant table, restrictive
expiry policies, private audit/invitations/operator controls, atomic workspace
provisioning and service-only idempotent booking RPC/unique pending-request index.
The operator role is NOLOGIN/NOINHERIT with no runtime members (the one exact platform installer-admin edge is permitted). Runtime/browser roles cannot
provision. No pilot grants, invitations, businesses, memberships or activation
records are inserted. Existing records are not deleted or rewritten. Policies and
membership triggers can affect existing access/writes, so this is a material shared
Development change even without any activation.

Expected trusted owner is postgres. A SELECT-only check through this executor
confirmed current_user=postgres with role-creation permission. No password reset,
credential entry or private source export is required for this scoped SQL route.
This does not establish a general database export/recovery connection.

Fresh read-only preflight at 16:30:59 UTC / Europe-London on 26 October found all
staged objects absent, all listed baseline dependencies present, zero duplicate
pending AI booking groups and 59 ledger entries. All 59 recorded SQL fingerprints
match the earlier capture; historic repository/ledger discrepancies remain
recorded and are not silently repaired. This is not complete migration replay.
Refresh the preflight immediately before any subsequently approved application;
stop on collisions, duplicates, changed dependencies or unreviewed drift.

## Failure and rollback

Before COMMIT: failure aborts the transaction; connection closure or explicit
ROLLBACK leaves proposed DDL/roles uncommitted. Native synthetic late-index and
owner-rejection checks verified this. Do not weaken assertions to make it pass.
After COMMIT: verify the resulting schema, grants, policies and zero activation;
keep the controls/audit/data intact and stop further work on any mismatch. There
is no destructive automatic down script and no verified actual-source restoration
route. Defer deployment/activation if acceptance fails. No table/policy/role DROP,
record deletion, history rewrite or retry is authorised by this proposal.
If a call times out, inspect actual object state before considering any next step.

## Separate later approvals

This approval does not authorise:
- Vercel deployment, environment writes, alias/domain/Production changes or merge.
- Development Auth site_url/redirect edits or weakening Preview access protection.
- Account/business creation, invitations/email, legal acceptance or Pilot activation.

The candidate has no Vercel cron registrations; the previous daily schedule is
preserved in MARKETING_CRON_DEFERRED_20261026.json as disabled review material.
Scheduler/provider code remains. This source change does not disable already-live
projects or authorise manual scheduling.

The approved Preview must have branch-specific Development credentials, both auth
flags true, scoped access true, billing false and legacy blanket pilot override
false. Explicitly shadow/remove inherited OPENAI_API_KEY and any other provider
keys for that branch. No provider test call. Keep service keys server-only.
Global Preview currently contains an OpenAI key and no exact-candidate override,
so deployment is not yet approval-ready with inherited settings.

Vercel's existing SSO protection is all_except_custom_domains and must remain.
The read-only Preview checker treats a gateway 401 as BLOCKED, not an app pass;
it does not bypass the gateway or substitute the older working Preview.

## After the approved SQL step

Verify exact owner/search_path/effective grants/RLS and absence of activations
using read-only queries. Prepare an exact Development-only environment/deployment
request for separate review. Correct only Development Auth to the eventual accepted
Preview URL after separate approval; retain unrelated redirect entries unless
separately reviewed. No executable Auth change payload contains a guessed URL.
Then use the prepared fictional-business, two-account and iPhone acceptance sheets.
Managed confirmation/reset/invitation sends remain separately blocked.
