# AI Marketing, Facebook and Instagram Pilot foundation

Status: implemented locally; live Meta credentials are not present and no external account has been connected.

## Product flow

1. Business generates a private Marketing draft.
2. Draft is saved in the tenant library and can be edited/regenerated.
3. Only the business owner can approve a completed draft for publishing.
4. Owner/admin connects Meta through OAuth and selects a server-discovered Facebook Page / linked professional Instagram account.
5. An approved draft can be published now or scheduled.
6. Scheduled work is stored in `marketing_publications` and must be claimed by the protected server scheduler endpoint.
7. Status is shown as scheduled, publishing, published, failed or cancelled.

Business AI never silently auto-approves AI copy.

## Meta security model

Required server-only configuration:

- `META_APP_ID`
- `META_APP_SECRET`
- `META_REDIRECT_URI`
- `META_GRAPH_API_VERSION`
- `META_OAUTH_SCOPES`
- `META_TOKEN_ENCRYPTION_KEY`
- `META_PUBLISH_ENABLED`

The exact Graph API version and scopes are intentionally environment configuration and must be verified against the current Meta developer documentation during Pilot setup rather than frozen into source.

OAuth uses a random 256-bit state value. Only its SHA-256 hash is stored, it expires after ten minutes, and the callback atomically marks it used before exchanging the code. Provider tokens are encrypted using AES-256-GCM with a server-only 32-byte key. Token-bearing tables have no authenticated browser read policy.

Page/account IDs used for publishing are resolved from `marketing_social_accounts`, which was populated from Meta using the connected user's token. A browser cannot prove Page ownership by submitting a Page ID.

Disconnecting deletes the Meta connection and cascades discovered social accounts, removing recoverable provider tokens from application storage.

## Publishing support

Facebook Page text publishing is implemented behind `META_PUBLISH_ENABLED=true` and must be smoke-tested with a Pilot Page before enabling it.

Instagram is deliberately **not** presented as live text-only publishing. The connection model records a linked professional account, but actual Instagram publishing remains blocked with `META_MEDIA_REQUIRED` until a media-asset/container workflow is implemented and verified. This avoids a fake integration.

Provider/network results which cannot confirm whether a Facebook post was created are marked `META_AMBIGUOUS_RESULT`. Business AI tells the owner to check the Page before retrying; automatic retry is blocked to reduce duplicate-post risk.

Each browser publish/schedule operation carries a random request ID. The server hashes that together with the verified tenant and stores it behind a unique constraint, so retrying the same operation reuses the durable publication job. If the original publish succeeded but the response was lost, a retry returns the existing published job instead of posting a second time.

## Scheduling

`POST /api/marketing-scheduler` is server-to-server only and requires `Authorization: Bearer <MARKETING_SCHEDULER_SECRET>` with a secret of at least 32 characters.

`claim_due_marketing_publications()` atomically claims due jobs using row locking. `claim_marketing_publication()` atomically claims a specific publish-now/retry job so the browser path does not race the scheduler. Both functions are service-role-only.

The repository intentionally does not pretend a browser timer is a scheduler. During Pilot deployment, configure a supported server cron/scheduler to call this endpoint frequently enough for the promised scheduling precision.

## Remaining live work

- Create/configure the Meta Pilot app.
- Verify the current Graph API version and required Page/Instagram permissions.
- Configure the Pilot callback URL exactly.
- Complete any Meta app review/business verification required for the intended permissions.
- Connect a harmless Pilot Page and verify account discovery/select/disconnect.
- Verify one owner-approved Facebook test post.
- Confirm token expiry/re-auth behaviour.
- Choose and configure the server scheduler.
- Add a real media workflow before enabling Instagram publishing.
