# Meta App Review packet - Business-AI Pages

Prepared: 7 October 2026

This file is the internal submission pack for Meta App Review / Advanced Access. It contains no passwords, access tokens or reviewer credentials.

## App and product

- App name: `Business-AI Pages`
- App ID: `1619985466370367`
- Pilot application: `https://business-ai-pilot.vercel.app`
- OAuth callback: `https://business-ai-pilot.vercel.app/api/meta-callback`
- Product area: Business AI -> Marketing
- Current app state: Published
- Current Pilot Page: `Business.AI`
- Current public limitation: app admin/developer use has worked, but unrelated normal Facebook accounts are not yet treated as approved for the required Page permissions.

## What Business AI does with Facebook

Business AI lets a business connect a Facebook Page it is authorised to manage. The business can generate marketing content from its own approved Business Knowledge, review it, and publish or schedule it to the selected Page.

The product also supports a deliberately owner-enabled fully automated mode. That mode is protected by the stronger owner/AAL2 path and remains subject to Business AI publication limits, tenant isolation and the selected Page connection.

No permission is used to access unrelated users' private content, contacts or messages.

## Permission explanations

### public_profile

Purpose: identify the Facebook user completing OAuth so the Business AI connection can be associated with the authorised login.

Data used: provider user identifier only for connection/account handling.

### pages_show_list

Purpose: retrieve the list of Facebook Pages available to the authorised user. Business AI uses the server-returned list so the user can select the Page Business AI may publish to.

Why it is necessary: the browser is not allowed to invent or directly assert a Page ID. Business AI only stores Page records returned by Meta for the authorised user.

### pages_read_engagement

Purpose: read a small set of recent posts from the selected Page.

Why it is necessary: recent Page-post context is used to reduce repetitive Marketing output and support publication context/status. Business AI does not use this permission to build advertising profiles or access unrelated Pages.

### pages_manage_posts

Purpose: publish approved Business AI Marketing content to the selected Page and manage supported scheduled Page posts.

Actions implemented:
- publish text post;
- publish photo post;
- create supported scheduled Page post;
- cancel a supported scheduled Page post.

The selected Page and connection are tenant-scoped.

### business_management

The current stored Pilot token reports this permission. Before App Review submission, confirm whether the active OAuth configuration still requests it and whether Meta requires it for the exact implemented Page flow.

If it is not necessary, remove it from the requested scope set before submission. Do not request broader access merely because an existing admin token happened to include it.

## Reviewer demonstration

Use a dedicated reviewer/test Page where possible. Do not publish review content to a real customer's production Page.

Suggested recording:

1. Sign in to a reviewer Business AI Pilot account supplied through Meta's secure reviewer-credential field.
2. Open Marketing.
3. Choose Connect Facebook.
4. Complete Facebook consent.
5. Return to Business AI and show the server-discovered Page list.
6. Select the review/test Page.
7. Generate a harmless clearly labelled review Marketing draft.
8. Show that the draft is not published merely because it was generated.
9. Approve it as the owner.
10. Publish it to the designated review/test Page, or demonstrate scheduling if that is the permission path being reviewed.
11. Show the resulting publication status in Business AI.
12. Show Disconnect Facebook and explain that disconnecting removes the stored Meta connection and provider tokens.

For `pages_read_engagement`, also show the selected Page having recent posts and explain that Business AI reads only a small recent set for repetition/context.

## Reviewer access

Reviewer login details must be entered only into Meta's reviewer access / notes fields. Never commit reviewer passwords, Facebook credentials, tokens or backup codes to this repository.

The reviewer Business AI account should have:
- access to the Pilot;
- owner role for a reviewer/test business;
- AI Marketing entitlement;
- ability to complete the owner security step-up if Meta review requires fully automated mode;
- no access to unrelated customer tenants.

The Facebook reviewer identity must have access to the designated test Page.

## Data handling and security notes

- OAuth state is random, hashed before storage, expires after ten minutes and is single-use.
- Meta user/Page tokens are encrypted server-side with AES-256-GCM.
- Token-bearing database tables are not exposed to authenticated browser reads.
- Page IDs are accepted only from accounts discovered server-side from Meta.
- Tenant scoping is applied to connection, Page selection and publication records.
- Disconnect deletes the Business AI Meta connection and cascades the stored social-account/token records.
- Publishing uses durable publication records and idempotency controls to reduce duplicate posting.
- Marketing prompts are intended to contain business/marketing information, not customer personal or sensitive information.

## Data deletion and privacy

The Meta app has a public privacy-policy URL and data-deletion instructions configured in the Meta app settings.

During review, confirm those URLs are still publicly reachable and match the current Pilot legal pack.

## Submission blockers still requiring Meta-console work

- Choose the exact permissions to submit after confirming least privilege, especially `business_management`.
- Complete the usage explanation fields.
- Upload reviewer recordings.
- Provide reviewer credentials/access through Meta's secure form.
- Complete any App Review / Advanced Access submission.
- Complete Access Verification or business/individual verification if Meta requires it.
- Do not accept Tech Provider onboarding unless Business AI deliberately decides to serve other businesses under that Meta designation and accepts its requirements.
- After approval, retest Facebook connection using an unrelated normal account rather than an app admin/developer account.
