# Colzo tenant data exit — source-backed coverage map and fail-closed evidence contract

**Prepared:** 14 November 2026 | **Status:** INTERNAL engineering/QA preparation; **not an implemented full export or erasure service** | **External pilot: NO-GO**

Source: read-only inspection of Development Supabase `mvwseobgkexzpmmkgcxe` via `list_tables(verbose=true)` on 14 November 2026. Only table names and structural business-key categories were used; no customer data or credentials are included. **Reconcile against current live schema before any real tenant-exit rehearsal.**

## What was actually implemented in this branch

- `lib/colzo-data-exit-coverage.js` contains a snapshot of **53 public tables**: **47** with a `business_id` column and **six special/global relationship cases**. This is **NOT** a data-exporter, deletion script, endpoint, or database query.
- Its `assessDataExitEvidence` pure function returns missing table/domain/control receipts, blocks unknown categories and never returns `pilotApproved: true`. `readyForHumanReview` only measures **documentation completeness**, not independent truth, runtime acceptance, or permission to delete.
- `tests/colzo-data-exit-coverage.test.mjs` contains seven focused tests (isolated local Node run: **7/7 pass**, after an observed failing unknown-category test was corrected). **Full-repository tests, deployment and live-browser acceptance are not asserted by these local checks.**

## Public table relationship cases requiring separate attention

The 47 directly business-keyed tables include leads/history, bookings, actions, membership/invitations, settings/routes, business audit, Knowledge sources/items, marketing and OAuth records, billing/entitlements, voice, projects/quotes/clients, feedback and pilot access. The exact list is in the module.

The six special cases are:

| Table | Relationship / closure risk |
| --- | --- |
| `businesses` | Tenant primary key is `id`, not `business_id`; dependent references must be understood |
| `business_referrals` | Two parties: `referrer_business_id` and `referred_business_id`; preserve other businesses' records |
| `user_legal_acceptances` | Linked to user rather than one business; may need legal retention |
| `customer_profiles` | Shared user profile may be used by more than one business |
| `platform_incident_controls` | Global platform control; require a documented non-tenant exclusion |
| `pilot_free_access_config` | Global pilot configuration; require a documented non-tenant exclusion |

A `business_id` column alone does **not** entitle a business to raw sensitive/third-party/secret data. Review columns, tenant ownership, legal holds, and account sharing. Never include provider tokens, encrypted credential material or service-role keys in customer exports.

## Seven non-public areas that a 'full business export' must not silently omit

1. Private audit schemas, retention and statutory exception decisions.
2. Auth users and actual MFA state, including shared-user preservation.
3. Auth sessions and refresh-token invalidation, including revocation/expiry evidence.
4. Storage object metadata **and actual downloaded object bytes**, including Knowledge/media, orphaned files and mapping to buckets.
5. Vault and encrypted provider credentials, handled by secure revocation rather than plain-text export.
6. External provider records and OAuth connection/revocation, recognising that disconnecting Colzo does not delete third-party tasks.
7. Backups, expiry, legal holds and data-restoration implications.

## Nine mandatory operating receipts

The review contract explicitly requires evidence for: controller instruction; owner/tenant isolation; scoped inventory and secret redaction; complete export **and secure customer delivery**; independent compatible recovery and rollback; shared identity preservation; approved deletion execution and partial-failure behaviour; independent post-exit verification; and operator/independent-reviewer approval.

Missing, malformed or unreviewed receipts keep the readiness indicator **false**. The indicator cannot itself grant pilot GO.

## Safe staged implementation — future engineering, NOT performed by this change

1. Design a **read-only, owner-authorised and tenant-scoped** complete inventory/export using snapshot/pagination, response-size controls, cross-tenant negative tests, per-class redaction, secure delivery and audit. Prevent silent truncation at PostgREST page limits.
2. Verify an independent **Development** database + Auth/MFA/Vault + Storage byte restore and actual rollback authority. Encrypted source backup integrity and USB checks are necessary but **not sufficient**.
3. Only with separately documented destructive-change authorisation, an isolated fictional tenant and independent reviewer: design transactional or fail-safe tenant deletion with documented legal/audit/billing holds, shared Auth user preservation, Storage object deletion, provider revocation, retry behaviour and tenant-isolation validation.
4. Demonstrate export/download/readback, deletion with exceptions, attempted stale-session access, foreign-tenant preservation, provider-side state and secure final receipt. Publish no deletion promises before this passes.

## Existing application boundary to preserve

- `lib/data-subjects-handler.js`: owner-authenticated `GET` exports **one lead** with verified same-business lead history, bookings and actions; scoped-pilot `DELETE` intentionally returns **HTTP 503**. The legacy non-scoped anonymisation uses four non-atomic PATCHes and is **not** complete tenant closure.
- `lib/data-lifecycle-handler.js`: manages configured retention **review settings**, not an automatic deletion worker. Privacy's 365/730-day review defaults are **not** erasure guarantees.
- No deletion, export, live database mutation, new grant, SQL migration, Production/Stripe/billing or public legal publication occurred during this work.

**Release:** external pilot NO-GO. This contract prevents paperwork omissions; actual secure data-exit functionality, independent recovery, real role/mobile acceptance and legal/operator sign-off remain open.
