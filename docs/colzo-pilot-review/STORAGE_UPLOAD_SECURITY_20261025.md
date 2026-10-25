# Scoped pilot upload capability correction — 25 October 2026

Isolated continuation from published integration `904abd210d63e5609b162d64cb430e3f64d373b4`. This is a prepared correction, not a deployed security acceptance or account activation.

## Reproduction and cause

Authenticated active scoped owners could obtain signed upload tokens from Knowledge `create_upload` and business-profile `prepare_upload`. Fresh isolated mocked-transport calls returned 201 and 200 respectively. No live token was requested, no source data was uploaded and no provider API was called.

Supabase documents signed upload URLs as valid for two hours without further authentication: https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl . The application checks the grant when issuing the token, but that check does not re-run when the token is later used directly against Storage. A token could therefore permit an upload after pilot expiry or revocation. Finalisation checks do not prevent the underlying byte upload.

## Minimum correction

When scoped mode is requested, both token-creation paths return 403 `PILOT_UPLOAD_UNAVAILABLE` before Storage access or metadata mutation. Knowledge reports `can_upload=false`; business profile reports `can_upload_media=false`. Native UI hides document upload/replacement and disables profile-image upload, with an explanation. Manual fact entry/review, profile text changes and removal of an existing image remain available subject to their existing authorisation. Legacy mode keeps the upload contract. No RLS, database, bucket, shared Auth or billing configuration changed.

Both Vercel configurations explicitly disable automatic deployment for `fix/colzo-pilot-continuation-20261025`. Existing previously issued tokens are not revoked by this correction. Before any scoped release, confirm no still-valid token remains and inspect the exact environment's Storage policy/ACL exposure. A future authenticated streaming upload flow would require separate design and acceptance; do not re-enable token issuance as a convenience workaround.

## Fresh verification

- Four server regressions reproduced the incorrect status/capability before the fix; profile-renderer denial also reproduced before the fix. The Knowledge renderer fixture was corrected during preparation, then verified against the final UI.
- Eight final regressions pass: two scoped token denials without writes/Storage calls; two capability responses preserving text/manual permissions; two rendered control checks; two successful legacy token paths with scoped mode disabled.
- Focused Knowledge/manual/profile group: 19 passed, zero failures/skips before adding the two legacy-positive checks; final new test file: 8 passed.
- Final unchanged-source `npm run verify`: **1,346 passed, zero failures, zero skipped, zero cancelled**. Build passed. Static verification checked **346 JavaScript files**, secret patterns and temporary markers. Exit status 0. Diff whitespace check passed.
- Website help copy now labels Marketing outside the scoped pilot and explains that public paid subscriptions are unavailable, with no card or automatic conversion. Existing guides remain present; full website build/link checks passed with this copy.

No actual expired/revoked-token Storage exploit, real Auth/MFA flow, accepted matching Preview, physical iPhone or genuine-data recovery was tested. Overall onboarding remains NO-GO.
