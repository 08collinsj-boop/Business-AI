# Export path correction and preserved acceptance — 6 November 2026

## Observed defect and correction

The existing fixture serializer rejected a symlink output directory but followed
symlinks in output ancestors. A new synthetic regression reproduced this: passing
`linked-parent/new-export` wrote a package into the symlink target rather than
rejecting it (`export accepted symlink output ancestor`). No live data used.

The serializer now checks the absolute output path and every ancestor for symlinks
before creating any directories or writing files. Existing empty/private-directory
and exact fixture/schema/credential checks remain. The regression also verifies
that rejection creates no child directory in the linked destination. This is
offline operator utility hardening, not a new route or deployed product change.

Six focused export/attachment/dependency regressions pass. The exporter rehearsal
now has eight checks; attachment rehearsal retains its 23 checks. Full verification
and exact-source CI are recorded in the PR comment after execution.

This validation is not a complete defence against malicious concurrent changes
by another process with the same filesystem privileges. It does not authorise a
live export, delivery or deletion, and no live extraction was repeated here.

## Correction to current completion wording

`EXPANDED_QA_TENANT_EXPORT_ACCEPTANCE_20261029.md` records an actual restricted,
read-only operator export rehearsal for the exact fictional QA fixture: 50
categories (44 data/six count-only), 28 data rows, JSON and 44 CSV readbacks,
12 negative cases and seven formula cases. That historical result must be
preserved for its exact scope/source. It is inaccurate to state that no expanded
fictional tenant extraction was ever demonstrated.

The historical rehearsal excluded Auth/private pilot records, Storage bytes,
global/shared account data and provider/security secrets. It was not a shipped
self-service return, recipient-delivery acceptance, complete account return,
backup or deletion test. Later offline serializer hardening and synthetic file
bundling do not silently expand the historical live result. Full account return,
authorised delivery and closure remain outstanding. No historical suite was
rerun simply to recreate already recorded acceptance.

The broader 2 November G5/G7 document and 6 November continuation used wording
that understated this earlier restricted export. This note supersedes that
wording only; it does not change their other uncompleted operational/security
gates. Pilot remains NO-GO; public signup remains disabled.
