# Colzo protected-write release gate

This branch is a corrective change for Colzo as the intended successor to Business AI.

## Development and preview isolation

- The preview environment for `fix/colzo-composio-first-protected-writes-20261015` is explicitly scoped to the `Business-AI-Dev` Supabase project.
- Do not use the generic Vercel Preview Supabase credentials for this branch.
- Do not use real customer records for automated tests.
- Do not run production migrations, change production aliases, or deploy this branch to Production as part of verification.

## Required checks before release

- [ ] Full `npm run verify` passes on the exact commit proposed for release.
- [ ] Review the protected-write handler and tenant authorization against the target Colzo feature branch.
- [ ] Verify stale writes return HTTP 409, DELETE is unsupported, and quote lifecycle rules are enforced server-side.
- [ ] Complete authenticated staging acceptance using only the isolated development project and synthetic test records.
- [ ] Confirm a restorable backup and perform a restore check for any production data involved in a future cutover.
- [ ] Document a rollback path and verify the current Production deployment and aliases remain unchanged.
- [ ] Obtain explicit approval for the exact production cutover before merging or deploying.

Passing automated tests alone does not authorize a merge, migration, or Production release.

## Preview API isolation

- No `/colzo-backend/*` rewrite to Business AI Pilot is permitted on this branch.
- All Colzo browser API requests use handlers from this Preview deployment.
- Check that `/api/public-config` reflects the development Supabase project before authentication tests.
- Preview must use synthetic accounts/records. Live Stripe, Meta and other outbound actions are out of scope until separately isolated and approved.
- The historical shared-backend rollout document is superseded for this corrective branch.
