# Colzo Development - Public Profile logo and cover recovery

**Scope:** Existing Colzo owner Public Profile UI, Development branch only. No Production/Pilot, paid provider calls, real uploads, real customer data mutations or external messaging.

## Implemented
- Native Public Profile media controls for business logo and cover/banner, reusing the already deployed tenant-scoped /api/business-profile API.
- Separate explicit upload choice for avatar vs banner. Client validates extension, MIME type, filename and 1 byte to 8 MB range before requesting an existing signed Storage upload.
- Signed upload to the existing private Supabase bucket, followed by explicit server finalize_upload; the server re-downloads and validates actual file bytes and tenant path before persisting the replacement.
- No success is displayed until the server returns the exact saved profile-image path.
- Owner/admin only removal with explicit confirmation and confirmed persistence. Members can view but cannot change media.
- Failed signed upload never triggers finalisation, and prior media remains in place until backend confirmation.
- Profile editing, customer authentication, Knowledge, Marketing and phone-service flows are left unchanged. Unsaved profile edits require deliberate confirmation before using media actions.

## Verification
- Synthetic Chromium on the real Colzo HTML/CSS/JS: uploaded a synthetic PNG via mock signed Supabase Storage, verified exact prepare/upload/finalize sequence, removed avatar, injected storage failure (no finalise), confirmed member read-only and checked widths 375/390/430/768 without horizontal scroll or JS errors.
- 44 focused regression tests passed, zero failures. Build/static and whitespace checks passed.

## Open gates
- Real authenticated Dev Storage flow, real image bytes and private-bucket policy, real owner/admin/member across separate businesses, iOS Safari file-picker and safe areas, image replacement/deletion and expired URL checks.
- Full suite PGlite migration test remains unverified in resource-constrained environment.
- No Production/public-launch approval from these tests.
