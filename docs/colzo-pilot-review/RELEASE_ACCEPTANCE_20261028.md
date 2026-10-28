# Colzo protected Preview release acceptance — 28 October 2026

**SECURE 14-DAY PILOT: NO-GO. No real business can yet be signed off for onboarding.**

This continuation deployed the explicitly approved runtime commit and advanced managed database acceptance. It did not repeat development, seed another persistent demonstration, activate a real pilot or change Auth configuration. The full fictional business journey is gated on security acceptance and was not falsely marked complete.

## Approved release

PR #65 was freshly verified draft/unmerged at `7a51d607164edb5ea61b1447fa193976d133ac29`, with no newer work. Local checkout was clean. Deployment was created once from that exact SHA, retaining the existing branch and repository ID.

- Preview: https://business-8yir63npg-buisness-ai1.vercel.app/
- Deployment: `dpl_AdmMxMJx2bxeoZJ69RVPq3xVr1Qi`, READY, target Preview (API target null).
- Project: `prj_d5DuC65u4hSITFRC54ygswiMW9ST`; team: `team_rCWQ41TMWjGseuzS4IDTsbZ4`.
- Runtime tree: `eef628be1705fe762a8c2c505f4b2d1bc167276e`.
- Preflight checked all 23 branch-specific Preview settings, exact Development URL/ref, distinct public/server credentials, retained `all_except_custom_domains` SSO, nine empty provider/scheduler keys, disabled paid/voice/publish flags and empty crons. Modern server keys are opaque rather than project-ref JWTs; the actual new-host sign-in, Development last-sign-in record and existing-record visibility verified the working Development path. No secret value was printed or copied to this record.
- Independent unauthenticated HTTP request: 302 to Vercel SSO. No bypass/share link created. Production deployment ID and SSO configuration matched before/after; Production was not deployed or promoted.
- Deployment evidence: `log_RPfOywojz97-`, `log_EGs_cwz_1RUa`, `log_L4HQplIAyEFM`, `log_ib5mBQ3cG406`.

## Automated evidence retained

The approved runtime's previously completed `npm run verify` remains **1,412 passed, zero failures/skips/cancellations; build passed; static/secret checks passed for 360 JavaScript files**. No application code changed in this continuation, so that full suite was not needlessly repeated. The new results below are separately executed managed-database and browser results, not additional Node-suite passes.

## Managed database acceptance actually executed

Executed a single rollback-only transaction, then extended it with real fixture-row visibility checks and ran the extended transaction. The initial 26 checks passed; the final expanded **32-check run passed**. Do not add those counts together: the latter includes the former.

The checks run under the actual managed PostgreSQL `authenticated` role, with transaction-local `auth.uid()` claim settings. These are explicit database-role simulations, **not Supabase-issued JWTs or two logged-in browser identities**.

| Managed case | Actual result |
| --- | --- |
| A and B own fictional leads, bookings and knowledge facts | Own fixture row visible in each direction |
| A and B querying the other's fixture IDs/business IDs | Zero rows for leads, bookings, knowledge and Marketing in both directions |
| Cross-business lead UPDATE attempts | Actual SQL rejected with insufficient privilege in both directions |
| Customer table direct browser-role access | Authenticated SELECT privilege absent; server-only boundary retained. This is not acceptance of the server-side Customers API under both real users. |
| Active fictional expiry workspace | Access predicate true and fixture lead visible |
| One microsecond before expiry | Access predicate true and lead visible |
| Exact expiry boundary / one microsecond after | Predicate false and lead hidden, with the same transaction-local identity still set |
| Revoked fixture grant | Predicate false and lead hidden |
| Removed fixture membership | Predicate false and lead hidden |
| Retention | All three inserted fictional leads still existed for trusted inspection after denials; expiry did not delete them |
| Original grants/audit/invitations | Compared unchanged within transaction; follow-up readbacks unchanged after rollback |

All added rows were clearly fictional, including sample `example.invalid` addresses. No existing customer content was inspected for these tests. No existing row, grant timestamp or membership was overwritten/deleted. Explicit negative bigint IDs avoided advancing lead/booking identity sequences. The temporary expiry workspace and its default lifecycle row were uncommitted; no real pilot or durable new demonstration grant was activated. No Auth users, emails, provider requests, jobs or invitations were created.

Final executed SQL SHA256: `9febdb27e9d53c8f44e40cfc6a2b09e48e77acafbdc133eee54956dceaccb4e1`.
The accompanying `MANAGED_ACCEPTANCE_ROLLBACK_20261028.sql` is a parameterised archive: four private identity/business mappings are replaced with transaction/session settings. It is not a byte-identical approval packet or permission to run elsewhere. Original executed packet is preserved privately in the task workspace.

Evidence: initial run `log_5v63nZTOMWX_`; final 32-check run `log_c9I87kgskjWX`; rollback readbacks `log_cM2ZNMKCbLWK`, `log_weZvHURLvjkn`. Final fixture-business/lead/booking/source/Marketing counts are all zero; original grant count 1, private grant-audit count 1, invitations 0.

## Browser and account results on this deployed host

| Case | Result and limits |
| --- | --- |
| Actual secure owner sign-in | PASS: original four enquiries/five bookings/two open actions and saved fictional names visible |
| Billing correction | PASS: rendered approved-features-only wording; read-only screen, no checkout, Stripe customer/subscription not linked |
| Missing application authentication | PASS: direct private `/api/leads` navigation returned `Authentication is required`, despite hosting access |
| Sign-out | PASS: real UI returned Welcome back; a full reload stayed signed out |
| Backend sign-out state | PASS: actual demonstration Auth session count went from 1 to 0; refresh-token row count then 0 (`log_clh9sP4i4D3j`) |
| Fresh reauthentication | PASS: secure sign-in again restored the same workspace/records; no grant restart |
| MFA on the demonstration identity | BLOCKED: zero verified factors. Account Security says Not enabled. Enrollment/challenge not performed; older identity's one factor is not substituted. |
| Invalid recovery route without a session | PASS: displayed invalid/expired reset-link message. This is not an old-token replay or completed genuine reset. |
| Current-host password recovery | BLOCKED: exact host/root and recovery route are absent from Auth allowlist. No reset email sent; no password entered or changed. |
| Operator identity | Live `/api/legal-public` returns `identity_configured:false` and blank name/type/address/email/phone fields. No support delivery/ownership pass claimed. |

Original demonstration grant remains `2026-10-27T18:08:54.676335Z` to `2026-11-10T18:08:54.676335Z`, exactly 336 hours. Original fictional records and earlier FAQ/refusal/requested-booking/customer-persistence acceptance are carried forward within their original scope. Prior user-confirmed physical Safari and password-reset results are not reclassified as new-host or MFA acceptance.

Colzo checks each presented application token through Supabase `/auth/v1/user` before using its identity, and resolves membership from the database on each request. Current Supabase documentation/source supports that approach for session-ended checks; it does not justify counting an unexecuted token replay as a pass. No speculative replacement session system was added. References: https://supabase.com/docs/guides/auth/server-side/advanced-guide and https://github.com/supabase/auth/blob/master/internal/api/auth.go.

## Remaining gates and precise next actions

1. **Owner-operated MFA:** enroll and verify an authenticator on the actual demonstration/intended pilot test identity. Account Security is prepared without starting enrollment or exposing a QR seed. Then execute the real pre-MFA denial, AAL2 success, privileged-operation denial and reauthentication tests. Browser credential-change rules require the owner to complete enrollment, not the agent.
2. **Real-session replay and two-user API/browser acceptance:** database-role isolation/expiry tests passed; actual issued access/refresh-token replay, expired-session refresh, AAL2 sessions and two authenticated users remain unexecuted. Only one approved demonstration grant exists. A second approved fictional workspace/identity arrangement is needed for two independently usable scoped sessions; do not silently designate or rewrite the older workspace, create another account, or substitute fabricated JWTs. No second real pilot is authorised.
3. **Separate Development Auth approval:** proposed packet `PREVIEW_AUTH_REDIRECT_20261028.PROPOSED.json` changes only `site_url` to the new Preview root and appends that root and `/?auth=recovery` to all seven retained allowlist entries. All SMTP/MFA/JWT/session/provider fields stay unchanged. Sender/subject are already Colzo; rotation is enabled and access-token expiry is 3600 seconds. No patch applied. After approval, fresh preflight/diff/readback and a genuine owner-operated email-link/reset are required. Password entry/confirmation/submission remains owner-only.
4. **Operator decisions:** approved legal/trading identity/type, publishable service address, verified support email/phone, pilot addendum acceptance and concrete data-return/deletion/retention arrangements remain missing. The existing documented support address is not replaced or treated as delivery-verified. No home address, retention period or legal promise is invented. Updated the stale draft addendum's deployment/provider paragraph to match this actual protected no-provider Preview; it remains draft, not published or accepted legal terms.
5. **Final fictional full journey:** execute after the above security gates pass, using the accepted release and authorised fixture identities. It was intentionally not run ahead of those gates. One real business still requires its own authority/scope/identity decision and separate activation approval.

No code defect was established by the tests in this continuation; no application behaviour, SQL function/policy or Auth configuration changed. Only evidence/templates and stale draft-document facts were updated. Full actual-source backup/restore remains deferred to public launch as previously directed. No merge, Production change, account removal, real activation, invitation, customer email, SSO weakening, paid-provider operation or additional spend.
