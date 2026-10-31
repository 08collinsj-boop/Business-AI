# Fictional customer export rehearsal and remaining decisions — 29 October 2026

**Pilot remains NO-GO. This is a bounded operator-side rehearsal, not a shipped self-service export or complete business export/deletion acceptance.**

## Executed evidence

Ran the accompanying exact SELECT-only SQL against Business-AI-Dev mvwseobgkexzpmmkgcxe using read_only=true. Verified the existing QA owner/email/business mapping before returning the one explicitly named fictional customer. Exported only ID/business ID, name, empty email/phone, fictional notes and timestamps. No Auth/session/token/password fields or original-business rows were exported.

Evidence log_x8FSHcmEuTvq. Mapping matched. Workload counts:
- colzo_clients: 1
- colzo_projects, colzo_quotes, leads, lead_history, bookings, actions, business_knowledge_sources, business_knowledge_items, marketing_generations: all 0 for this QA business.

The isolated Python serializer accepted exactly this fixture, rejected unexpected columns/scope, checked empty contacts and the accepted Tab B marker, guarded leading spreadsheet formula characters, encoded fully quoted UTF-8 CSV (with BOM) and UTF-8 JSON, read both formats back through independent standard-library parsers and compared every field with the source row. Byte write/readback also matched.

| File | Rows | Bytes | SHA256 |
| --- | --- | --- | --- |
| customers.csv | 1 | 413 | b7e71ceb5f8c962089eff07ff6a560799681931e73553155812b13071ff99ac9 |
| customers.json | 1 | 467 | 798dc3a2a157f0448db87fdb382b238cf6b13ab968612a3a65418ece6949aa41 |

Only the fictional row was used. Temporary serialized bytes are not a hosted backup or an approved customer delivery. No database rows/settings/permissions were modified, and no export was sent to another person. Existing passing tests were not rerun.

## Deletion boundary

The exact customer/tenant match identifies one fictional target for a **scope preview only**. No DELETE statement was prepared, applied or tested. The customer API deliberately does not implement DELETE. An operator deletion procedure still needs dependent-data/audit/backup handling, separately scoped approval and tested verification. Do not call this a successful deletion or promise that expiry deletes records.

## Concrete proposed data-return workflow — NOT approved/published

For owner review:
1. Accept the request only from the verified business owner; verify authority using the normal authenticated account and an established contact route.
2. Produce a tenant-scoped JSON export and a spreadsheet-safe CSV for tabular records, with a manifest of included/excluded categories and row counts.
3. Check every included row's tenant, cover related records and configuration explicitly, exclude credentials/secrets and clearly document necessary audit/billing/third-party omissions.
4. Deliver through an approved private channel after recipient verification. No private delivery or new sharing permissions are configured by this proposal.
5. Do not assign a retention/deletion deadline or backup promise until the owner selects the policy and the corresponding operational process is tested. This avoids inventing an unimplemented automatic deletion schedule.

These are operational proposals, not legal advice or final participation terms. The rehearsal above covers only the one fictional customer, not all five workflow steps or other data categories.

## Vital facts/authority still missing

The public identity endpoint was last actually checked in this conversation and returned identity_configured=false with blank operator/trading/type/address/email/phone fields. The candidate identity **James Collins trading as Colzo, sole trader** can be offered for owner confirmation from existing context; it is not permission to publish personal details.

Before real-business processing, obtain:
- explicit approval of the exact public operator/trading identity and business type;
- exact service/geographic address and approval to publish it;
- exact monitored support email/phone and delivery verification;
- an agreed post-pilot data return/retention/deletion policy and accurate backup limitation;
- final terms/privacy/DPA/addendum consistency and the real business's authority/acceptance.

## Technical acceptance still open

Original-owner AAL2 is now verified (ORIGINAL_OWNER_AAL2_ACCEPTANCE_20261029.md). QA MFA remains deferred. Current browser document advertises **no WebMCP tools**, so no secure authenticated arbitrary-API replay facility was available. No token extraction or administrative impersonation was used as a substitute.

Raw foreign-ID/business-ID API read/write/replay, AAL1-denial/AAL2-protected-action acceptance, live post-revoke denial and true live expiry remain incomplete. Current grants expire on 10/11 November and were not shortened. Live corrected revoke still requires prerequisites, fresh preflight and separate exact-byte approval; current SQL SHA256 remains 1bfb70bc564989f529d4c9bb0c448dcba7dd666c3c5e31d8c26675554ba427d3.

No merge, deployment, Production/Auth/permission/billing/provider changes, invitation, real pilot activation, contact transmission or charge.
