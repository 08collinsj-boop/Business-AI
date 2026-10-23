# Colzo free-pilot release scope - 23 October 2026

**Status: PREPARATION ONLY / PUBLIC FREE PILOT NOT APPROVED.** This page defines what is allowed into a future free-pilot release candidate, not permission to deploy.

## Deliberate scope

The free-pilot candidate is based on the existing Colzo Development app and staged QA corrections:
- Draft PR #57 (public assistant booking/FAQ and truthful customer status).
- Draft PR #58 (safe customer enquiry tracking, source attribution and owner UX).
- Draft PR #59 (accurate business knowledge source/fact statuses).

The **customer-visible business reply composer, reply history endpoint and new replies table** in draft PR #60 are explicitly **deferred to a paid-launch workstream**. Leave PR #60 draft; do not stack/merge it into the free-pilot candidate, apply its SQL migration, set `COLZO_CUSTOMER_REPLIES_ENABLED=true`, or advertise two-way messaging as available. Internal follow-up actions, already existing enquiries and other independently verified features are separate.

The automated test `tests/colzo-free-pilot-scope.test.mjs` flags any accidental inclusion of reply API registration, customer reply UI, new reply storage or migration. The test is intentionally **specific to the free pilot** and must be deliberately removed/replaced as part of the separate paid-release review. It neither modifies the database nor guarantees actual Production runtime flags.

## Claims that need real acceptance before promotion

Only advertise a feature as working after confirming it in the **exact candidate Preview** with two authorised test accounts and the correct Supabase Dev project. Do not claim email/SMS delivery, AI phone calls, automatic social publishing, passkeys/Face ID, customer portal replies, live billing or payment processing from synthetic tests alone.

For free-pilot marketing: distinguish a free, optional human-reviewed pilot from the separately documented £3.99 paid trial and monthly plans. No card/payment requirement should be claimed unless the complete real signup path has confirmed it.

## Unresolved release controls

- Preserve Production, the existing Pilot and all customer records; no merges, Production aliases, domain, env/secrets, hosting tier or billing changes here.
- Read-only metadata shows the shared Dev Supabase project has no available managed backup/PITR. A recoverable backup/restore path remains a prerequisite before onboarding real external pilot data. The user opted to defer the **reply feature**, not basic data protection.
- The Dev migration ledger differs from deployed schema: verify installed objects independently, never blindly replay DDL.
- Authenticated owner/customer flows, MFA/recovery, mobile Safari and tenant-denial tests need Work or owner-driven acceptance. A Vercel READY status and automated tests are not equivalent to live account testing.
- Confirm plan-compliant hosting and support/legal obligations before any public invitation. No paid upgrade or provider charge without approval.

## Safe technical handoff

1. Run `npm run verify` on the exact proposed candidate SHA; confirm all tests pass.
2. Verify both Vercel targets show the **same** candidate SHA and correct Dev project; read-only health/config/legal preflight must succeed. Do not reuse an unrelated branch's READY state.
3. Complete authenticated synthetic end-to-end acceptance in protected Development and physical iPhone checks. Record outstanding defects without changing real data.
4. Obtain operator signoff for recovery, lawful data handling, hosting and release scope. Only then discuss any merge or public pilot opening.

**No release authorisation or live customer mutation is implied by this document.**
