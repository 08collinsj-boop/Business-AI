# Colzo recovery and pilot continuation - 24 October 2026

**Decision: NO-GO for real pilot businesses.** Isolated security fixes and a Preview configuration correction are complete. Genuine Development backup restoration, operator activation and real two-business Auth/MFA/recovery acceptance remain blocked. This report supersedes earlier test totals; earlier evidence keeps its original scope.

## Verified engineering changes

- The staged grant function now prevents an owner with a previous pilot award from restarting free access through a different business. Existing idempotent requests still return the original result without extending access.
- The staged membership trigger rejects adding a pilot member to an unmarked legacy business, including expired/revoked designations.
- It now locks the destination business before checking its pilot designation. The native regression reproduced **eight memberships with one pilot grant** before this correction; the corrected initial-grant/legacy-writer race preserves two seats.
- Operator replay and every membership INSERT/UPDATE require **READ COMMITTED**. REPEATABLE READ and SERIALIZABLE writes fail closed because an older snapshot could miss a new designation. This is an explicit compatibility constraint for legacy membership writers too; review their transaction settings before any future installation.
- Invitation acceptance rolls back token consumption and membership creation when audit persistence fails.
- Scoped onboarding GET returns minimal own-business pilot status, exact active expiry and recovery guidance. Ambiguous memberships are refused; denied pilots do not read the protected public route. Missing/unavailable/foreign/duplicate grants cannot produce active status.
- The login bootstrap explains ended, withdrawn, pending or unapproved access before loading a workspace. It preserves the existing session and design; no public operator writer or grant endpoint was added.

All four SQL proposals remain outside automatic migrations. Only `pilot-provisioning.STAGED.sql` changed. No shared Development SQL was installed.

## Tests actually executed

| Check | Actual outcome | Scope |
| --- | --- | --- |
| Initial full regression/build/static | 1,285 passed; zero failed/skipped | Starting SHA 35a0edaf |
| Final npm run verify | **1,294 passed; zero failed/skipped/cancelled**; React build and 334-file static checks passed | Final isolated implementation |
| PGlite database group | **17 passed; zero failed/skipped** | Executed staged SQL and fixtures |
| Independent reviewer focused execution | **33 passed; zero failed/skipped** | SQL fixture, new status and existing business-creation tests |
| Native PostgreSQL 17.11 | **38 checks passed across nine real overlapping-backend races** | Synthetic private socket-only clusters |
| Native pg_dump/pg_restore | Passed, six table counts matched; expired RLS and operator privilege denials preserved | Second empty database; cluster roles retained |
| Migration SQL comparator | 57 files / 59 ledger entries / 46 token matches / two same-version differing-SQL pairs; result identical to earlier audit | Current repository plus freshly verified captured SQL |
| git diff --check | Passed | Changed files |

The red tests first reproduced owner restart, pilot-to-legacy membership and unsupported isolation-mode writes. A native ordered designation/legacy-insert race also failed before the business-lock correction. An intermediate full suite failed one incomplete old test fixture (membership role omitted); that fixture now supplies the real required role. The final full suite passes without skipped failures.

The first native continuation attempt reused a cluster containing roles and failed with `role anon already exists`; it was rejected as evidence and rerun on a fresh cluster. All six disposable clusters were stopped after verification. Temporary native/runtime installation attempts in the local sandbox did not create a source backup; the successful PostgreSQL run used the separate disposable execution sandbox.

Machine-readable final native evidence: [POSTGRES_CONTINUATION_20261024.json](POSTGRES_CONTINUATION_20261024.json). Runner: [verify-colzo-pilot-postgres.py](../../scripts/verify-colzo-pilot-postgres.py).

## Independent SQL/code review

A separate reviewer inspected all four staged SQL proposals and the final API/UI changes. Two Important findings were reproduced and corrected: the pilot-to-legacy membership gap and initial designation transition race. Final inspection found no remaining Critical or Important defect in the inspected isolated changes. The reviewer independently executed 33 focused tests; the 38-check PostgreSQL run was executed by the implementing agent, not independently repeated by the reviewer.

This is an independent code review, **not an independent real-source restore certificate or shared-SQL/onboarding approval**. Remaining coverage limits include future/partitioned tables, other exposed schemas, Storage, privileged service paths and security-definer RPCs. The staged operators verify confirmed email and ownership attestation; actual human identity, MFA authentication and secure token generation/delivery still require the unreleased operator integration and real acceptance.

## Actual Development recovery evidence

Read-only inspection of `mvwseobgkexzpmmkgcxe` confirmed:

- Project Business-AI-Dev is ACTIVE_HEALTHY, PostgreSQL 17.6; organisation plan **free**.
- 52 public tables, 59 recorded migrations, 44 public policies and 27 tables with effective authenticated SELECT privilege.
- 16 Auth users, two MFA factors, three Storage buckets and 12 Storage object records. Metadata reports 9,867,566 bytes; these bytes were not downloaded or verified.
- `public.colzo_pilot_access` remains absent. No grants or pilot accounts were activated.
- Managed backup list is empty; PITR is disabled. `walg_enabled=true` is not a downloadable or verified recovery copy.

All **59 live recorded SQL entries, including statements**, exactly equal the earlier capture after canonical JSON serialization. Both SHA256 values are `7a63893969aae121b4d689850fd3223ec4680f579dc9adab5b6e3e6e7885cb86`. The conservative migration audit was rerun and its output was byte-identical to `MIGRATION_SQL_AUDIT_20261024.json`. No name-based repair or historical migration rewrite occurred.

The earlier detailed discrepancy analysis remains current: six repository source dependencies absent from the ledger reconstruction, ledger-only application tables, split strategy migrations, superseding usage-limit functions, extra policy cleanup, quoted-body comment differences and guarded-vs-direct constraint statements. See [RECOVERY_AND_RECONCILIATION_20261024.md](RECOVERY_AND_RECONCILIATION_20261024.md). These establish content/dependency causes; they do not prove who originally applied out-of-ledger SQL.

**No genuine complete source backup was created or restored.** Connected management tools provided SQL/configuration metadata but no usable authenticated pg_dump source connection or complete download. Discovery found backup-list and in-place PITR restore capabilities; the latter is prohibited and unavailable with PITR off. No source password was reset or secret copied to GitHub/logs.

## No-cost recovery route and exact prerequisites

The existing free project does not provide a verified managed backup/isolated clone here. A separate local compatible stack is the no-paid-infrastructure route. Official Supabase documentation now also describes an experimental native stack for Linux without Docker; lack of Docker alone is therefore **not proof recovery testing is impossible**. A compatible stack was not established in this run. Genuine pg_cron/pg_net replay, actual Auth/Storage services and source export are still prerequisites.

Before any source export, the operator must provide, through a secure private configuration channel rather than chat:

1. A read-only authenticated Development export connection with access to required database/Auth/Storage metadata and roles.
2. An authenticated read path for all 12 Storage objects, plus recoverable essential configuration and secret-store references.
3. An operator-held encryption recipient/key and private encrypted destination. Neither plaintext data nor keys belong in this repository or generic artifacts.
4. An isolated compatible runtime with outbound SMTP, webhooks, AI/payment calls and schedulers blocked externally before real data is restored.

Use the existing ten-step private recovery procedure in [RECOVERY_AND_RECONCILIATION_20261024.md](RECOVERY_AND_RECONCILIATION_20261024.md): consistent snapshot; complete dump/roles/ACL/sequences/history; versioned object-byte capture and hashes; configuration/key recovery inventory; authenticated encryption with key held separately; private decryption verification; empty isolated restore; complete source/target fingerprints; genuine local Auth/MFA/reset/tenant/Storage tests; signed evidence and shutdown. Use a standard reviewed encryption tool such as GnuPG or age. This run did not generate a real recovery key, seal actual records or certify decryption.

Official references checked during this run:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/guides/local-development/docker-and-native-runtimes

A real restore must pass before shared SQL can be proposed. Then review an exact forward-only reconciliation/baseline strategy in isolation, including genuine extensions, the Development-only WhatsApp source and preserved migration history. Never turn the diagnostic 65-step chain into an unreviewed shared migration repair.

## Preview correction and acceptance

Original Preview `dpl_GnSLUg8hUWZeK1Ef6nzM3PYkozx4` was READY at `35a0edafab22753c2584c535a3950c70b02c4e96`, but the browser showed “Authentication is temporarily unavailable”; its public-config endpoint returned an authentication-unavailable error.

A verified Development **public browser key** was scoped to this feature branch's Preview environment, without changing the service-role secret, shared Auth settings, Production or other branches. The existing deployment cannot consume a new environment value, so one necessary replacement Preview was built from the **same exact SHA**:

**https://business-89p8aur0u-buisness-ai1.vercel.app/**

- Deployment: `dpl_HnF2JM46pvZN7SkJTMsTurQ9pMve`; READY; non-production target; Hobby/basic build; no paid infrastructure.
- Build logs confirm clone at 35a0eda and successful 228,622-byte Colzo React bundle.
- Browser public-config confirms frontend authentication enabled, Development Supabase URL, public browser key present and legacy free access false.
- Branch configuration retains scoped pilot false, legacy pilot false, billing false, tenancy/frontend authentication true.
- Browser owner login, registration form, password-reset form and customer account route render. **No form was submitted.**
- Anonymous onboarding, client-record and billing routes returned application “Authentication is required” errors. This is a narrow anonymous denial check, not authenticated tenant acceptance.
- Pilot information page explains approval, 14 days, two users, no card and no automatic conversion.
- Outer Vercel protection was not disabled or bypassed. The browser already had sufficient deployment access; a raw unauthenticated request reached the Vercel SSO wall.
- No real login, token refresh, MFA, verification email, reset delivery, owner/customer write journey or physical iPhone/PWA acceptance was performed.
- The Preview still runs **35a0edaf**. The new SQL and status/UI corrections in this continuation are tested isolated branch changes, **not deployed acceptance**.

Development Auth still points its site URL at the older Pilot, and its redirect allowlist does not contain either current exact Preview URL. No shared Auth configuration was edited. The current scoped flag is false, so normal registration controls remain visible; this is not evidence of public pilot grant capability. Do not enable the flag or run registration/provisioning acceptance before the recovery/release gates.

## Outstanding actions and user involvement

| Blocker | Specific resolution |
| --- | --- |
| Actual-source recovery | Secure source-export/object access, operator encryption key/destination and compatible isolated runtime; complete private restore and real local Auth/Storage/tenant verification |
| Migration acceptance | Independently review content/dependency findings; test genuine extension replay plus fresh/old database paths; approve exact reconciliation plan |
| Operator integration | After recovery sign-off, implement a private audited workflow with verified operator identity, actual MFA, approval evidence, token generation/handling and recovery; keep app provisioning/team writers blocked meanwhile |
| Preview Auth recovery | Review exact Development redirect changes, verify service credentials map to Development without exposing them, and approve a final-SHA Preview when prerequisites permit |
| Real acceptance | Two consented Development identities/businesses, email/MFA/reset/session and all owner/customer workflows; no older-account MFA substitution |
| Device/release | Physical iPhone Safari/PWA acceptance, final legal/support checks and separate invitation approval |

The immediate user action is secure Development export/recovery access and a suitable private recovery destination/runtime. Do not send passwords, API keys, OTPs or backups in chat. Approval to apply shared SQL or invite businesses is premature.

Composio worked for the investigation, read-only source checks, necessary Preview correction and synthetic PostgreSQL execution, then returned a service-side HTTP 403 with a Cloudflare block. Calls to that integration stopped; GitHub publication uses the separate authorised connector if available. This is not evidence that the GitHub account lost permission.

No Production/older-Pilot operations, shared database writes/resets/restores, real-account activation, invitations, emails, provider activation, merge or paid resources occurred. The sole deployment was the necessary isolated configuration-corrected Preview above.


## Publication outcome

Tested implementation commit: `298ebb27c4f82fb8c69f98789786c4c1903bdcd5`; tree `a16011fc02cd57910b062e4244fed84cc6556c71`; parent `35a0edafab22753c2584c535a3950c70b02c4e96`. This commit is **local only**. The separate GitHub connector also returned HTTP403 `Resource not accessible by integration` for both Git blob creation and PR metadata update. Neither attempted write succeeded. PR63 remains draft at the original remote head; its body was not updated.

The correction package contains a standard Git format-patch against the pinned base, this report and native evidence. Apply it only to the authorised feature branch in a clean checkout at the pinned base (or review conflicts against any newer head); rerun verification, then publish through an authorised write connection. Do not force-push or apply shared SQL. The new API/UI changes must receive a later final-SHA Preview acceptance after recovery prerequisites permit it.
