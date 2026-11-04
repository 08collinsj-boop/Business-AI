# Expanded fictional tenant export acceptance — 29 October 2026

**Operator-side read-only rehearsal passed for the existing QA fixture. Secure real-business pilot remains NO-GO. This is not a database/Auth/Storage backup or a shipped self-service export.**

## Scope and executed result

Business-AI-Dev mvwseobgkexzpmmkgcxe. Exact fixture 433f135d-720f-4687-8114-3dffe7361675, name QA Example Garden B — TEST ONLY, sole owner b8cb079d-792e-4810-8218-0f9d442c521a and approved email checked in the SELECT itself. No new fixture, shared write, permissions, role simulation or token extraction.

Catalog inspection found 47 public relations with business_id. The query covers those plus the exact business record, QA user's legal acceptances and count-only shared referrals: **50 categories**. **44 data categories, six count-only categories, 28 data rows.** Populated data: audit events 16; user legal acceptances 3; one each configuration, lifecycle policy, membership, public route, referral profile, settings, business, customer and pilot grant. All other categories zero.

Count-only tables: marketing_meta_connections, marketing_meta_oauth_states, marketing_social_accounts, public_enquiry_rate_limit_buckets, voice_provider_connections and shared_referrals. All six counts were zero. Their rows, encrypted tokens, OAuth state hashes, fingerprints and webhook-secret references were never selected. Auth users/identities/passwords/sessions/factors, private pilot data, platform configuration and Storage bytes are excluded. The fixture has no knowledge/marketing object references; a prefix-only Storage metadata inspection returned zero objects. This does not prove the absence of orphaned objects under other paths.

Global tables are excluded. customer_profiles is user-global and excluded; this fixture has zero customer_enquiry_access/customer_complaints rows. Shared cross-business referrals are counts only to avoid returning another tenant's identifiers.

## Meaningful validation executed

- Serializer accepts exact fixture envelope/table/column coverage and rejects foreign tenant/business/user rows, unknown/missing categories, unexpected password fields, restricted-table payloads, nested token fields, mismatched/negative/boolean row counts.
- **12 negative cases passed**, using a disposable synthetic foreign UUID in memory; no live foreign-record mutations.
- **7 spreadsheet-formula cases passed**.
- Complete JSON independently parsed and compared to the source payload. **44 CSV files** parsed independently and each header/encoded cell compared to the source. CSV contains display-safe representations, not a lossless database import; JSON preserves typed nested values.
- JSON: 18,836 bytes, SHA256 935ce23e67479f38ee18bfd4373f689a10948c017c224b5f732871d0159b88fc. Actual row content remains private and is not committed.
- SQL UTF-8 SHA256 be68073d21c7bef0c90f7712580fa68ff434524668e1911a2420f838f3a2e2f3. Serializer SHA256 735109ab4062c8f9e93b8def592fe12e305ea08dd3a98798ac4f0d53276ae2f3.
- Source SELECT evidence log_x8BItKXonk39; final independent-process validation log_Vc_LoOYkfIcZ.

The initial preparatory identifier check rejected digits in e164_number/sha256 before any query; corrected to ordinary SQL identifier rules. Initial in-notebook negative mutation was not credited when it failed to exercise a changed row. Switched to a separate Python process with serialized candidate-change checks. Its boolean-count assertion initially used Python's False==0 equality, so corrected the test's change detector to canonical JSON. Final cases above actually passed; no application/runtime defect is claimed.

## Reproducible review tools

- QA_TENANT_EXPORT_20261029.READONLY.sql: SELECT-only and exact fixture-bound. Run only against the named Development project with a read-only executor; wrong mapping returns an error envelope.
- qa_export_serializer_20261029.py: no network/database access; validates and serializes a privately supplied query result. Includes an explicit exclusion manifest and file SHA256s.
- verify_qa_export_20261029.py: focused acceptance consuming that private input, with no service calls.

These are acceptance tools, not added application features. No application code changed, so no broad JS suite/build repeated.

## Deletion and recovery boundaries

No live DELETE was prepared or executed. Catalog confirms mixed RESTRICT/CASCADE dependencies, multi-tenant composite foreign keys, shared referral links and Auth-linked global legal/customer records. A safe deletion implementation must handle these explicitly, preserve other businesses and audit obligations, address Storage/provider/backup copies and execute only a separately reviewed/approved exact target plan. Expiry/revocation is access control, not deletion.

No full actual-source restore demonstrated. Current backup API reports zero listed backups and PITR disabled; walg_enabled alone is not a verified recovery path. No native postgres/initdb/pg_ctl/psql binaries are available in this continuation's disposable compute. Existing passing synthetic/native tests are retained, not rerun or reclassified. Full recovery requires an authorized backup route covering schema/data, Auth, Storage bytes and essential configuration, and an isolated restore; no paid upgrade or credential reset was used.

## Other current blockers

Private sign-in to the branch alias reached the pilot-approval denial. Bounded read-only metadata classifies the supplied credentials as another existing Development account, with one membership, rather than either approved test owner. QA's last-sign-in/session/factor metadata remains unchanged (zero sessions/factors), exact QA ownership and active grant remain intact. No access grant was issued to that other account. This is correct denial for an unapproved account, not failure of the active QA grant. Evidence log_rX5Y9s9o1915, log_DAxI_VoYzXUS.

The alias was independently verified to resolve to dpl_WFU7RH8EJWTX28Ej3zUVSEtrXgo4 and exact adecce31b88f5c1ffd623480524996cb5ae91581 before use. Original-owner session on the immutable new Preview was not signed out or replaced. Genuine QA private authentication/MFA/DPA remains required, along with secure API foreign-ID/replay/protected-operation testing, separately approved corrected revoke/post-revoke acceptance, natural live expiry, actual password recovery and final lifecycle terms. No real pilot activation/invitation or new deployment authorized by this report.
