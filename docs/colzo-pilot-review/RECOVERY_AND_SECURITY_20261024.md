# GitHub recovery and scoped pilot security continuation

24 October 2026. **Draft only. Pilot invitations remain NO-GO.**

## Publishing recovery

- Original checkout, clean working tree, commit and regression evidence survived.
- Remote head was checked repeatedly at `e83b6c5d32019e33243e3adcaa86e3dcaf4c2522`.
- Native Git push dry-run still had no credentials. The separate Work integration
  had reported `403 Resource not accessible by integration`; that does not imply
  the repository owner's push/admin rights were removed.
- The existing ACTIVE Composio connection successfully wrote unreferenced Git
  trees. Active branch rules were empty; branch-protection lookup returned 404.
- Raw `public-customer.test.mjs` content repeatedly received an intermediary
  Cloudflare HTML 403, including from the remote workbench. Other raw files
  worked. GitHub's standard base64 blob API accepted the exact same 21,573 bytes
  as blob `802b1c658264f72436c8474f3f88736e012d4d61`.
- This establishes a content/transport-dependent failure on that route, rather
  than a universal GitHub write denial. A filter false positive is the leading
  explanation; the specific Cloudflare rule and why it began failing are unknown.
  No permission, account, installation, connection or protection setting was changed.
- The final Git tree matched `fddaf9a5db259449103200febeb3bc2b7841162f` exactly.
  Original author, committer, times, parent and message reproduced the exact
  commit `00e7180205bff59f07040eabfe772acbd6b6b635`. The existing branch was
  fast-forwarded without force and PR #63's description was updated, still draft.
- GitHub deployment lookup for that commit returned no deployments. The branch
  exclusions in both Vercel project roots remain in place.

## Further security changes

Business workspace requests now check the current approved pilot grant after
server-verified identity, membership and role validation. Expired, pending,
revoked, missing, duplicate, foreign or unavailable grants return HTTP 403 with
`PILOT_ACCESS_REQUIRED`. Scoped mode cannot fall back to unauthenticated legacy
membership when tenancy auth is disabled. AI allowance exhaustion alone does
not lock existing workspace records.

The gate is shared by `requireBusinessMember` and `requireBusinessAdmin`, so it
also applies to direct handlers, not just the operations dispatcher. Tests
exercise 14 representative standalone read handlers and record POST/PATCH,
including the original Leads API, bookings, actions, history, configuration,
settings, billing, add-ons, team, handovers and Colzo records. A two-business
fixture proves that a request cannot select another tenant and that expiring A
does not unlock A or suspend B.

The original authentication implementation remains byte-identical after
excluding only two exact additive denial blocks. Both original hash tests use
the same narrow allowlist. The original billing-handler hash safeguard remains.
No MFA check, paid billing path, RLS policy or migration was weakened or changed.

Team creation/acceptance/revocation mutations are deliberately unavailable in
scoped mode (`PILOT_TEAM_MANAGED`). The existing count-then-insert invitation
path cannot safely enforce concurrent seat allocation. Rather than claim that
race is fixed without a database change, all scoped mutations are denied.
Self-service business creation is similarly denied (`PILOT_PROVISIONING_MANAGED`).
These restrictions leave non-scoped behaviour intact.

Account identity verification, password recovery, factor enrolment and existing
AAL2 checks are not disabled by business expiry. Public business information,
customer-owned portal history, legal/account identity routes and separately
authenticated provider webhooks are not treated as owner workspace access.
This change does not delete accounts, factors or records.

## Verification

- Reverified original commit: `npm run verify` passed 1,259 tests, zero failures,
  skips or cancellations; React build and 323-file static check passed.
- New tests first demonstrated access after expiry and unguarded provisioning.
- Focused final security/MFA/recovery group: 33/33 passed.
- An intermediate full run found one additional whole-file auth hash assertion;
  it was corrected to retain the original-byte check outside the exact additive
  guards. It was not removed or skipped.
- Final `npm run verify`: **1,267 tests passed**, zero failures, skips or
  cancellations; React build and static verification of 326 JavaScript files
  passed. These are local synthetic results, not real-account acceptance.

## Controlled grant workflow: prepared, not enabled

No production grant endpoint or operator write script has been introduced. The
staged table and shared Dev recovery have not received independent acceptance,
so enabling a grant writer now would bypass the required release gate.

Before any future grant, an authorised operator must record a reviewable request
containing the business UUID, verified owner UUID, at most two distinct authorised
members, approving actor, reason, external approval reference, activation instant,
exact 14-day expiry and an idempotency identifier. Independently verify that the
business has no existing paid subscription; a free grant does not cancel one.

The eventual writer must atomically validate eligibility/seat capacity and write
both grant state and an append-only audit event. No grant or extension may be
reported as successful if the audit record cannot be confirmed. Revocation must
also be audited. Replays must return the original result and must not extend
expiry. Browser roles must not be able to grant/revoke access directly.

This is an implementation specification and approval gate, not proof that an
audited live grant system exists. `GRANT SELECT` alone in the staged SQL does
not revoke possible service-role privileges from configured default grants.
Independent privilege tests and verified recovery are still required before
any SQL change or operator write is implemented.

## Acceptance matrix for a separately approved Preview

| Check | Synthetic result / required real evidence |
| --- | --- |
| A active, B active | Separate fixture identities see only their own records. Repeat using two independently created, consented accounts. |
| A expired, B active | A's protected reads/writes denied; B unaffected. Verify old tabs, refreshes and direct requests on the exact deployed SHA. |
| Missing/revoked/foreign grant or storage outage | Fail-closed fixtures pass. Verify executable RLS/privileges on an independently approved disposable database. |
| Direct database access | The repository's original authenticated SELECT policies on leads/history/settings check membership, not pilot expiry. API gating alone cannot suspend such direct reads. Audit actual Dev privileges/drift and independently approve grant-aware database enforcement before enabling scoped mode. No RLS change was implemented here. |
| Roles and MFA | Member cannot gain admin access; AAL1 cannot perform an AAL2-protected action. Verify actual enrolled Dev factors, TOTP and recovery without using an older account as evidence. |
| Recovery | Identity verification survives business expiry. Test a real reset link, expired/reused link, factor recovery and resumed AAL2 on approved test identities. No factor removal is authorised. |
| Billing | Scoped mutations/provider lookups denied. Verify no card collection, no automatic conversion, no live Stripe key/provider use and no inherited paid subscription. |
| Seats and invitations | Scoped mutations denied. Independently review/approve an atomic two-seat workflow and pilot-aware acceptance, then test races and expired/replayed/foreign invitations before enabling. |
| Safari | Physical iPhone Safari and installed PWA: login, MFA, scrolling, saved records, background/resume and expiry. Not executed here. |
| Grant audit/recovery | Verify independent restore, migration drift reconciliation, privilege denials and atomic audit/idempotency/revocation. Not executed here. |

Do not merge, deploy, enable the scoped flag, execute staged SQL/migrations,
modify real customer accounts, invite users or initiate paid services on the
basis of these synthetic results.
