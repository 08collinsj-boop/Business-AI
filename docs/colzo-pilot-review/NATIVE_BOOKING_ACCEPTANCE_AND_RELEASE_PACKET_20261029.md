# Native booking acceptance and exact next approvals — 29 October 2026

This supersedes the earlier unavailable-native-runtime blocker. No shared SQL, deployment, Auth setting, grant, record deletion or real invitation was executed by this continuation.

## Independently executed results

Exact tested head: **9630dbc9366ec81852c547e7f5e64ab9a246290a**.
GitHub Pilot Verification: https://github.com/08collinsj-boop/Business-AI/actions/runs/40965408178 — completed SUCCESS.
Independent complete job-log readback confirms:

- **17 native PostgreSQL 17 checks PASS** on isolated, synthetic, socket-only infrastructure.
- Non-superuser BYPASSRLS postgres owns the guarded tables/function, matching the relevant observed Development properties. Tables have RLS enabled; no managed source data or Auth state copied.
- Eight distinct backends were explicitly observed simultaneously waiting on the business transaction advisory lock. Releasing the barrier produced **one committed confirmation and seven SQLSTATE 23P01 rejections**; only one row persisted.
- Adjacent intervals accepted, legacy non-pilot overlap behavior retained, fixed-snapshot isolation rejected, forced transaction rollback preserved absence, request-to-confirmed overlap rejected, cancellation allowed.
- Direct client EXECUTE denied on the trigger function. Service-role writes still fired the restricted definer guard: overlapping confirmation rejected, non-conflicting confirmation accepted.
- **1,466 regression tests PASS**, zero failed/cancelled/skipped; React build PASS; static/secret/marker verification **373 JavaScript files**, zero inline scripts.

Readback evidence: native/final logs `log_zw9v1RCRlbZs`. Earlier simpler native run 40965123294 also passed 14 native checks plus the full suite; it is retained rather than counted again. CI uses the existing standard Ubuntu verification job, pinned npm PostgreSQL/pg packages, and temporary runner storage. It has no Supabase credential or outbound business-provider integration. No new service/project or paid runner was created.

## Fresh Development preflight, read-only

Business-AI-Dev: **mvwseobgkexzpmmkgcxe**, PostgreSQL **17.6**. Executed as supabase_read_only_user. Source report `log_o-a3OOwDbCVo`.

- bookings and colzo_pilot_access are postgres-owned, RLS enabled, FORCE RLS false.
- Actual postgres is non-superuser with BYPASSRLS true.
- Confirmed overlap pair count among pilot businesses: **zero** after prior fictional cancellations.
- Proposed function and trigger are both absent.
- QA grant remains active, original activation **2026-10-28 22:50:58.480174 UTC**, original expiry **2026-11-11 22:50:58.480174 UTC**. No change or premature revoke.

No table payload, password, token, factor material or Storage bytes exported by this preflight. It is not backup or live isolation acceptance.

## Approval A: install exact Development booking guard

File: [PILOT_BOOKING_OVERLAP_20261029.PROPOSED.sql](PILOT_BOOKING_OVERLAP_20261029.PROPOSED.sql).
Exact UTF-8 SHA256: **4dbfd4188ba042af0d704ed8bbeff0c576f031f7233ecdb33646f4816e879338**.
Target ONLY Business-AI-Dev **mvwseobgkexzpmmkgcxe**. Requires separate explicit approval.

Execute unchanged as one transaction through an existing authorised administrative facility as **current_user=postgres AND session_user=postgres**. The read-only connector is not suitable; do not change its permissions or bypass it. Freshly verify project, hash, existing object absence, table ownership and zero confirmed pilot overlaps before submission.

Changes: creates one SECURITY DEFINER trigger function with empty search_path, row_security=off and bounded lock timeout; revokes direct EXECUTE on that new function from PUBLIC/anon/authenticated/service_role; creates one BEFORE INSERT/UPDATE trigger on bookings. No new role or extension, no existing role membership changes, no grant/expiry edits and no row rewrite/deletion. One business is treated as one calendar resource for this scoped pilot. Non-pilot bookings keep existing behavior.

The transaction acquires table locks during preflight/installation (3-second lock timeout, 15-second statement timeout); it aborts rather than automatically repairing overlaps or overwriting an existing same-named object. Afterwards scheduling-changing confirmed writes for businesses listed in colzo_pilot_access serialize at the database and fail closed on overlapping intervals. Requests/cancellations and ordinary unchanged-schedule note edits retain their behavior.

Risk: shared Development schema is changed; a busy system can reject lock acquisition. Existing clients may initially display a generic failure until approved code deployment maps scheduling rejections to safe 409 messages. No real-business eligibility or Production change follows. After execution, read back function/trigger definitions, owner/ACL/settings, preserved grant dates and bounded record/audit metadata. Do not automatically retry uncertain writes.

Rollback: a separately reviewed and approved transaction may remove ONLY the exact newly installed trigger/function after checking their identity and definition. No CASCADE or data restoration is needed. Removing the guard reopens the observed defect, so rollback is not automatic. A transaction error during installation rolls back the new DDL automatically.

## Approval B: exact protected Preview code deployment

Deploy immutable Git SHA **9630dbc9366ec81852c547e7f5e64ab9a246290a** to existing Vercel project **prj_d5DuC65u4hSITFRC54ygswiMW9ST**, protected **Preview only**, with existing branch Development environment and SSO retained. Separate explicit deployment approval required.

Compared with currently deployed **547c1903ecd6fd37e1fadf2a48655af2a3aa676c**, exactly two application runtime files change: api/bookings.js (safe database-conflict/retry responses), assets/colzo-native.js (versioned explicit Knowledge accuracy confirmation). Other changes are tests, CI or documentation. Application code matches previously fully tested dafada2; the newer head adds native acceptance tooling. No migration is automatically executed by this deployment.

Preserve Development target, frontend/tenancy auth, scoped pilot access, disabled billing/paid voice/Meta/public/automatic publishing, secret values, seven legal settings and deployment protection. Do not change Production aliases, merge PR, invite/activate a real business or modify a grant. Read back exact deployed SHA, READY status and new immutable URL. Preserve current deployment dpl_CSB9HYBCGvrtJXX9xSiYcGia93GU / https://business-ff79ht5as-buisness-ai1.vercel.app/ as rollback reference.

After both A/B: retest fictional booking overlap denial and allowed adjacent confirmations; Knowledge review approval/persistence; ensure existing owner workflows and sign-out remain correct. Private sign-in may still be required. No live success is claimed until these retests execute. Rollback deployment is another explicitly approved release action; it is not authorised by this packet alone.

## Approval C: independent recovery Auth correction

Existing [RECOVERY_CURRENT_PREVIEW_APPROVAL_20261029.md](RECOVERY_CURRENT_PREVIEW_APPROVAL_20261029.md) remains separate. Exact JSON SHA256 **09020ea9585b225b92abe03e4a27ed709c597b08852d2b04232bca3a01419e14**, changing only Development site_url and preserving all 12 existing redirects while appending the current root/recovery URL.

If B creates another immutable origin, **do not apply this stale-origin packet automatically**: first prepare/read back a fresh exact Auth payload for the actual new origin and request that exact change. Existing password sign-in may proceed without a recovery redirect change. Do not send repeated recovery emails or replace the QA account.

## Gates and other unresolved work

Native concurrency is now PASS in its isolated scope. **G1/G6 remain FAIL live** until deployed fixes pass acceptance. G2/G3 remain BLOCKED by legitimate QA private sign-in/MFA/DPA and actual two-business issued-session checks. G4 awaits original natural expiry and separately approved non-conflicting revocation acceptance. G5 still requires real source/Auth/Storage recoverability. G7 still needs final support/lifecycle and named real-business approval.

Marketing draft denial was traced to deliberate scoped-pilot add-on exclusion in lib/addons.js and FEATURES in colzo-scoped-pilot.js. The intended Starter+Marketing offer needs an explicitly reviewed narrower feature scope; no existing blanket free-access flag should be enabled as a shortcut. Paid generation and public publishing stay disabled. This is not solved by A/B.

Fictional demo GO only for previously verified unaffected workflows. Complete booking/Knowledge demonstration and real-business pilot remain NO-GO pending live acceptance. No Production change, shared permission/grant write, deployment, activation, invitation or spend occurred in this continuation.
