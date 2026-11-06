# Independent offline return-package verification — 6 November 2026

## Implemented and executed

The existing fixed fictional-QA attachment writer validated its inputs and wrote
JSON/CSV/attachment manifests, but had no independent verification entrypoint for
a copied package. `scripts/colzo-return-verifier.py` now exposes
`verify_bundle(directory, expected_fingerprint)` for an already supplied LOCAL
package. It cannot connect to Supabase, discover/download objects, send a package,
execute SQL, revoke sessions or delete data.

The writer returns `verification_sha256` separately from the files. This is SHA256
of the exact tenant-manifest bytes, one zero byte, then exact attachment-manifest
bytes. Those manifests bind each listed file's length/hash. A verifier caller must
supply the expected fingerprint through an independently trusted channel. A hash
copied from inside an untrusted package is not authority or sender authentication.
This is integrity checking, not encryption, signing, delivery or a backup.

The verifier checks:

- Existing exact fictional business/user snapshot validation and credential
  exclusions. The supplied package cannot expand this utility to another tenant.
- Exact manifest/file coverage, no duplicates/unlisted files or directories,
  bounded regular files, no hard links/symlinks (including ancestors), and private
  root/attachment directories.
- All 44 CSVs against the JSON snapshot, including formula escaping; file hashes
  alone do not establish CSV/JSON consistency.
- Each attachment against snapshot-derived bucket/path/record references, declared
  lengths/hashes, and available source-row length/hash metadata. Missing, extra,
  cross-record or traversal references are refused.
- Maximum metadata-file size16 MiB and inherited attachment limits16 MiB/file,
  64 MiB total and1,000 attachments. Larger packages fail; none are truncated.

The verifier returns only counts/fingerprint and explicitly false flags for live
return, recipient delivery and authorisation. Verification performs no writes.

TDD first failed on the missing verifier. The generated-fictional receipt rehearsal
passes17 checks: valid JSON/44 CSVs/one attachment; read-only verification; absent
or incorrect trusted fingerprint; corrupt/missing attachment; extra file/directory;
changed CSV escaping; rehashed CSV inconsistent with JSON; re-fingerprinted path
traversal; shared attachment directory; changed manifest bytes; symlink file or
ancestor; shared root; and successful re-verification after restoring originals.
The existing23-check attachment-writer rehearsal still passes. No previous live
export was repeated; no authentic account information or remote bytes were read.

## Remaining boundaries

This does not complete the pilot's full account return/deletion gate. Live Auth,
Storage/provider/shared/private categories, requestor authority, a trusted recipient,
secure delivery, category-specific holds/retention and deletion/backup exceptions
still require their own implementation, evidence and applicable operator decisions.
No deadline, policy, consent, deletion permission or recovery guarantee is invented.

Offline source/test/document changes do not require replacing the live application.
Preserve protected runtime8bae5d7e and its recorded responsive-viewport acceptance.
Independent QA MFA, controlled live validator-unavailability, native Safari and
scheduled natural expiry remain pending. Signup stays disabled; pilot NO-GO.
