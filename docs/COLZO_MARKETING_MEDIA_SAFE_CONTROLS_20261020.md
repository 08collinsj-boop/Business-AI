# Colzo Development - Marketing media inspection and pause controls

**Scope:** Feature branch `feature/colzo-marketing-media-safe-control-20261020`, based on merged Development SHA `a36923820b5c027776e06ad6e3f7eb0df2f438c6`. Development only; no Production, Pilot, paid providers, real publications or customer data.

## Restored safely

- A **View image** action in each saved Marketing draft. It performs authenticated `GET /api/marketing-images?generation_id=...` only, verifies draft identity, and displays saved status, provider, size and optionally its existing short-lived signed HTTPS image URL. Only completed, supported raster media is displayed. Simulated, failed and absent media are visibly labelled. No new image is generated, uploaded or removed.
- An explicit **Pause automation** action for the owner, offered only if the saved automation is enabled. Uses existing authenticated PATCH with `enabled:false`, `mode:'approval_required'`, `image_enabled:false`, safe tone and posting-limit values. It checks the server confirmation before reporting success. Does not offer reactivation, a run-now button, autopublishing, provider setup or AI image generation.
- Server GET now returns an owner-only `can_pause` capability; existing owner-only PATCH enforcement is unchanged.
- Both controls are contained in the native Graphite & Volt screens, not customer authentication UI. Unsaved edits are protected before image inspection, and switching Marketing tabs clears transient media state.

## Verification

- 42 focused Marketing, automation, image and frontend tests passed, no failures.
- Synthetic Chromium browser tested media GET only, saved image status, owner pause request exactly matching contract, no re-enable or scheduling, member read-only, 375/390/430/768 mobile/tablet widths, and no runtime exceptions.
- `npm run build`, `npm run verify:local`, `git diff --check`, JavaScript syntax checks passed.

## Outstanding acceptance gates

- Hosted authenticated Development check with actual tenant data, iOS Safari safe areas/scroll/keyboard, signed image expiry, real owner/member/other-tenant isolation, full-run acceptance. Do not approve Production or paid publishing.
- The earlier repository-wide 171-file test run reported 1,106 passing tests; its PGlite `colzo-lead-version-migration.test.mjs` file was terminated by SIGKILL in this approximately 1GB sandbox even in isolation, not an assertion failure. That test remains **unverified**, not passed.
