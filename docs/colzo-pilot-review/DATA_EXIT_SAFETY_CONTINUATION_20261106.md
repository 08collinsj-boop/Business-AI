# Data-exit safety continuation — 6 November 2026

## Completed safely

Reviewed existing 29 October exporter and 2 November lifecycle/operations packet. The scoped pilot's legacy non-transactional erasure route remains disabled. No deletion, live-data export, recipient delivery, Auth/Storage download or new privileged SQL was attempted.

Observed operator-export defect: reusing a nonempty destination directory silently mixed existing files with a new return package. A new regression first failed with `export accepted nonempty output directory`. The exporter now refuses nonempty directories, symlink destinations and group/world-readable destinations before writing. Newly created output directories use mode 0700. Existing source validation, exact QA scope and credential exclusions are retained. This changes an offline operator utility, not product endpoints.

New isolated rehearsal `scripts/verify-colzo-export-safety.py` builds fresh synthetic records from the declared export specification (not from tenant data). Seven checks pass: mixed output refused; shared output refused; symlink output refused; all declared categories roundtrip through JSON; each file's SHA256 and byte length verify; the manifest covers all emitted files; Auth/Storage exclusions stay explicit. Fixture covers 50 declared categories, including 44 serialised data categories. Temporary files are removed on exit. These are arbitrary synthetic records for serializer coverage, not proof of live relational completeness or restorable backups.

Fresh read-only Development metadata enumerated 47 public base tables with business_id. Exact comparison with declared export categories found 47 covered, zero missing and zero stale. Count-only categories remain excluded from row export; this is scope coverage, not a verified complete return of all data.

## Remaining boundaries

Full-tenant extraction/delivery has not been demonstrated. Auth users/identities/passwords/sessions/factors, Storage file bytes, provider tokens/private security fields and global/shared data remain excluded by the existing design. Account and authentication data remain real personal information even when operational/customer records are fictional. Closure requires category-specific instructions, shared-account dependencies, retention/holds, file/provider/backup handling, an authorised recipient and a separately reviewed erasure procedure. No automatic deletion on grant expiry is claimed.

Support receipt and owner twice-daily monitoring are now evidenced in PR #65; backup cover and automatic monitoring are deferred. Owner QA MFA enrollment is deferred; neither this serializer rehearsal nor historic owner MFA substitutes for independent issued-session AAL2 acceptance. Pilot NO-GO.

## Natural-expiry preparation

Retain the original grants (10 November 18:08 UTC and 11 November 22:50 UTC) and the existing 12 November observation. Do not create another reminder or change grants/clocks. Current workspace middleware checks MFA before tenant/grant reads: an AAL1 MFA_REQUIRED response therefore cannot prove expiry enforcement. The future observer must distinguish (a) read-only grant state, (b) an actual valid AAL2 request reaching the expiry boundary, and (c) displayed expired state. A revoked/expired token, missing session, MFA denial or Vercel protection wall is inconclusive for natural-expiry acceptance. Preserve exact runtime/source and HTTP outcome; leave genuinely unobservable checks pending.
