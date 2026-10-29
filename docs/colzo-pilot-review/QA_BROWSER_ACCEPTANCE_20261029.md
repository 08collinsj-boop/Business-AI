# QA browser acceptance continuation — 29 October 2026

Secure real-business pilot: **NO-GO**.

Starting PR head: 503ef0fb0ae03a3d5e54deb7825c55846b140d34. Approved Preview runtime remains adecce31b88f5c1ffd623480524996cb5ae91581. No deployment was performed.

## Account and MFA boundary

The Work browser initially showed the normal Colzo login page. The existing QA owner 08collinsj+colzoqa@gmail.com signed in through secure browserAuth; the agent did not receive the password. The normal UI then showed the owner workspace, and Settings identified **QA Example Garden B — TEST ONLY**.

Account security finished loading and displayed **Two-step verification: Not enabled**, **Add an authenticator app**, and **Set up authenticator**. No setup button was submitted, factor generated, seed/QR/code inspected, or authentication protection bypassed. The user requested skipping MFA because they reported testing it yesterday. That report is retained as user-reported historical evidence; it does not establish verified MFA/AAL2 for this specific QA account.

The preceding read-only Development check in this conversation returned the exact QA Auth user b8cb079d-792e-4810-8218-0f9d442c521a, zero verified factors, one session and zero AAL2 sessions. That snapshot preceded the new browser sign-in and must not be treated as a post-login session count.

## New executed normal-browser observations

Using the authenticated QA workspace, navigated through the normal UI and waited for loading placeholders to resolve where present:

| View | Observed completed state |
| --- | --- |
| Customers | 0 saved customers / 0 records; no saved customers; no matching enquiry contacts |
| Enquiries | 0 enquiries; New, In Progress and Won all 0; normal empty-state message |
| Bookings | Recorded bookings 0; Active/All/Completed/Cancelled all 0; October 2026 calendar and no matching bookings |
| Business Knowledge | 0 approved facts, 0 awaiting review, 0 sources; normal empty-state message and Add fact control |

These are authenticated UI-rendering observations for the intended QA workspace. They are **not** captured HTTP status evidence, populated-row positive read proof, independently inspected Supabase-issued JWT claims, bidirectional tenant isolation, foreign-ID replay, protected-write acceptance, or token replay tests. No hidden runtime/token access or synthetic SQL identity was substituted.

No business records, grants, memberships, permissions, Auth settings, billing settings, paid provider settings or SSO were changed. No live revoke, invitation, real pilot activation, merge or deployment was performed. Existing tests/evidence were retained without broad reruns. Only this documentation file was added.

## Remaining acceptance

- QA private MFA/AAL2 remains deferred and unverified for this account.
- Genuine two-account issued-JWT/API own/foreign reads and protected writes, raw business-ID replay and stale-token tests remain incomplete.
- Live revoke requires fresh preflight and separate final-exact-byte approval after prerequisite acceptance. Current proposed SQL SHA256 remains 1bfb70bc564989f529d4c9bb0c448dcba7dd666c3c5e31d8c26675554ba427d3; do not use superseded hashes.
- Post-revoke denial, true live expiry, operator/contact and legal/DPA/export/deletion/backup/retention decisions remain outstanding.

Source baseline: https://github.com/08collinsj-boop/Business-AI/pull/65#issuecomment-6494076541
