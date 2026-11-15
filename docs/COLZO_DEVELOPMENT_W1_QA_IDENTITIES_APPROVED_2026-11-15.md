# Colzo — Development W1 authorised fictional identities and controlled-access setup

**Authorisation date:** 15 November 2026, UK.  
**Project:** `mvwseobgkexzpmmkgcxe` (`Business-AI-Dev`), **not Production**.  
**PR:** [draft #77](https://github.com/08collinsj-boop/Business-AI/pull/77); leave draft/unmerged.  
**External pilot:** **NO-GO**.  
**Execution status:** **APPROVED IN CHAT; NOT PROVISIONED.** This document is an operations handoff, not access evidence.

## Scope and approval boundaries

The owner approved creating **minimum fictional Development-only QA identities and temporary test-business access grants** to enable native W1 independent AAL2/MFA role and two-business acceptance. This is **not** approval for production, real organisations/customers, external invitations, pilot launch, new billing, schema/migrations, service-key copying, provider integration activation, deletion, or unbounded access.

The original fictional Business A owner may be reused **only if** its existing live grant, account status and legitimate MFA are still valid. Required additional independent identities are:

| Identity | Required membership | Authentication | Scope |
| --- | --- | --- | --- |
| A Owner | Existing authorised owner for fictional Business A | Genuine separate verified MFA | Reuse; do not duplicate |
| A Admin | New dedicated fictional QA identity | Genuine verified MFA | Business A only |
| A Member | New dedicated fictional QA identity | Genuine verified MFA | Business A only |
| B Owner | New dedicated fictional QA identity | Genuine verified MFA | Independent fictional Business B only |

Use unique, reachable, owner-controlled private test inboxes or aliases. Before sending invites, privately verify control of each address and that it is not a real customer account. **Never record any address, password, OTP, recovery code, authenticator seed, access/refresh token, service key or private invitation link in source, PR, chat, screenshots, or audit notes.** Do not manufacture MFA factors, mark factors verified in SQL or share a sign-in session among identities.

## Read-only preflight, 15 November

1. Supabase project API confirmed `Business-AI-Dev` active and healthy at exact ref above.
2. A read-only inventory of QA/test/fictitious/demo-labelled `public.businesses` found **four** businesses, of which **one** had a currently active pilot-access record.
3. Among those labelled businesses, **one active-grant business had a member owner with a verified MFA factor**, none had a verified-MFA admin and none had a verified-MFA member. This does **not** prove the existing owner's MFA session is currently usable; it is a schema-level eligibility signal only.
4. `public.colzo_pilot_access` has a verified `colzo_pilot_exact_fourteen_days` constraint: `expires_at = activated_at + interval '336 hours'`. **Do not insert a 24/48-hour grant or alter this constraint**. A temporary QA grant necessarily has a 336-hour expiry; revoke it sooner on completion.
5. No authorising email addresses, IDs, private MFA factors or PII were extracted into this document. No DML/DDL or user/grant/configuration changes occurred.

## Provisioning sequence in authorised Work or private operator environment

1. Verify the current **actual PR #77 protected Preview** matches Development ref `mvwseobgkexzpmmkgcxe`; do not disable Vercel SSO or reuse credentials across projects. Retain verified historical W1/W2 evidence at the earlier SHA, not as current native-app PASS.
2. Confirm the existing active fictional Business A grant, owner membership, permitted MFA factor and fresh legitimate owner sign-in. **Do not change this existing owner or extend its grant without need.**
3. Privately provision **three distinct Supabase Auth users through the supported Auth Admin API/dashboard** (e.g. `supabase.auth.admin.inviteUserByEmail` with a server-side protected credential), never through raw `INSERT` into `auth.users`/`auth.identities`. Verify email ownership using the ordinary invitation/confirmation flow; enrol each factor **interactively**, challenge and verify authenticator MFA for each distinct user. If the operator lacks Auth Admin access or eligible inboxes, stop identity writes and mark blocked; no speculative SQL fallback.
4. Create/use the second independent **fictional** QA business through Colzo's supported authorised business creation flow with B Owner only. Do not switch an existing unrelated customer's business, reuse Business A's ID, bypass onboarding or populate real data. If the correct creation flow requires an unapproved migration/privileged configuration, stop and document.
5. Use existing audited Team invite/membership flow to add A Admin and A Member, checking each role and business ID after accepting. If it requires separately privileged API authorisation, do not bypass it with direct-role DML. Confirm that B Owner belongs to B, not A.
6. For B access, inspect the prior access row, grant state, existing audit trail and exact operator procedure. Use existing approved QA-only 336-hour grant model; **do not change** `colzo_pilot_access` schema, entitlements, signup or real-customer trial records. If a new grant is made, record its creation and intended early revocation **privately**. No renewal of unrelated or expired historical grants. Only a genuine authorised operator with proper audit capability may issue the grant.
7. Before running denial tests, confirm **four** separate authenticated AAL2 sessions with independent identity assertions, valid memberships and the correct business tenancy. Record redacted user count, role, expiry, policy responses and time, not IDs, secrets or account addresses.
8. Run W1 positive own-business and negative cross-business read/write tests across Customers, Enquiries, Bookings, Actions, Knowledge, Team, settings, DOM/cache and back/forward navigation. Use labelled fictional data only. Report each result as PASS/FAIL/BLOCKED and preserve earlier historical Data API scope without unnecessary repetition.
9. W2 requires **separate** authorisation for deliberate membership/session/grant revocation and a supported ephemeral private status-only token replay harness; this fixture authorisation is **not** permission to expose tokens or silently change session-security settings. Natural JWT expiry remains an independent acceptance check.
10. After testing or as soon as authorised test access is no longer required, **revoke temporary QA sessions and grants and remove temporary memberships**. Delete only newly created, exclusively QA identities and exclusively QA business rows after verifying no shared ownership, provider data or other references; use supported Admin/API cleanup and audited transaction boundaries. Preserve historical audits. Confirm old unrelated grants and identities unchanged. Document only the redacted cleanup receipt, timestamps and row counts.

## Release and verification rules

- Current status: **approved, but blocked at privileged Auth Admin identity creation and private MFA enrolment in this chat interface**. The currently connected Supabase action set offers read-only project inspection and SQL, but not the supported Auth Admin create/invite action. Do not call SQL to forge users.
- Do **not** call W1 PASS unless all four independently MFA-authenticated identities and positive/negative live protected-app tests have been observed; do **not** call W2 PASS based only on logout or old Data API tests.
- No new privileged Vercel Preview secret, OAuth client, SQL migration, stripe/billing modification, Production mutation, external pilot invitation, or customer record is authorised here. Real independent Development backup restoration stays deferred but is **not waived** as an external pilot release gate.
- Following provisioning, complete redacted evidence and write precise results to PR #77; keep both PRs draft and external pilot NO-GO pending remaining gates.
