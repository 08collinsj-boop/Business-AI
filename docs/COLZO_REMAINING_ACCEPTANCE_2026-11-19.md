# Colzo remaining acceptance and proposed QA role operator

External pilot **NO-GO**. This draft is based on PR #79 at `343ad1e4`.

## Verified candidate and preserved evidence

PRs #77, #78 and #79 were checked as draft and unmerged at `206bbf90`,
`53e2f77a` and `343ad1e4`. The protected PR #79 deployment
`dpl_JA3joZn1pGmHpvohmB4b3TPfboha` is READY at `343ad1e4`.
Project SSO protection is enabled.

The live owner MFA, Settings correction at 1363×936, Team/Customers reads,
seven unauthenticated private-route denials, immediate private-DOM clearing,
second-tab logout and reload denial retain their tested scope. Historical
57 Data API observations and selected token checks retain their original scope.
Earlier core workflow and synthetic Chromium passes are preserved.

The approved fictional Development grant renewal is complete, audited and expires
on 3 December 2026 at 21:59 UTC. Development authentication configuration for
PR #79 is complete. Neither needs another approval for the completed action.

## Source correction for in-flight logout responses

Four deterministic tests executing the actual private API helper reproduced
responses or authentication completions crossing a logout boundary. A delayed
error-body decode could start MFA or token verification, a completed MFA step
could retry an old request, a completed session lookup could send the old token,
and a failed token-verification result could sign out a replacement session.

The correction rechecks the existing private-data generation after each of those
asynchronous boundaries. The four added regressions pass. Live replay,
independent revocation and natural JWT expiry still require legitimate sessions
and supported private instrumentation on an approved deployed candidate.

## Proposed operator capability

`colzo-pilot-review/qa-role-operator.PROPOSED.sql` adds an operator-only
`set_qa_role` function. It changes an already accepted fictional QA membership
between Member and Admin and records an immutable audit receipt atomically.
It reuses the existing replay and active-grant locking functions, checks the
expected role, rejects stale retries, requires confirmed email and verified
MFA for the owner and QA recipient, and retains the two-seat capacity.

The recipient must be one of the authorised `+colzoqa2` or `+colzoqa3` aliases,
belong to exactly one business and have an accepted invitation for that business.
Ordinary application roles and service_role have no execute permission.

The proposal sits outside automatic migrations. The Development project setting
is an operator assertion. It must be backed by independent verification of the
actual connection target `mvwseobgkexzpmmkgcxe` before installation and use.
The exact proposed SQL and each consequential access change require approval.
Automatic Vercel deployment is disabled for this draft branch.

## Supported provisioning sequence after approval

1. Complete legal acceptance for the intended QA recipient with action-time
   owner approval. Preserve the independently enrolled MFA factors.
2. Use the existing audited private `invite` and `accept_invite` procedures to
   admit the confirmed alias 2 as Member. Keep invitation material private.
3. Install the exact proposed role function on Development after approval and
   invoke it as the existing pilot operator to promote alias 2 to Admin.
4. Use the Admin session for role tests, then restore Member through the same
   audited function for Member tests. This uses the existing two-seat capacity.
   Testing alias 3 separately requires confirmed email, separate genuine MFA
   and an approved audited seat handover. No seat-limit change is proposed.
5. Authenticate the existing Business B owner separately. Its workspace requires
   a separately approved active fictional grant if one is absent.

Latest read-only fixture state still has alias 1 as confirmed Business B Owner
with verified MFA, alias 2 confirmed with verified MFA and no membership, and
alias 3 unconfirmed with no MFA or membership. The operator role is NOLOGIN,
has one existing member, and its invitation procedures deny execution to anon,
authenticated and service_role.

## Remaining external evidence

The separate fictional connected-workflow demonstration already exists in draft
PR #80 at `fd42097d`. It has no provider connection and does not satisfy live
ClickUp or LeadConnector acceptance. Preserve that work rather than rebuilding it.

The private recovery repository's current readiness document still describes
preparation only. Its independent prerequisites are an owner-controlled offline
decryption identity, masked Development export credentials covering managed
schemas, actual Storage-byte access, private destination upload authorization,
verified free capacity/quota, and configuration recreation instructions. This
does not invalidate later partial Chromebook/archive evidence. Neither source
establishes a complete independent Auth/Storage restore. No backup run or paid
runner was started.

- The separate role/tenant sessions above, private token/revocation instrumentation
  and natural expiry, plus a hosted retest of this draft's race correction.
- Genuine authenticated iPhone Safari and exact hosted desktop sizes. Existing
  synthetic Chromium dimensions continue to count only within fixture scope.
- Remaining Stitch dashboard comparison on the approved authenticated candidate.
- Independent compatible Development database restore, including roles/extensions,
  Auth/MFA, Vault/key dependencies and actual Storage bytes. The Chromebook task
  remains deferred. Archive integrity and synthetic restores retain their scope.
- Complete tenant data return and erasure evidence. Partial draft export and
  non-executing deletion review remain accurately described.
- ClickUp's exact SQL/configuration approval after recovery, a fictional provider
  workspace and real OAuth/action/revocation acceptance. LeadConnector remains
  authoritative for CRM/appointments and requires an authorised test sub-account.
- Public operator identity/contact, backup cover, response/incident exercise,
  policy/DPA/subprocessor approval and participant consent. Sole-trader structure,
  primary support/incident ownership and morning/evening support checks were
  already agreed. Their operational receipts remain open.

## Regression results on this draft

- Full Node suite: 1,976 passed, zero failures/skips (including 11 new operator
  database tests and four new logout-race regressions).
- `verify:local`: 468 JavaScript files verified, no secret-pattern or temporary-marker failure.
- Synthetic Chromium MFA suite: four viewport sizes passed.
- Synthetic Chromium native workflow/logout suite: seven viewport sizes passed.
- These fixture results do not establish live role acceptance, hosted race
  acceptance, genuine iPhone Safari or refreshed Stitch parity.
