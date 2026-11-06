# Development recovery MFA defect — 5 November 2026

## Observed runtime evidence

The user supplied an iPhone screenshot of password recovery rejecting a newly requested link at approximately 21:19 UTC. Filtered Development Auth logs showed five password-update PUT requests rejected with HTTP 401, error code `insufficient_aal`, at 21:19:32–37. The application caught every update error and incorrectly instructed the user to obtain a fresh reset link.

Filtered audit comparisons showed that the 21:19 recovery request and recovery login did not belong to the designated independent QA identity. That QA identity still had no issued sessions or verified MFA factors. This does not constitute independent tenant acceptance. No password, reset URL, access token, OTP, MFA secret or raw authentication log is retained in this evidence.

## Correction

Recovery now displays the email associated with its actual session. Before enabling password save it checks assurance using Supabase Auth. An account with an enrolled verified TOTP factor must challenge and verify that factor and reach AAL2. Verification does not automatically change the password; the user must explicitly save it. An account without an enrolled factor may use its legitimate recovery session. Missing sessions and unavailable security validation fail closed. Password-save errors distinguish MFA requirements, password reuse, weak passwords, missing sessions and unavailable service. Unexpected server details are never displayed.

This preserves MFA and uses the existing public Supabase SDK. It does not remove factors, modify Auth configuration or provision an account. New passwords and authenticator codes remain private user actions.

## Validation

Regression tests were written first and failed on the old implementation (three failing tests). Five behavioral tests cover identity display; required MFA; missing session/security failure/invalid OTP denial; legitimate recovery without a factor; separate explicit password submission after MFA; and error classification without raw details. Existing frontend authentication tests also pass. Full verification results are recorded in the accompanying PR comment after completion.

## Release boundary

The correction is source-only until a separately approved protected Development Preview deployment. The currently deployed application and existing recovery redirect continue to use their previous code. Do not describe this source correction as a successful live password reset.

Public signup stays disabled. Independent issued-session tenant/security acceptance, live recovery acceptance, operator/support/data-exit decisions and natural-expiry observation remain outstanding. Pilot remains NO-GO.
