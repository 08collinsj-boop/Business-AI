# Corrected fictional revoke — native PostgreSQL 17.6 acceptance (29 October 2026)

**Classification: isolated synthetic acceptance only. Secure real-business pilot remains NO-GO. No shared Development revoke, operator membership write, Auth configuration write, invitation, deployment, merge, Production change or charge was authorised or performed.**

## Exact tested and committed file

- Proposal: `docs/colzo-pilot-review/ISOLATED_FIXTURE_REVOKE_20261028.CORRECTED.PROPOSED.sql`
- Corrected commit: `744bd1b9b23c753569720d685062ed462aa4212d`
- Final tested **UTF-8 SHA-256: `1bfb70bc564989f529d4c9bb0c448dcba7dd666c3c5e31d8c26675554ba427d3`**
- Previous SHA-256 `ffc2a2f67c54b901e05e0323402795ea7a501f3c65902ca1428653b8af8b530c` was **invalidated by a native failing test and must not be submitted**.

## Red: original exact SQL failed in native PostgreSQL

The original file used `GRANT colzo_pilot_operator TO postgres WITH SET TRUE;` and required the temporary **postgres-granted** membership to have `INHERIT FALSE`. The native PostgreSQL 17.6 experiment produced a second membership with `INHERIT TRUE` (because the non-superuser postgres role has `rolinherit=true`), so the exact temporary-membership assertion aborted the transaction. The original real restricted `supabase_admin`-granted row and both synthetic grants remained unchanged.

A subsequent **read-only** Development role inspection independently confirmed the actual Business-AI-Dev `postgres` role has `rolsuper=false, rolcreaterole=true, rolinherit=true`. This reproduces the relevant condition and distinguishes it from an artificial NOINHERIT role.

## Green: explicitly preserve noninheritance

The only SQL file change is:
```diff
-GRANT colzo_pilot_operator TO postgres WITH SET TRUE;
+GRANT colzo_pilot_operator TO postgres WITH SET TRUE, INHERIT FALSE;
```

Independent GitHub readback of the committed file returned exactly the SHA-256 above.

## Isolated execution environment

- Verified pinned npm package `@embedded-postgres/linux-x64@17.6.0-beta.15` via registry SHA-512 integrity; native **PostgreSQL server 17.6**, Debian **psql 17.11**. Socket-only, `listen_addresses=''`, 0700 socket directory, private local test database `colzo_disposable_revoke`.
- Reused the repository's synthetic PostgreSQL bootstrap, business-creation migration, staged pilot entitlement, expiry, private provisioning and workspace provisioning definitions.
- Reproduced a **non-superuser CREATEROLE, INHERIT TRUE** `postgres`, distinct `supabase_admin` original grantor, original single `ADMIN TRUE / INHERIT FALSE / SET FALSE` operator membership, disabled effective SET/USAGE, two active *synthetic* grants, two distinct synthetic owners, and original private grant audit rows. Fixture UUIDs matched the proposal; no actual Auth record, password, secret, token or private customer data was copied.
- The isolated code evaluated the original complete file, then the single-line candidate. Forced-error/concurrency runs used separately modified **copies**; the successful native run used the **untouched candidate bytes** matching the final GitHub SHA.

## 22 focused checks: PASS

Checks included exact SHA and baseline; wrong executing identity rejection with no state changes; deliberately injected division-by-zero immediately before COMMIT with exact restoration of grant/audit/membership/function state; a separate backend during an uncommitted revoke seeing only original grants/memberships; denial of `SET ROLE` in that separate session; concurrent injected-error rollback; untouched exact-file success; the QA grant transitioning to revoked; original demo grant unchanged; exactly one expected revoked audit with correct business, actor, key, executed_by postgres and result.status; exactly one original supabase_admin grantor membership restored with SET/USAGE false and no extra postgres-granted membership; unchanged revoke function definition and original membership; whole-file retry failing closed without new audit/data changes.

Isolated test execution evidence: `log_WipZw2f8wmV6`. The red reproduction was observed in `log_9he19TBtBAm0` and the explicit noninheritance correction verified in `log_8pV0mlEVL6Wg`. The complete run had **22/22 checks passed**. This does not claim that every alternate preflight manipulation (wrong original grantor, extra preexisting membership, replayed key, missing fixture or existing revoke audit) was independently run.

## Fresh managed Development read-only status

The *actual* QA fixture still has **active** access until **2026-11-11 22:50:58.480174 UTC**, original demonstration grant is active, QA has **zero verified MFA factors**, zero QA revoked audit events, and exactly one original restricted `supabase_admin`-granted operator membership. The live Development database was inspected by SELECT only. The success in the disposable cluster **does not mean actual Development access was revoked**.

## Remaining before any live fictional revoke or real pilot GO

1. Complete the existing QA owner's private MFA enrollment, verify genuine AAL2 and independent Supabase-issued JWT/browser/API authorization for both businesses. Test positive own-tenant reads and protected writes plus denied foreign reads and writes. SQL SET LOCAL ROLE simulations are not equivalent.
2. Verify stale-session/JWT replay; document genuine live revocation denial with the separately authorised operator procedure, and do not pretend synthetic clock tests prove real grant expiry.
3. Freshly verify operator and role membership state, fixture eligibility, script SHA and atomic SQL Editor execution. The next *live* Development revoke requires **separate owner approval of final exact bytes and hash**. Do not rerun the earlier superseded proposal.
4. Resolve operator/contact responsibilities, final pilot legal/DPA/data export, deletion and backup/retention policy before real-business access. No customer invitations or real-business activation.

PR remains draft and unmerged; protected Preview runtime stays at the previously approved `adecce31b88f5c1ffd623480524996cb5ae91581`. No Production write, new deployment, spend or real-business activation.
