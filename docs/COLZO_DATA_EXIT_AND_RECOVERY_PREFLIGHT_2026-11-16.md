# COLZO — data return, retention and safe deletion preparation
**Internal operator runbook; unexecuted. 16 November 2026.** No SQL deletion, real export, new grants, policy publication or customer-facing certification is authorised by this document.

## Current known constraints
- `lib/colzo-data-exit-coverage.js` tracks **53** public table cases; current fictional draft export allowlists **40** and **defers 13**. Every exclusion must remain recorded; do not claim complete data return.
- Draft package and Storage manifest are **partial**: Storage references are not file bytes or signed download links. Non-public Auth, MFA, Storage metadata/bytes, Vault, provider accounts, shared-user relations and operational audit retention require separate treatment.
- The operator's Chromebook-related independent Development backup/restore work is **deferred**. Isolated CI PostgreSQL restore proves mechanics on disposable data only.
- `makeInertDeletionReview` is deliberately non-executable; do not mutate it into a live erasure path before an approved scoped design and restore receipt.

## Preflight checklist — no deletion or Production access
1. **Confirm legal controller/processor roles:** exact customer controller instruction, data categories, approved legal/privacy/DPA version, retention exceptions and authorised operator; customer consent/contract receipt stored privately.
2. **Establish exact scope:** identify the approved business UUID privately; map all 53 public table categories, indirect/shared tables, non-public Auth/MFA and Storage/provider assets. Block any unknown schema object or foreign tenant record.
3. **Freeze changes and reconcile:** approve a written maintenance window and point-in-time strategy. The current two-read draft reconciliation is **not** a transactionally consistent snapshot. Record count/hash/snapshot approach and handling for concurrent writes; no full-data-return claim until proved.
4. **Rehearse only with synthetic data:** run isolated source, SQL, and export-packager tests. Verify no credentials or excluded classes enter the ZIP/gzip. Use a different synthetic business to prove cross-tenant exclusion. The package must state PARTIAL and require independent recovery.
5. **Prepare encrypted backup and independent restoration:** preserve schema, actual rows, Auth/MFA, Storage object bytes and encryption key custody; independently restore into a separate controlled target. Inspect permissions, checksums, referential integrity and redacted evidence. Do not record private keys/passphrases in the repository.
6. **Plan return separately from deletion:** secure owner-authenticated delivery, integrity hashes, recipient confirmation, time-limited link, failure and retry process. Draft export `data_exit.draft_export` audit is not a receipt for a complete customer return.
7. **Deletion only after explicit approval:** dual-check operator/legal sign-off; idempotent transaction/batch plan covering foreign keys, references/shared users, Storage, external tools and allowed retention holds. Deletion must fail closed on a missing receipt or ambiguous tenant. **No executable SQL or deletion automation is included here.**
8. **Verify residuals and issue receipts:** counts and checksums before/after, relevant Auth/Storage/provider revoke confirmations, permitted audit/legal holds and customer acknowledgement. Avoid exposing personal data in public issue comments.

## Evidence register (all currently unverified unless linked privately)
| Evidence | Owner | Acceptance receipt | Current |
| --- | --- | --- | --- |
| Complete 53-table plus Auth/MFA/Storage/Vault/provider inventory | Operator + engineering | Versioned signed map | OPEN |
| Exact scope and data-controller instruction | Pilot customer/controller | Signed private authorisation | OPEN |
| Full consistent return and safe delivery | Engineering + operator | Encryption, checksum and receipt | OPEN |
| Independent Development DB/Auth/MFA/Storage restore | Recovery operator | Isolation, restore logs and rollback | DEFERRED / OPEN |
| Deletion safety and holds review | Legal + operator | Approved design and negative tests | OPEN |
| Erasure, provider revoke and residual verification | Recovery/operator | Secret-free receipts | NOT EXECUTED |

## Operator decision
External live-customer pilot remains **NO-GO** until compliant data exit and disaster recovery are independently evidenced and authorised. Do not treat a fictional gzip, a synthetic fixture or a test pass as real data-return capability.
