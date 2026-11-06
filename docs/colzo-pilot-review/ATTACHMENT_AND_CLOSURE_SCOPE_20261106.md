# Attachment return and closure dependency continuation — 6 November 2026

Development-only metadata inspection and isolated synthetic engineering. No live
data exported/deleted; no credentials, Storage paths or customer contents retrieved
for publication. No application deployment, SQL installation, policy decision,
MFA change, signup activation, spending or Production change.

## Attachment return implementation

`scripts/colzo-attachment-return.py` supplements the existing fixed fictional-QA
JSON/CSV serializer with independently supplied local attachment bytes. It makes
no network calls and exposes no live export/download endpoint. Its input remains
the existing exact QA fixture snapshot envelope; this is not a general operator
export and does not authorise extraction of authentic account data.

References are derived from the snapshot, not from a broad object-prefix scan:

- Knowledge: bucket `business-knowledge`, exact `source/<source-id>/...` path bound
  to the exported source row. `manual/<same-source-id>` is a virtual manual fact,
  not a Storage object.
- Profile images/banners: `business-profile-media`, exact business-prefixed paths.
- Marketing images/library: `marketing-images`, exact business-prefixed paths.

Every referenced object must have one supplied manifest entry and byte stream.
Missing, extra and duplicate entries fail; hashes/lengths and available Knowledge
record hash/length metadata must agree. Paths, source IDs and buckets are checked;
local traversal, encoded object-path ambiguity, symlinks (including ancestors),
hard-linked/nonregular files and output overwrite are refused. Input and output
parent directories must be private. Bounds: 1,000 attachments, 16 MiB per file,
64 MiB total; larger exports fail rather than silently truncate.

All validation finishes before output creation. On write failure, only the newly
created output directory is removed. The tenant snapshot, JSON/CSV manifest,
attachment bytes and supplementary attachment manifest remain together. Original
tenant-manifest exclusions describe that serializer's own files; the supplementary
manifest explicitly adds attachment bytes. Auth, providers, actual recipient
delivery and account closure remain outside this implementation.

TDD: first test failed on missing implementation; an added root-record regression
then reproduced acceptance of a missing business root and was fixed. The synthetic
rehearsal generates four temporary attachments and passes **23 checks**, including
byte/hash readback, foreign references, corruption, size limits, unsafe paths,
symlinks, existing output and injected disk-failure cleanup.

## Fresh live read-only preparation

Exact Development project: `mvwseobgkexzpmmkgcxe`.

A count-only join followed all five application reference fields/categories for
the designated fictional QA workspace, including source-ID-based Knowledge paths:
**0 referenced objects, 0 matched objects, 0 missing objects**. No object names,
bytes or global Storage inventory exported. An empty result is not proof of
successful live file return, complete object discovery or safe deletion.

## Complete recursive foreign-key metadata

`CLOSURE_DEPENDENCIES_20261106.json` records metadata only: **51 tables, 77 foreign
keys**, recursively following inbound dependencies from `public.businesses` and
all public `business_id` tables. The earlier 50 count referred to referencing
tables; this snapshot also includes the business root. No contradiction or new
table installation is implied.

Canonical sorted-key compact JSON SHA256 of its `metadata` object:
`3f4f008cbb1fffa2c1227175681b0fb946560448fb5b3eb1f32f5e9a0413bd80`.

`scripts/colzo-closure-dependencies.mjs` now checks offline table classification
against that fingerprint. It blocks incomplete/unknown table handling, invalid
actions, retained children of deleted parents (including cascades and SET NULL),
unscoped/shared or private deletion, business-root deletion, non-tenant-compound
references and dependency cycles. A supported synthetic graph yields child-first
ordering only. It never generates SQL, connects to a database or enables execution;
`executionSupported` is always false. A metadata-only `ready` means only that this
dependency assessment has no blockers, not account closure or release acceptance.

The prior six-table rehearsal against the complete snapshot produces **13
blockers**: ten retained dependent relationships and three non-compound tenant
references (`business_knowledge_sources.replaces_source_id`,
`customer_enquiry_access.lead_id`, `lead_history.lead_id`). These are conservative
closure/integrity review flags, not proof that the current application allows a
cross-tenant exploit. The Knowledge API already scopes replacement lookup by
business. No database constraint or permission changed.

Follow-up read-only preflight: `authenticated` has neither INSERT nor UPDATE
privilege on any of those three tables. Aggregate cross-business link counts are
zero for all three relationships. These results provide no evidence of a direct
authenticated write bypass; the conservative closure review flags remain. No
permission was relaxed or privileged constraint installation proposed to make a
simulation pass.

Four dependency regression tests cover the real snapshot and synthetic unknown
cascade/private/shared/cycle/fingerprint cases. Triggers, row-level authority,
holds, Auth, Storage, provider handling and backup lifecycle remain explicit
additional requirements; an FK catalog cannot prove those.

## Remaining gate

No full live return/deletion acceptance is claimed. A complete closure execution
path still needs reviewed treatment of all dependencies and retention exceptions,
verified authority/holds, Storage/Auth/provider handling and separately authorised
live actions. Original natural-expiry fixtures remain unchanged. Pilot NO-GO;
public signup remains disabled.
