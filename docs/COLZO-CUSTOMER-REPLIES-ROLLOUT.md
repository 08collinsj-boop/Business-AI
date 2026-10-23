# Colzo customer reply feature - controlled rollout gate

**Status (23 October 2026): DRAFT ONLY. Do not merge, apply migrations to shared Dev, or enable the feature yet.**

Scope: Draft PR #60 on `feature/colzo-customer-replies-secure-20261023`, stacked on #59 / #58 / #57. This rollout is explicitly **not** a Production release.

## Verified state

- Supabase Dev project `mvwseobgkexzpmmkgcxe` has `public.leads.updated_at`, `colzo_lead_write_version` trigger, and `customer_enquiry_access`.
- The `20261019162954` lead-version migration is not recorded in Dev migration history even though the equivalent trigger exists. **Do not replay this migration just to fill the ledger.** Investigate and reconcile history separately.
- `public.customer_visible_replies` and its `20261023103000` migration are **absent** from the connected Dev project.
- Dev's Supabase backup listing reports zero available backups and PITR disabled. It is not currently safe to treat this shared project as disposable.
- The linked repo contains an isolated in-memory PGlite migration rehearsal test; it is **not** a restorable backup of the shared Dev project.

## Immediate safety switch

The reply endpoints and customer portal history are opt-in only when the server environment contains exactly `COLZO_CUSTOMER_REPLIES_ENABLED=true`. Default/unset/other values are disabled. When disabled:

- Reply API fails closed, without querying the unavailable reply table.
- The existing signed-in customer portal still loads enquiries without querying the new reply table.
- Business and customer sessions retain their existing authentication and tenant checks.

**Do not enable this variable in Production.** Do not enable it in Preview until the migration and authenticated end-to-end acceptance have passed.

## Prerequisites before changing the shared Dev database

1. Establish a recoverable **private** backup, with actual restore verification on a separate throwaway instance. On Supabase Free, managed backups and PITR are not included. Refer to https://supabase.com/docs/guides/platform/backups and the official CLI backup/restore guide.
2. Use a trusted local computer (Docker + Supabase CLI where supported). Keep exports **outside** the Git repository and encrypt at rest. Never paste the database password, connection string, dump contents, auth tokens or recovery codes into ChatGPT or an issue/PR. `supabase db dump` supports separate roles, schema and data exports. **Schema-only is not a backup of customer records.**
3. Supabase CLI logical dump excludes some managed schemas (including Auth/Storage in standard workflows). Storage object bytes and external secrets/configuration require a separate inventory/backup plan. Do not claim that a SQL export alone is a complete disaster-recovery backup.
4. Restore the required data into an isolated PostgreSQL/Supabase test target and confirm that an actual representative read works and access controls are preserved. A file existing on disk is not a verified restore.
5. Reconcile the Dev migration-history drift. Never run `supabase db reset --linked`; never bulk `db push` without inspecting the exact pending migrations and their effects. Keep Production untouched.

## Migration acceptance, after the backup requirement

- Review the **exact** SQL from `supabase/migrations/20261023103000_colzo_customer_visible_replies.sql`.
- Apply only to an isolated test project first; verify DDL succeeds, reruns safely, creates no synthetic customer data in shared Dev, preserves existing leads and checks RLS/grants.
- Apply to shared Development only when its backup/restore is verified and release authorisation is recorded. This is a separate action from merging code.
- Verify that direct `anon`/`authenticated` SQL privileges remain denied, owner reply writes are tenant-scoped, unlinked enquiries cannot claim delivery, and customers cannot read another enquiry.
- Check unique `business_id,request_id` idempotency with two simultaneous retries, and verify the draft text matches the saved server row before claiming success.
- Test with **two independent synthetic accounts** in isolated browser sessions: business writes, linked customer reads, unrelated customer cannot read, stale logins and network failures do not reveal data.
- Only then set `COLZO_CUSTOMER_REPLIES_ENABLED=true` on the approved **Preview** environment, test again, and document the exact commit, migration version and URL. No real customer notifications are sent.

## Rollback

For any unexpected issue, first return `COLZO_CUSTOMER_REPLIES_ENABLED` to disabled for the affected **Preview** environment and retest the original customer portal. Do not drop the reply table or destroy saved replies to roll back a UI problem. Database rollback requires a separate data-preserving plan and confirmed recovery point. No Production toggle or migration is authorised by this document.

## Work/browser acceptance vs automated checks

GitHub CI and PGlite prove code and synthetic SQL behaviour, not real authentication, mobile rendering, MFA, delivery to another browser session, or backups. Live browser testing is a separate, required release gate. For the iPhone check, verify Safari scrolling, keyboard focus, text wrapping, form confirmation and reduced motion.

## Charging and customer data

No paid Supabase upgrades, new paid projects, Production deploys, customer emails, notification sends, DNS changes, or real customer record mutations without explicit prior approval.
