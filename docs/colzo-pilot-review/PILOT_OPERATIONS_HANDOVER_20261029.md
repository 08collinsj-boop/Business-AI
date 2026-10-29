# One-business pilot operations and unavoidable owner decisions

Draft operating procedure, not completed acceptance or consent. Preserve the seven already-approved Colzo legal values; their final loaded identity was observed on the current Preview. Do not publish private backup artifacts, customer payloads, authentication secrets or object paths to GitHub.

## Smallest remaining owner checklist

1. Privately authenticate exact QA `08collinsj+colzoqa@gmail.com`; complete authenticator enrollment, AAL2 challenge and DPA consent. If the existing password is unavailable, approve the exact new-origin redirect packet before using recovery. No codes/passwords/QR seeds in chat.
2. Confirm who monitors the existing published support inbox/telephone, actual monitoring availability and incident escalation route. Approve a narrowly scoped delivery test if wanted; no external test message was sent here. Do not invent response-time guarantees.
3. Decide the post-trial data-return request window and delivery target, the responsible data handler, retention/deletion trigger and period, treatment of backups and required audit/legal holds. Existing 365/730 review intervals are not deletion promises.
4. Approve protected real-source backup scope/destination and key custodian on an existing trusted device; establish private database/Storage access and a free isolated restore target. No credentials in chat; no paid infrastructure or new access grant implied.
5. After all technical gates pass, identify one real business and its authorised owner, approve final pilot terms and separately authorise the exact invitation/activation. Do not invite during QA.

## Zero-additional-spend recovery path and hard access boundary

Current SQL connector is read-only and can inspect Auth/Storage metadata. It provides neither a native `pg_dump` stream nor Storage byte coverage. No database password, approved protected source-archive destination or existing complete local Supabase restore stack is available in this workspace. `pg_dump` and Docker are not installed here. A read-only SQL JSON export into assistant logs would expose sensitive Auth state and would not provide a supported full restore; do not use it as a substitute.

Use an existing trusted operator machine with installed supported Supabase/PostgreSQL tooling and sufficient existing disk capacity. Supabase's documented platform-to-self-hosted route exports roles/schema/data and restores into an isolated self-hosted instance. A local existing machine can avoid a new cloud compute bill; capacity and any licence/network costs must be verified, not assumed.

Required artifact coverage:

| Component | Capture and acceptance |
| --- | --- |
| Source and schema | Pin Git runtime; roles, migrations including reconciled live SQL, extensions, constraints, sequences, functions, RLS and private grant/audit schema. Preserve known same-name migration differences; never use repository migrations alone as proof of live parity. |
| Tenant/membership/audit/legal | One consistent supported database snapshot; restore records, business IDs, memberships, audit chains, legal document versions and acceptance attribution; compare private counts/digests. |
| Auth | Supported complete Auth data and required secure configuration; protect password hashes, identity and encrypted factor state. Table restore alone is insufficient: verify legitimate sign-in/MFA behavior with sanitised fixture accounts on matching isolated Auth versions. Do not assume encrypted MFA material is portable without confirming required service encryption configuration. Do not replay real active sessions into a networked test service. |
| Storage | Capture metadata plus actual bytes of every in-scope object (current inventory: 12 objects/3 buckets). Maintain private stable identifiers, size and SHA256 manifest; check completeness/pagination, version and concurrent-change consistency. Restore bytes and private bucket/RLS policy; compare checksums and authorised/anonymous access. Object metadata alone is insufficient. |
| Configuration | Securely preserve actual Auth redirect/provider/SMTP settings, app flags, secrets-manager references/recovery procedure, deployment protection and disabled paid integrations; no plaintext secrets in repo. Verify disabled outbound services on the isolated target before starting Auth/Storage. |
| Protection | Use existing `scripts/colzo-backup-integrity.mjs` to seal/verify artifacts outside Git, approved encrypted off-device copy and separately held key. Cryptographic integrity is not restore acceptance. |

On isolated restoration, use PG17-compatible tooling and matching Auth/Storage versions. Fail on missing schema/tables/unsupported extensions rather than removing them to obtain a green result. Start with sanitised fixture state and blocked outbound email/provider access. Record measured recovery duration and snapshot age privately; owner decides acceptable recovery objectives. Existing synthetic schema roundtrip/fixture export tests are retained and are not repeated as new real-source recovery evidence.

Authoritative technical sources read through Supabase documentation search on 29 October:

- https://supabase.com/docs/guides/self-hosting/restore-from-platform
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/guides/deployment/going-into-prod

## Operator-handled data return

1. Receive request through the already-published support route. Verify requesting business/owner via a legitimate authenticated route; do not rely only on an email display name. Record request, scope, authority and approved deadline without copying unnecessary customer data.
2. Enumerate tenant-owned records and their shared/user-linked dependencies. Use existing 50-category export serializer/validation as one component, account for six non-business-keyed public tables, private audit/grants, Auth links and Storage bytes separately. Never return platform-global or another tenant's data.
3. Freeze a consistent export scope/version or record concurrent changes; validate business/record links, totals, JSON validity, CSV formula protection and object checksums. A single-customer endpoint is not a full-tenant export.
4. Encrypt private package, deliver through an owner-approved access-controlled route after recipient verification, and retain receipt/checksum evidence without payloads in GitHub. No outgoing delivery is authorised by this draft.

## Deletion while atomic facility remains incomplete

No live deletion is approved or declared ready. Scoped-pilot legacy erasure stays blocked.

1. Log request, verify authority, establish exactly what is to be erased/returned, and obtain operator/legal hold and retention decisions. Restrict further processing only through separately authorised tenant-scoped mechanisms.
2. Complete validated export and recoverability first where appropriate to the approved instruction; do not restore deleted records later without checking deletion records and authority.
3. Rehearse exact candidate database transaction in isolated sanitised data against the dependency inventory. Validate all 47 tenant-keyed tables, user/shared referrals and Auth/legal references, private audit and Storage paths. Preserve justified audit material without retaining unnecessary personal content.
4. Storage bytes and Auth administration span separate services and cannot be made atomic by parallel database PATCH calls. Use a reviewed resumable operator workflow with explicit stages, durable checkpoints, bounded retries and postflight verification; disclose partial completion if any stage fails. Never report complete erasure based only on SQL success or zero UI rows.
5. Present exact target/operations and consequences for separate deletion approval before any live destructive action. Backups need an approved expiry/hold process and deletion instructions re-applied after recovery. Verify final absence/restrictions with authorised sessions; send completion only after verified results.

## First invitation and end-of-trial checklist

- G1–G6 complete with immutable runtime/evidence; current G4 natural-expiry dependency remains 11 November 22:50:58 UTC (follow-up already scheduled).
- One named business and one owner with authority; protected Preview access path for that owner verified before invitation. Do not disable Vercel protection to make onboarding convenient; new access sharing needs separate approval.
- Final offer: 14 days free, no card, no paid subscription commitment; subject to approved service terms/privacy/DPA. Avoid an absolute promise of no contract while requiring those agreements.
- Starter and Marketing entitlements are tenant-scoped for exactly 336 hours. Billing, paid voice and public/automated publishing remain disabled unless separately authorised. No automatic paid conversion.
- User completes secure login, MFA/AAL2, current legal/DPA flow and onboarding; verify tenant membership and UTC start/end. Never use another owner's consent or MFA as substitution.
- Verify support delivery and actual owner workflows/persistence; explain AI review/handover and prohibited promises.
- At trial end, verify protected reads/writes are restricted server-side, no bill/automatic conversion occurs, and data return/support remain available through the approved operator process. Cancellation is requested through verified support and executed only under approved access/lifecycle operations; do not delete data as a side effect.
- Extension, conversion, invite, activation, grant or revoke each needs appropriate explicit approval. No real-business activation is performed by this checklist.
