# AI Marketing, Facebook and Instagram Pilot foundation

Status: refreshed 7 October 2026 from the live Pilot, database state and current source.

## Current live state

- Meta publishing is configured on the Pilot.
- A Facebook Page named `Business.AI` is connected and selected for the current Pilot businesses inspected.
- A real Facebook Page post published successfully through Business AI on 7 October 2026.
- The current stored connection has Page-related permissions sufficient for the connected account. The observed scope record includes `pages_show_list`, `pages_read_engagement`, `pages_manage_posts` and `business_management`.
- Business AI does not expose provider access tokens to the browser. Tokens are encrypted at rest with AES-256-GCM.
- Public App Review / advanced-access status for unrelated users is not certified and must not be inferred from the current developer/admin connection.
- Instagram text-only publishing remains deliberately blocked. A linked professional account can be discovered, but actual Instagram publishing requires a separately verified media workflow.

## Product flow

1. Generate a tenant-scoped Marketing draft from approved business facts and the owner's request.
2. Save/edit the draft in the private library.
3. In approval-required mode, an owner approves before publishing.
4. In fully automated mode, the stronger owner/AAL2 gate is required before automation can be enabled.
5. Connect Meta through OAuth and select a server-discovered Page.
6. Publish immediately, use Meta-native Facebook scheduling where eligible, or allow the Business AI scheduler to process due work.
7. Show durable scheduled, publishing, published, failed or cancelled state.

## Meta security model

Required server-only configuration:

- `META_APP_ID`
- `META_APP_SECRET`
- `META_REDIRECT_URI`
- `META_GRAPH_API_VERSION`
- `META_OAUTH_SCOPES`
- `META_TOKEN_ENCRYPTION_KEY`
- `META_PUBLISH_ENABLED`

OAuth state is random, stored only as a SHA-256 hash, expires after ten minutes and is atomically marked used before code exchange.

Page/account IDs accepted for publishing come from `marketing_social_accounts`, populated from Meta's own account discovery. A browser cannot prove Page ownership by submitting an arbitrary Page ID.

Disconnect deletes the Meta connection and linked social-account rows, removing recoverable provider tokens from Business AI storage.

## Graph operations used by current source

The current integration uses Meta Graph operations for:

- `/me`;
- `/me/accounts` and linked professional Instagram account discovery;
- recent selected Page posts for style context when permitted;
- `/{page_id}/feed` for Facebook text publishing and native scheduling;
- `/{page_id}/photos` for Facebook image publishing;
- scheduled-post status and cancellation.

The current code does not directly call a Business Manager management endpoint. Do not remove an observed permission solely on that basis: Page discovery behaviour can depend on the connected Meta account/business configuration. Scope minimisation must be rechecked in the Meta Developer console against the actual Page/Business Portfolio setup before submission.

## Reliability and duplicate protection

Provider/network results that cannot confirm whether a Facebook post was created are recorded as ambiguous and are not blindly retried.

Browser publication requests use a random request ID that is combined with the verified tenant and stored behind unique constraints. Server-side publication/schedule claims are atomic.

## Scheduling

There are two triggers for the same protected scheduler endpoint:

- primary timing trigger: Supabase `pg_cron`, hourly at minute 0;
- fallback trigger: Vercel cron, daily at 08:00 UTC.

The scheduler itself decides what is due, and durable claims/idempotency prevent the two triggers from creating duplicate work. See `MARKETING_SCHEDULER_OPERATIONS.md`.

## Data deletion

`/legal/data-deletion.html` is live and documents deletion of Business AI account/workspace data and Facebook / Meta connection data. The authenticated disconnect path deletes the stored Meta connection and linked social-account records.

This is intentionally a public data-deletion instructions URL, not an automated Meta deletion callback.

## Remaining Meta launch work

- Open the Meta Developer console in an authorised browser session.
- Record current app mode and the exact App Review / advanced-access state for each requested permission.
- Complete only the verification/review steps actually required for unrelated businesses to connect.
- Record the current Meta Developer/Platform terms/version/date.
- Confirm the configured data-deletion instructions URL is accepted by the Meta app settings.
- Re-test with an unrelated authorised reviewer/test account.
- Do not accept Tech Provider status, submit declarations or make legal/business-verification claims without operator confirmation.
