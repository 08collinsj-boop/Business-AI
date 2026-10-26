# Exact next Development change - prepared, not authorised

James explicitly deferred full backup/recovery verification to public launch on
26 October 2026, then asked to continue safe work. Record that decision as
DEFERRED / UNVERIFIED. It is not recovery acceptance, SQL/deployment approval,
permission to weaken authentication or approval to activate a real business.
For this controlled-pilot preparation, this decision supersedes earlier procedural
backup prerequisites, including the unchanged historical comment in the SQL.

## Approval requested only after final verification and independent review

Target: Business-AI-Dev, mvwseobgkexzpmmkgcxe. No other project.
Executor: Composio SUPABASE_BETA_RUN_SQL_QUERY, a single invocation with exact
JSON payload in pilot-release-management.PROPOSED.json, read_only=false.
This file is inert review material; no tool automatically executes it.

Exact management query SHA256:
fa8dd0c1c7b1505523621e2f329612b21d76b24b63919722b1a69cb7e7a98ec1
Exact UTF-8 management JSON file SHA256:
0ba54ae72e0183a7b995d95bd6cd08c55cb3be066df959ab7833153557687567
Original psql application SHA256, unchanged:
26c864c1deb9b2deb4f1ab10d8e2f5aae0c7e76bc3aa45eeac99bd0dcae267c0

The API query differs only by removing the initial psql client directive
`\set ON_ERROR_STOP on`. The complete server BEGIN/settings/DDL/assertions/COMMIT
remain byte-for-byte identical. A single server transaction aborts on SQL failure;
there is no operation splitting or automatic retry. The exact API query passed
isolated PGlite application checks. Original server SQL already passed nine native
PostgreSQL package checks earlier today. Those native checks were not rerun for
this transport-only derivation; no managed DDL acceptance is claimed.

## Effects and boundaries

Install the five staged proposals in dependency order: pilot grant table, restrictive
expiry policies, private audit/invitations/operator controls, atomic workspace
provisioning and service-only idempotent booking RPC/unique pending-request index.
The operator role is NOLOGIN/NOINHERIT with no members. Runtime/browser roles cannot
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
