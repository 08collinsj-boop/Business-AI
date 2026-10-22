# Colzo - customer portal tenant-join hardening (21 October 2026)

**Scope:** existing Development Preview. Feature branch fix/colzo-customer-portal-tenant-joins-20261021, based on commit cf38df4c0488b285a7a5cc0371d660ca7b246ee0. No Production, database modification, real account creation, external AI calls, payments or owner legal acceptance. Backups/recovery deliberately excluded at the user's request.

## Reproduced defects and fixes

The customer portal relies on a server-side service-role database connection after Supabase Auth verifies a customer. Service-role reads bypass row-level security, so joined records must be checked for tenant ownership before returning customer-visible data.

1. Cross-business record mismatch: an inconsistent customer enquiry grant referring to business B while the corresponding lead belonged to business A could combine the lead's message with business B's profile. A synthetic regression failed before the patch. The handler now discards any record unless the access grant, lead and business setting IDs all match exactly.
2. Cross-business review action: a completed request-review action owned by another business could be used to show a review link for the same lead ID. A synthetic regression failed before the patch. Only completed review actions whose business ID equals the authorised lead business ID now qualify.
3. Parallel first-visit profile creation: two simultaneous authenticated customer GET requests could both see a missing profile; the second INSERT returned HTTP 409, surfaced as HTTP 503 in the Customer Portal. A synthetic race regression failed before the patch. Profile creation now ignores duplicate inserts and reads the actual existing profile if another request won the race. It never replaces an existing name with a blank default.

Changes preserve public JSON response structure, authentication boundary, displayed status, existing account registration and all approved UI.

## Test evidence

- New tests/colzo-customer-portal-tenant-joins.test.mjs verifies normal lead display, mismatched-business link exclusion, cross-business review exclusion and parallel first-profile race. Three new tests were observed failing beforehand.
- New tests/colzo-customer-portal-two-users.test.mjs verifies independent mocked Supabase authenticated identities only receive their own enquiries, with invalid token rejected before any customer record read. Tests are synthetic, not live two-account sessions.
- tests/colzo-safe-shell.test.mjs still locks the original authentication, Leads and billing modules to their known bytes. The customer portal now has an intentional Development-only security change, so this legacy visual-only guard no longer claims that module is byte-identical to the old release; it verifies tenant-join intent alongside executable tests.
- Full available local suite: 1,155 PASS, 0 failed/skipped across 182 test files, excluding known PGlite memory-blocked migration test. Build and static verification pass.
- Earlier real Dev read-only RLS tests with nonmember synthetic JWT subjects are not a substitute for two signed-in business identities.

## Remaining acceptance

**Public free beta is NO-GO.** Real customer registration/email confirmation, two independently authenticated Dev business sessions, cross-tenant positive and negative end-to-end cases, customer-to-owner enquiry persistence, iPhone Safari keyboard/VoiceOver, commercial hosting/ICO/support and Supabase password breach protection decisions still require attention.

Backups and recovery remain a separate unresolved launch gate, intentionally not undertaken in this task. Do not mark them passed.
