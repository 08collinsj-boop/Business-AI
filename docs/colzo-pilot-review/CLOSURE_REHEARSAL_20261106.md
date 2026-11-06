# Isolated closure safety rehearsal — 6 November 2026

## Executed

Added scripts/rehearse-colzo-closure.mjs and its regression test. This creates a fresh in-memory PGlite PostgreSQL database only, accepts no connection string, and performs no network, Supabase, Auth-service, file-provider or Storage operations. Selected table definitions are read from repository migrations for businesses, memberships, leads/history, bookings/actions and Knowledge sources/items. Auth users and hold/outbox/grant/audit controls are explicitly synthetic fixtures, not a complete Supabase reconstruction.

Two fictional businesses share one synthetic identity. Six representative data tables contain dependent records for both. Twelve checks cover tenant-bound synthetic return data; return checksum; rejection of a cross-business compound-FK link; rollback after forced mid-operation failure; no file task or success audit on failure; hold refusal; rollback for an uncovered restrictive dependent table; all targeted data removed on success; other business unchanged; shared Auth identity retained; original synthetic grants unchanged; and external file work queued only after committed database changes. The outbox contains only the target business's synthetic file reference. No file bytes or Auth accounts are deleted. No real account or shared Development records were used.

This is new closure workflow preparation, not a repeat of the earlier backup reconstruction or serializer-only rehearsal. The procedure is NOT a deployed closure endpoint, not permission to run live deletion and not full account-exit acceptance. No automatic deletion on expiry is promised.

## Fresh metadata dependency scope

Read-only Development catalog query found 77 foreign-key edges and 50 referencing tables whose parent is a business or public business_id-scoped table. This extends beyond the 47 direct public business_id export tables. In particular:

- colzo_pilot_private.audit restricts business deletion.
- colzo_pilot_private.invitations references colzo_pilot_access.
- business_referrals has relationships across business identities and requires separate treatment.
- Numerous public operational, legal/audit, billing and provider-reference rows restrict parent deletion.

No row contents, private invitation tokens, identifiers of participants, Auth credentials or Storage bytes were retrieved. This metadata prevents falsely equating a 47-table export inventory with an erasure plan.

## Operational procedure still requiring completion

1. Verify the requestor and business authority through an authenticated account. Do not treat a support email alone as authority.
2. Agree category-specific return instructions, retention/holds, shared-account handling and permitted recipients; do not invent deadlines or legal acceptance.
3. Generate and independently verify a complete permitted return manifest, including separately authorised source-file bytes. Existing offline exporter excludes Auth/Storage/provider secrets and is not this complete return.
4. Review the full dependency graph and a recoverable, business-specific execution package before live erasure. Preserve original acceptance fixtures and grants during pilot QA.
5. Rehearse the exact package against an adequate isolated schema; verify transaction rollback, other-tenant preservation and all dependent categories. The six-table rehearsal here is one prerequisite only.
6. Perform external file/provider/Auth steps with explicit authorisation, idempotent work tracking, verification and disclosed exceptions. Database rollback cannot undo external erasure. The synthetic outbox here is not a worker or proof those external steps work.
7. Verify remaining access, scoped data counts, exceptions and return/deletion confirmation without exposing customer/account data in GitHub. Do not claim completion from a requested or queued action.

Privileged live SQL, real account deletion, Storage erasure, production changes, participant consent and public activation remain separately gated. QA MFA remains deferred by owner instruction. Pilot NO-GO.
