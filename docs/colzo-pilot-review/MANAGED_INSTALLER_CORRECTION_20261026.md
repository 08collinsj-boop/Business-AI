# Managed installer correction — 26 October 2026

Status: independently reviewed; revised shared operation NOT AUTHORISED / NOT APPLIED.

The previous exact approved operation failed at its final guard. Actual Development
readbacks confirm transaction rollback; no staged objects remain. This was an
installer-model defect: the previous synthetic installer was superuser, whereas
managed postgres is not. It is not a reason to disable the guard.

The revised assembler retains every staged source pin and permits only PostgreSQL's
bootstrap-issued admin-only entry to the already-trusted installer. Runtime
membership and SET paths are denied; all other edges, including outbound, fail.
ADMIN is trusted administrative power and can later regrant access. It does not
constrain postgres, already the privileged function owner and CREATEROLE role.

Regression was red on the unchanged package with a faithful non-superuser fixture
(unsafe operator role), then green after correction. Independent reviewer
/root/current_sql_review reviewed code and reran final 13 checks: 13 pass, zero
failures, no remaining Critical/Important findings. Reviewer did not execute native
checks. Root executed native 17.11 on a fresh isolated non-superuser fixture: 9 pass;
cluster stopped. Initial native syntax-setup failure is not counted as passing.

The previous 41 provisioning and 11 booking native results are historical and were
not rerun here. No managed Auth/browser/iPhone acceptance or recovery is claimed.
Next operation and exact hashes/effects/rollback are in NEXT_DEVELOPMENT_APPROVAL.
