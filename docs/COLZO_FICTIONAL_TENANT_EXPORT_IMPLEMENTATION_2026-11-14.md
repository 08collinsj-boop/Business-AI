# Colzo — fictional tenant draft export implementation (NOT activated)
**Date:** 14 November 2026 (UK) | **Draft PR:** #77 | **External pilot:** NO-GO

## Deliverable and exact boundary

A **read-only, partial, feature-flagged JSON draft export** now exists in source. It is NOT enabled in the hosted Development Preview, cannot be used as a complete customer return/deletion service, and does not authorise any irreversible operation.

- `lib/colzo-tenant-export-engine.js` defines 32 explicit dataset/field selections and `collectDraftTenantExport`.
- `lib/colzo-tenant-export-handler.js` enforces method, environment, owner membership, MFA/AAL2, exact fictional tenant, audit and response controls.
- The existing `api/operations.js` dispatcher and `vercel.json` routing support `GET /api/tenant-draft-export`, which responds **503** until specifically configured. No new serverless function was introduced.
- `planTenantDeletion` is **non-executable**, always reports `executable:false` and `deletion_performed:false`. The endpoint rejects DELETE/POST/PATCH.

## Exported (allowlisted) classes, not a full data exit

`leads`, `lead_history`, `bookings`, `actions`, `colzo_clients`, `colzo_projects`, `colzo_quotes`, `business_settings`, `business_knowledge_sources`, `business_knowledge_items`, `marketing_generations`, `marketing_publications`, `marketing_schedules`, `marketing_images`.

**18 additional Development schema-verified tables:** `business_configurations`, `business_public_routes`, `business_data_lifecycle_policies`, `business_team_invitations`, `lead_handovers`, `business_legal_acceptances`, `marketing_image_usage_events`, `marketing_automation_media`, `marketing_automation_settings`, `marketing_strategy_settings`, `business_incident_controls`, `business_referral_profiles`, `business_feature_entitlements`, `customer_complaints`, `pilot_feedback`, `review_email_outbox`, `voice_calls` and `voice_call_events`.

**Read-only live schema check (14 Nov):** all 18 tables exist and the selected primary keys match the Development PostgreSQL catalog; all **32** class field projections match actual column names (zero unknown fields). A schema check is not proof of real API grants, successful requests or complete customer exit. The new reader rejects unknown table names, altered field projections, foreign business identifiers, unapproved sort keys and out-of-bounds pagination before sending a request.

All 32 query only explicitly chosen columns and a server-verified `business_id`, sorted by their actual primary keys: normally `id`, or `business_id`, or the compound `(business_id, feature_key)` as appropriate. Pagination uses 200-row pages and probes the next page after exact multiples of 200. The engine fails rather than silently truncating beyond 5,000 rows per table, 9,000 total rows, 2 MB of selected row JSON or a failed DB request. Rows are checked for tenant scope, duplicate IDs and unexpected fields.

**Caveat:** offset paging is NOT a stable transaction/snapshot if source data change concurrently; the JSON explicitly marks `snapshot_consistent:false`. It is NOT a legal full-business export, even when all 32 categories return.

The result always includes `export_complete:false`, `deletion_authorised:false`, the omitted public-table inventory and all outstanding non-public domains. Storage paths in source/marketing metadata are **not** Storage object bytes. It excludes direct raw OAuth tokens, provider credentials, Stripe events, shared Auth identities, Vault and platform-global data. Additional data classifications and redactions remain necessary.

## Disabled-by-default security gating

The handler only proceeds if **all** are true:
- `COLZO_TENANT_EXPORT_PREVIEW_ENABLED=true` — **not set here**;
- `COLZO_SCOPED_PILOT_ACCESS=true` and `TENANCY_AUTH_ENABLED=true`;
- Vercel environment is `preview`, git branch is exactly `feature/colzo-connected-workspace-20261112`;
- Supabase URL is exactly `https://mvwseobgkexzpmmkgcxe.supabase.co`;
- `COLZO_TENANT_EXPORT_FIXTURE_BUSINESS_ID` is a valid, separately authorised fictional business UUID — **not set here**;
- `isApprovedSupabaseTarget()` passes;
- authenticated user is an **owner** with verified **AAL2** and belongs to that exact fictional business.

Caller-provided `business_id` is rejected, and output is no-store. An audit event must succeed before any data is returned. Errors expose no partial dataset payload. The endpoint cannot run against Production under these gates. **Enabling this capability later requires separate approval, bounded fictional data, a protected Preview and live acceptance evidence.** Do not change env settings based solely on this code.

## Verification and provenance

- Focused local Node 22 tests: **27/27 passing** (15 existing cases plus 12 new expansion/reader cases), run with isolated test stubs for auth/audit/public-config imports, and real source/test bytes (but without a full repository checkout); tested source and test file bytes verified against Git blob hashes on the draft branch.
- Previous zero-record-ID test red/green evidence is retained. The new expansion test suite first failed on absent id-less and composite-key support; the reader test first failed on hard-coded `id.asc` and unchecked query parameters, then both passed after fixes.
- Tests cover fictional pagination (421 records), boundary continuation, denied foreign tenant records, duplicate IDs, unexpected secret columns, fetch failure and row caps; inert deletion; disabled/prod/branch/env gates; GET-only; ignored user tenant switching; owner/MFA requirements; audit-fail denial and no-store.
- **Not yet verified:** real signed-in Preview browser, current exact full repository CI suite/build, actual provider Data API behaviour, real 32-class export, output download, Storage/Auth and complete data return. The sandbox uses fixture dependencies to exercise handler logic; it is not a claim that real Auth/AAL2 already passed in this route.

## Explicitly omitted public categories and separate safeguards

The **21 intentionally omitted** public tables remain visible in the JSON `omitted_public_tables` manifest. They include business membership/shared user controls, raw provider OAuth state/credentials, financial Stripe event metadata, full audit/legal-hold-sensitive records, cross-business referrals, global platform configuration and other records requiring special tenant ownership review. Their omission is a known limitation, **not** proof they are irrelevant or fully exported. No source or project database schema was altered.

## Later acceptance, after recovery work is resumed

1. Independently verify and receipt the real Development database + Auth/MFA + Vault + Storage object-byte restore, with rollback owner. Existing encrypted Chromebook/USB archive integrity does not satisfy recovery.
2. Obtain explicit permission for a bounded fictional workspace identity, branch-only Preview configuration and private export handling.
3. Run owner AAL2 GET, member/admin/foreign tenant denial, provider/DB failures, audit outcomes, pagination, excessive-size/timeout and browser download acceptance in protected Preview.
4. Expand legitimate tenant export to every required business category (53-table scope ledger and non-public domains); implement real Storage byte return, legal exceptions, shared identities, secure delivery and independent reconciliation with snapshot consistency.
5. Implement actual transactional or failure-safe deletion with **separate destructive authority** and isolated fictional test, ensuring no other business/shared Auth records are affected. Approval must not be inferred from enabling draft export.

**No live data was read/exported/deleted, no SQL, grants, secrets, configuration, Production, billing or pilot activation changed as part of this work.** PR #76/#77 stay draft/unmerged. **NO-GO.**
