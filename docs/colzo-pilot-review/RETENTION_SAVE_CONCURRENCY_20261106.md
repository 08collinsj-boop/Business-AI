# Retention policy stale-save correction — 6 November 2026

## Defect and correction

Source review found retention-policy PATCH did not require the version loaded by the owner. Two sessions could overwrite each other while both received success. A regression first reproduced the missing guard: a versionless PATCH returned HTTP200 instead of HTTP400.

For existing Colzo Development Preview version-enforcement scope only, the server now requires a valid exact expected_updated_at, includes it together with business_id in the atomic database PATCH filter, generates a newer version, and verifies the returned tenant/fields/version. A stale or absent row returns HTTP409 and emits no success audit. GET refuses malformed version metadata in this strict scope. Legacy/Production mode preserves existing semantics.

The form sends the exact loaded timestamp (including microsecond text), refuses to save before a policy is loaded, retains edits on failure and displays no false success. This fixes save integrity; it does not select retention periods, introduce automatic erasure or approve an operator policy.

## Verification

An isolated PGlite PostgreSQL fixture exercised two simultaneous handler requests against the same row/version: one HTTP200, one HTTP409, one success audit. Missing/malformed versions perform no writes; a later stale request is also rejected. No Supabase role simulation is claimed as live authentication acceptance. Two frontend regressions verify exact version transport, missing-version refusal, retained inputs and absent success after conflict. Existing lifecycle confirmation tests remain applicable. Full results and exact-source CI are recorded in PR comments.

No live retention policy, tenant record, grant, Auth configuration, SQL schema, permission, payment/provider setting or Production deployment is changed by tests. Essential protected Development code deployment is authorised, but live owner AAL2 save verification remains pending while QA MFA is deferred. No live policy write is necessary merely to publish the fix. Pilot remains NO-GO.
