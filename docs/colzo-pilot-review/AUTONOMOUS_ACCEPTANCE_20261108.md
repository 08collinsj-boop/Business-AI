# Independent continuation — 8 November 2026

Base: combined fictional pilot draft #67, source
`c292fc0bee0b9c5720939ab52aeb73eb99508fb7`.

## Return-package fix and recipient verification

A new generated-file regression reproduced a legitimate writer/verifier mismatch:
a 140,020-character description exported successfully but verification raised
`_csv.Error: field larger than field limit (131072)`. The verifier now uses the
existing 16 MiB metadata-file bound as its CSV field bound, restoring Python's
process-wide parser setting on success and failure. It also rejects malformed CSV
and non-object manifests with validation errors rather than an uncaught traceback.
Both original defects were reproduced before their respective fixes.

A recipient can now run the verifier directly:

```bash
python3 scripts/colzo-return-verifier.py /path/to/private-bundle --expected-fingerprint TRUSTED_SHA256
```

The fingerprint must be received separately through a trusted channel. The command
returns a JSON integrity receipt and exit 0 only after complete local verification.
Invalid packages exit 1, emit a generic JSON failure on stderr and emit no success
receipt or local paths. Omitting the required fingerprint fails argument parsing.
This utility remains restricted to the existing fictional QA snapshot; it is not
a general live-data exporter. It performs no writes, network requests or deletion.
The generated receipt rehearsal now has **25 checks**, including the original
17 cases and long text, parser restoration, malformed CSV/manifests and CLI cases.

## Controlled HTTP failure rehearsal

`tests/colzo-validation-socket-outage.test.mjs` runs the actual booking, enquiry
and customer handlers through a local HTTP server. A second loopback server supplies
explicit synthetic Auth, membership, grant and optional strict-session responses.
Every backend request is constrained to that loopback fixture; there are no real
keys, issued sessions, Supabase calls, record writes or provider operations.

For each of those four validation stages, inject HTTP 503, invalid JSON and a
broken socket: **12 failure scenarios**, each exercising GET, POST and PATCH on
all three handlers (**108 denied requests**). Each response must be 401, 403 or 500,
without the record sentinel, synthetic backend error detail or synthetic key.
An upstream allowlist confirms that no record query, audit or provider request is
reached. A positive read of the protected synthetic record precedes testing and
follows every failure scenario (**39 successful control requests**), proving
recovery rather than accepting a permanently denied fixture.

This strengthens isolated transport evidence. It does **not** close the controlled
live Supabase/issued-session outage gate, prove handling of an indefinitely stalled
request or alter the optional strict-session flag in the deployed application.

## Live access and release boundary

The stable protected Development Preview loaded the normal Colzo sign-in form in
the available cloud browser; no authenticated session was present. No credentials,
MFA setup, legal acceptance, new reset email or user handoff was attempted. Private
sign-in and independent QA MFA/DPA remain pending while independent work continues.

No application runtime, privileged SQL, Auth configuration, grants, original expiry,
Production, public signup, paid provider or consent/retention policy was changed.
Offline scripts and tests require no application redeployment. The protected runtime
and prior successful live acceptance remain intact. Pilot remains **NO-GO**.

Remaining: independent QA AAL2/consent and two-way/role testing; controlled live
validation-unavailability; physical Safari keyboard/touch/safe areas; complete
account return/deletion with Auth/Storage/provider/shared/private dependencies,
verified recipient delivery and operator retention/holds/consent decisions; gated
signup SQL and end-to-end activation; original 10/11 November expiry observation.
The existing 12 November observation is preserved; no duplicate automation created.

## Validation

Final complete local verification: **1,710/1,710 Node tests passed**, zero
failed/cancelled/skipped. Build passed; static verification of **418 JavaScript
files**, zero inline scripts, secret patterns and temporary markers passed.
Focused receipt/socket run: **14/14 passed**; receipt rehearsal **25 checks passed**.
`git diff --check` passed. Exact-source GitHub workflow results are separate;
no CI success or live acceptance is inferred from these local checks.
