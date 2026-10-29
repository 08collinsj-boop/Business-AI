# Corrected fictional revoke — bounded next acceptance (28 October 2026)

> **29 October 2026 update — historical plan, superseded exact bytes.** The proposed SHA256 `ffc2a2f67c54b901e05e0323402795ea7a501f3c65902ca1428653b8af8b530c` below was found to fail in native PostgreSQL 17.6 because its temporary grant did not explicitly specify `INHERIT FALSE`. It is **NOT executable or approved**. The corrected proposal is at commit `744bd1b9b23c753569720d685062ed462aa4212d`, SHA256 `1bfb70bc564989f529d4c9bb0c448dcba7dd666c3c5e31d8c26675554ba427d3`. Isolated native testing passed 22 focused checks; a new static regression test passed 3/3 and failed as expected on the old grant form. See [29 October evidence](NATIVE_CORRECTED_REVOKE_ACCEPTANCE_20261029.md). All real-business and live-revoke gates below remain pending; no live revoke has been approved or executed.

**State: proposal only. Secure real-business pilot NO-GO. No revoke/permission change approved or executed by this document.**

## Exact candidate to test

- Branch: `fix/colzo-pilot-release-gates-20261026`; commit `04bbaf589ed44d3150e8f230463d56f250616802`.
- File: `docs/colzo-pilot-review/ISOLATED_FIXTURE_REVOKE_20261028.CORRECTED.PROPOSED.sql`.
- Exact UTF-8 file SHA256: `ffc2a2f67c54b901e05e0323402795ea7a501f3c65902ca1428653b8af8b530c`.
- Historical revoke proposal is superseded. Do not execute it. No modification to the original grant script is implied.
- Project intended for *future separately authorised* action: Business-AI-Dev `mvwseobgkexzpmmkgcxe`, never Production.
- Existing synthetic fixture business: `433f135d-720f-4687-8114-3dffe7361675`; owner `b8cb079d-792e-4810-8218-0f9d442c521a`.
- Existing original demo business must remain active: `6da33602-1b8f-474d-84a6-e003d1c713fd`.
- All tests below must run against a disposable empty, local/socket-only PostgreSQL 17 environment, **not** the shared Development database. Do not use real Auth credentials, token material, customer records, or copies of private tenant data.

## Fresh read-only Development checks (not acceptance of execution)

The existing `revoke_access(uuid,uuid,text,text)` function is postgres-owned, SECURITY DEFINER, operator EXECUTE=true, authenticated/anon/service_role EXECUTE=false. The operator `postgres` membership currently consists of only one `supabase_admin`-granted row with ADMIN=true, INHERIT=false, SET=false. The fixture has one active pilot grant, one grant audit, zero revocation audits, and the intended request key is unused. Audit's required fields are typed request_key=text, business_id=uuid, actor=uuid, action=text, executed_by=name, result=jsonb. These are read-only observations; they do not authorize a live revoke.

## Native PG17 exact-byte acceptance matrix — NOT YET EXECUTED

Use the repository's existing disposable cluster bootstrap and `scripts/verify-colzo-pilot-postgres.py` patterns where applicable, but **do not count old grant/revoke results as testing this new file**. Build the synthetic role baseline with a NOSUPERUSER/CREATEROLE `postgres` actor and an original restricted membership granted by a distinct `supabase_admin`. Verify exact script SHA before execution.

1. **Preflight rejection:** wrong operator, wrong grantor, extra membership, effective SET/USAGE enabled, missing fixture active grant, reused request key, or pre-existing revocation audit must abort without changes. Preserve original demo grant and pre-existing audit.
2. **Forced-error atomic rollback:** inject a deliberate error immediately before COMMIT in a copy of the exact file, run as a *single atomic script* against the disposable cluster, and verify unchanged fixture/original grant rows, zero new audit, unchanged restricted original role membership, zero extra membership. Do not run statements separately in autocommit.
3. **Exact unmodified success:** execute the untouched file in the disposable cluster. Require one fictional grant transitioned to `revoked`, one matching `revoked` audit for the exact fixture/actor/request key with `executed_by='postgres'` and result.status `revoked`. Existing original grant unchanged. Exactly one `supabase_admin`-granted restricted operator membership remains, with effective SET/USAGE both false; no second postgres-granted row.
4. **Idempotent whole-file retry:** a second execution must fail at guarded preflight and preserve the completed revoke/audit/membership state without duplicate audit.
5. **Concurrent backends and isolation:** examine whether independent sessions can ever observe temporary role access or uncommitted revoke/audit state; test lock contention and forced rollback with separate PostgreSQL backends where the native runner supports it. Verify no privileges persist outside transaction.
6. **Blast radius:** compare synthetic table snapshots, grants, membership grants/grantors, function definitions/ACLs, table ACL/RLS settings, and original demonstration rows before/after. Only expected fixture revoke and its matching audit may change.

## Live acceptance sequencing — future, separate

- First: private owner-controlled MFA/AAL2 and two independently authenticated business sessions in the protected deployed Preview, including positive own-business API reads and negative foreign-business API reads. SQL role simulation is **not** a substitute for issued JWT/browser acceptance.
- Then: token/session replay, denied cross-business writes, retained-session expiry scenarios. Do not shorten the live 336-hour fixture grant to simulate expiry.
- Then: independently review the **exact final proposed file** and native evidence. Require fresh full Development preflight, transaction atomicity verification with the intended SQL Editor, and **new explicit approval quoting the final SHA256** before any Development operator/revoke transaction.
- After a separately approved live revoke: verify that the retained real fixture session loses protected API access, and only then document sign-off. Revocation is an audited lifecycle event, not cleanup or deletion.

## Execution limits / status

This continuation did not have PostgreSQL server binaries or package network access in its isolated compute environment, so native execution, forced rollback, concurrency, and end-to-end browser authentication **remain unverified**. Neither pilot grant was revoked. No GitHub merge, Preview deployment, Auth change, Production change, invitations, charges, SQL privilege changes or customer records were made.

