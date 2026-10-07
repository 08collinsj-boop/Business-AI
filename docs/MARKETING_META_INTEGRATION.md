# AI Marketing, Facebook and Instagram Pilot foundation

Status: Facebook publishing is live in the Pilot and has been smoke-tested on the connected Business.AI Facebook Page. Public use by unrelated businesses is still limited by Meta App Review / Advanced Access and any verification Meta requires.

## Current Pilot state

- Meta app: `Business-AI Pages`.
- App ID: `1619985466370367`.
- Pilot callback: `https://business-ai-pilot.vercel.app/api/meta-callback`.
- Facebook Page publishing is enabled in the Pilot.
- `My Business` currently has a connected and selected `Business.AI` Facebook Page.
- `Hartlepool Test Electrical` also has a connected and selected `Business.AI` Facebook Page.
- A real owner-directed Pilot Facebook publish has completed successfully.
- Fully automated Marketing exists, but the owner must enable it and the stronger owner/AAL2 path applies.
- Instagram discovery remains present for linked professional accounts, but Instagram publishing is deliberately not enabled until a media workflow is separately certified.
- The Meta app is Published, but access for unrelated normal Facebook accounts is not yet treated as approved.
- Do not accept the Tech Provider designation unless Business AI deliberately chooses that operating model after reviewing the consequences.

## Product flow

1. Business generates a private Marketing draft, or an enabled automation generates one.
2. Drafts are tenant-scoped and grounded in the business profile plus approved Business Knowledge.
3. In approval-required mode, an owner reviews and approves before external publishing.
4. In fully automated mode, owner configuration authorises the automation to approve and publish within the configured safety limits.
5. Owner/admin connects Meta through OAuth and selects a server-discovered Facebook Page.
6. An approved post can be published now, natively scheduled on Facebook where supported, or processed by the protected Business AI scheduler.
7. Publication state is stored durably and shown as scheduled, publishing, published, failed or cancelled.

## Meta permission use

The implemented Facebook flow needs only permissions that correspond to features actually used.

- `public_profile`: identify the person completing OAuth.
- `pages_show_list`: discover Facebook Pages the authorised person can use so Business AI can present a server-discovered Page list.
- `pages_read_engagement`: read a small set of recent posts from the selected Page for repetition / recent-content context.
- `pages_manage_posts`: create text or photo Page posts and manage supported scheduled Page posts.

The currently stored Pilot connection reports `business_management` as well. Before public App Review submission, confirm whether the active Meta configuration genuinely requires that permission. If it is not required for the implemented flow, remove it rather than requesting unnecessary access.

## Meta security model

Required server-only configuration:

- `META_APP_ID`
- `META_APP_SECRET`
- `META_REDIRECT_URI`
- `META_GRAPH_API_VERSION`
- `META_OAUTH_SCOPES`
- `META_TOKEN_ENCRYPTION_KEY`
- `META_PUBLISH_ENABLED`

OAuth uses a random 256-bit state value. Only its SHA-256 hash is stored, it expires after ten minutes, and the callback atomically marks it used before exchanging the code.

Provider and Page tokens are encrypted with AES-256-GCM using a server-only key. Token-bearing tables do not have browser read access.

Page/account IDs used for publishing are resolved from `marketing_social_accounts`, populated from Meta using the authorised person's token. The browser cannot prove Page ownership merely by submitting a Page ID.

Disconnecting removes the Meta connection and cascades discovered social accounts, so recoverable provider tokens are removed from Business AI application storage.

## Publishing support

Facebook Page text and photo publishing are implemented. Native Facebook scheduling is also implemented within Meta's supported time window.

Provider/network results that cannot confirm whether a Facebook post was created are treated conservatively. Business AI keeps durable publication records and uses request-level idempotency to reduce duplicate-post risk.

Instagram remains blocked until a complete media container / publication workflow has been implemented and separately verified.

## Automation and scheduling

`POST /api/marketing-scheduler` is server-to-server only and requires `Authorization: Bearer <MARKETING_SCHEDULER_SECRET>` using a server-only secret.

Publication and automation claiming use database locking / durable claim functions so browser actions and scheduled workers cannot safely publish the same job twice.

The Pilot Vercel cron calls the Marketing scheduler daily. The current fully automated `My Business` setting is one Facebook post per day.

## Remaining Meta work

- Complete App Review / Advanced Access for permissions required by unrelated businesses.
- Complete any Access Verification or business/individual verification Meta requires for the chosen operating model.
- Record the current Meta Platform / Developer terms during final browser certification.
- Provide reviewer access through Meta's secure reviewer fields, never in source control.
- Record a reviewer demonstration showing connect, Page discovery/selection, draft generation, approval and a harmless test-Page publish or schedule.
- Confirm least privilege for `business_management` before submission.
- Retest with an unrelated normal Facebook account after approval.
- Keep Tech Provider onboarding unaccepted unless deliberately chosen.
- Keep Instagram publishing disabled until separately certified.

See `META_APP_REVIEW_PACKET.md` for the prepared reviewer submission material.
