# Receptionist demonstration correction — 27 October 2026

The deployed candidate missed the explicit request "Please request an appointment
next Tuesday afternoon". A prior "Do not book anything" also supplied `anything`
as the work type for a later quote and booking.

`api/enquiry.js` now recognises an explicit appointment-request imperative through
the existing positive-consent path. Existing refusal, cancellation, quoted-example
and informational-question checks remain ahead of that path. Saved appointments
remain pending requests; availability and time still need human confirmation.

Work extraction skips explicit no-action messages, scans customer turns separately
and recognises "quote for" descriptions. The reproduced refusal → lighting quote →
appointment sequence now preserves `replacing two indoor lights` in both the
enquiry and the booking RPC payload. No historical records are rewritten.

Validation: the two new handler regressions failed on the deployed baseline and
passed after the patch. Focused runs passed 97 tests. The full Node suite passed
1,404 tests with zero failures, skips or cancellations. Tests use synthetic
storage/provider fixtures; these results do not replace deployed acceptance.

No SQL, grants, billing history, tenant guards, MFA settings or provider
configuration changed. Both deployment configurations continue to disable
automatic deployment of the PR65 branch. No merge or deployment is included.

After separate exact-commit Preview approval: retain the existing branch-specific
Development settings and SSO; check provider keys remain empty; exercise a new
fictional conversation containing the refusal, quote and appointment wording;
verify the correct persisted work type, one pending booking on retry, no extra
booking/callback on refusal, owner/customer persistence and existing expiry.
Physical iPhone Safari acceptance remains outstanding. MFA is user-reported
working, while this specific08 demonstration's MFA test remains deferred.
