# Independent secure-pilot continuation — 29 October 2026

**Classification:** limited, genuinely executed read-only verification and reusable acceptance tooling. Existing fictional-data demonstration: **GO**. Secure real-business 14-day pilot: **NO-GO**. Production/public launch: **NO-GO**.

## Reconciliation

- PR #65 was open/draft at starting head `42e6504f7c401cd5018a76b8d478775a18114f08` and remained on `fix/colzo-pilot-release-gates-20261026`. This continuation adds documentation/testing tools only; deployed application code remains unchanged.
- Supabase project `mvwseobgkexzpmmkgcxe` identified independently as Business-AI-Dev, PostgreSQL 17.6, `ACTIVE_HEALTHY`.
- Vercel immutable Preview deployment `dpl_WFU7RH8EJWTX28Ej3zUVSEtrXgo4` independently returned `READY`, matching commit `adecce31b88f5c1ffd623480524996cb5ae91581` and the Colzo PR branch. This is hosting-state verification, **not** a new browser UI/session test.
- Existing QA recovery request, original-owner new-origin AAL2, expanded 50-category fixture export, earlier RLS simulations, isolated corrected revoke and 12 November natural-expiry follow-up were **retained, not re-executed**.

## New evidence from Development catalog

Read-only SQL checks found no granted exposed non-RLS ordinary table, no `anon`/`authenticated`-accessible noninvoker view and no exposed-schema callable `SECURITY DEFINER` function for those two roles. Six RLS/no-policy tables lack any of the eight effective role-specific DML permissions; see [exposure report](EXPOSED_PERMISSION_ACCEPTANCE_20261029.md) and [reusable query](EXPOSED_PERMISSION_CHECK_20261029.READONLY.sql). The private authenticated-callable `workspace_read_allowed` function uses a fixed empty search path and a signed-in identity/membership/recorded-grant predicate. These catalog checks do not prove real JWT/API authorization.

Fresh Supabase Security Advisors reported one remaining WARNING: leaked-password protection is disabled. No Auth setting was changed; separate exact Development Auth approval and risk assessment are required to enable it.

## New targeted deletion dependency inspection

A SELECT-only PostgreSQL foreign-key catalog query enumerated direct child references of `public.businesses`, `public.colzo_pilot_access` and `auth.users`. Counts are **constraints, not table counts**.

Direct references to `public.businesses`:
- 20 CASCADE constraints over 20 child tables.
- Four NO ACTION constraints (private audit, business settings, lead history, leads).
- 23 RESTRICT constraints across 23 tenant-keyed child tables, including bookings, actions, clients, quotes, lifecycle policy, billing and audit events.
- Two RESTRICT constraints on `public.business_referrals` lacking a business_id field; these are shared cross-business relationships.

**Total: 49 direct business foreign-key constraints (20 CASCADE, 4 NO ACTION, 25 RESTRICT).** `colzo_pilot_private.invitations` has one NO ACTION reference to `public.colzo_pilot_access`.

Direct `auth.users` references demonstrate why tenant deletion must **not** blindly delete the shared Auth user: user-global `customer_profiles` and `user_legal_acceptances` cascade on Auth user deletion, while other business-linked records have RESTRICT, SET NULL, NO ACTION and CASCADE dependencies.

Reproducible query: [DELETION_FK_DEPENDENCY_20261029.READONLY.sql](DELETION_FK_DEPENDENCY_20261029.READONLY.sql). Its individual catalog predicates were executed in a read-only rolled-back Development transaction; the committed combined file was written and read back but was not separately executed byte-for-byte. No live DELETE, restore, grant or role mutation was performed.

A real deletion implementation requires separately approved tenant-specific authority/retention decisions; child-table handling (including cascading, history/audit, referral and Auth-sharing semantics); Storage objects and backup copies; an isolated restore/simulation; and exact scoped shared-Development execution approval. Expiry is access restriction, **not** data deletion.

## Documented support-contact evidence

A read-only search of the existing connected Gmail mailbox found **eight inbox messages** whose recipient was the previously documented `support@getbusiness-ai.com`, most recently 25 October 2026. No message bodies, senders, subjects or IDs were copied to this document. This establishes **historical receipt in the connected mailbox**, not ownership, operational monitoring, recent delivery or a guaranteed response capability. No new test email was sent.

## Evidence and actions

Created and independently verified these files on the existing PR branch:
- `EXPOSED_PERMISSION_CHECK_20261029.READONLY.sql`
- `EXPOSED_PERMISSION_ACCEPTANCE_20261029.md`
- `DELETION_FK_DEPENDENCY_20261029.READONLY.sql`
- This report.

All new SQL findings were obtained with SELECT-only read-only transactions. This continuation did not clone/run the repository's full suite, because no application code was changed and earlier validated suites were retained. No full backup/restore or issued-JWT test was claimed.

## Final acceptance matrix

| Gate | Status | Basis |
| --- | --- | --- |
| Protected fictional-data demonstration | PASS (retained) | Existing Preview/deployment/browser evidence; fresh READY metadata |
| Source runtime/current PR separation | PASS | Fresh GitHub + Vercel metadata |
| Exposed database permissions and direct no-policy grants | PASS for bounded catalog check | Actual live Development read-only queries |
| Live independent QA sign-in, MFA/AAL2 and DPA | BLOCKED | Requires private legitimate QA recovery/login and owner acceptance |
| Foreign-ID read/write, raw JWT/business-ID replay | NOT RUN in this continuation | Session-safe real issued-JWT API facility and independent accounts required |
| Protected AAL1 denial/AAL2 mutation success | NOT RUN in this continuation | Genuine role-appropriate sessions necessary |
| Exact corrected live QA revoke/post-revoke access | BLOCKED | Separate approved exact transaction and prerequisite session checks |
| Natural unchanged 14-day live expiry | BLOCKED by time | Existing post-deadline 12 Nov check scheduled; not accelerated |
| Expanded fictional tenant JSON/CSV export | PASS (retained) | Prior 50-category/44 CSV acceptance; not full backup |
| Actual source/Auth/Storage restore | BLOCKED | Supported isolated backup/restore route and approval/access needed |
| Delete real/shared tenant safely | BLOCKED | Unresolved retention/authority and exact destructive-operation approval |
| Support route historical inbound mail | PASS for historical receipt only | Eight received inbox items; monitoring/current delivery unverified |
| Operator/legal/lifecycle decisions | BLOCKED | Exact operator, contact, retention and final document approvals missing |
| Password leak protection | WARN | Supabase advisor says disabled; no Auth modification authorised |

## Required next safe work

1. Once owner privately completes QA-specific password recovery, establish correct mapped QA sign-in and AAL2; obtain its normal DPA acceptance without bypassing authentication.
2. Using supported authenticated-session tools, complete actual two-business foreign-ID/API replay and protected-operation acceptance.
3. Re-preflight the final corrected revocation SQL hash and obtain **separate exact-byte owner approval** before any shared Development revoke.
4. Keep natural-expiry follow-up on 12 November, without changing timestamps or creating another reminder.
5. Prepare/approve verified operator/contact, data-return and retention decisions, genuine recovery and safely tested deletion handling before real activation.

The whole task is **not complete**; these remaining gates must not be marked green. No Production change, new deployment, Auth/grant/permission alteration, account creation, invitation, provider activation, charge or spend took place.
