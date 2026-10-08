# Pilot Marketing automation safety - 8 October 2026

**Scope: Business-AI-Dev Supabase database and the business-ai-pilot Vercel project only.**
Do not apply Pilot-only constraints automatically to the separate Production application.

## Safe operating state
- My Business (my-business): automation disabled, mode `approval_required`.
- `MARKETING_AUTOPUBLISH_ENABLED` is deliberately unset, so automatic publication fails closed.
- Pilot SQL constraints prohibit `enabled=true` with `mode=fully_automated`.
- New `marketing_publications.is_automated` identifies automated jobs. Pilot SQL rejects automated publication rows.
- Server re-fetches current owner settings at run start, after generation, before auto-approval, and immediately before Facebook dispatch.
- Automatic generation in an approval-required configuration still saves drafts for owner review.
- Manual owner-approved calendar and direct publications continue independently of the automation toggle.
- Idempotent database indexes/triggers prevent exact repeated scheduling of the same approved draft for the same business, platform and timestamp, including cross-queue collisions.

## Existing approved, scheduled posts
On 8 October 2026 two duplicate direct publications of the same Sunday draft were cancelled. The original Meta-native Sunday scheduled post, and one Friday direct publication, were intentionally retained. Pausing automation does not cancel these; cancelling Meta-native posts must use the provider-aware cancellation route.

## Re-enablement gate
Do **not** remove the Pilot constraints or set `MARKETING_AUTOPUBLISH_ENABLED=true` until:
1. Concurrency/pause race tests pass, including in-flight generation and post-dispatch checks.
2. Queued-post duplicate protection is confirmed on Pilot.
3. Explicit owner approval, audit attribution, rollback and multi-business isolation are certified.
4. Owner explicitly authorises unattended publishing.
5. Migration/feature flag changes are separately reviewed for Production.

The server-side live-settings checks reduce the pause-to-publish race but cannot retroactively cancel a Facebook request already accepted by Meta. Use the normal provider cancellation mechanism for posts already scheduled at Meta.
