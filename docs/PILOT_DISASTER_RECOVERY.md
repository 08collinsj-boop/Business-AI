# Pilot disaster recovery and backup runbook

Last verified: 5 October 2026.

## Current Pilot state

The Pilot database and application services are healthy. Supabase's management backup inventory currently returns no managed backup entries for the Pilot and point-in-time recovery (PITR) is disabled. WAL-G being enabled internally must not be treated as a user-restorable backup guarantee.

This means the Pilot does **not** yet have a verified provider-managed restore point. A destructive restore drill must not be run against the live Pilot.

## Launch gate

Before paid public Production launch, Business AI must have a documented, provider-supported backup configuration and one successful restore drill into an isolated recovery target. Production and Pilot remain separate environments.

The restore test must prove both database recovery and application usability. Supabase database backups do not by themselves guarantee recovery of uploaded Storage objects, so private Knowledge and Marketing media need a separate recovery/retention decision before Production launch.

## Recovery procedure

1. Declare the incident and stop risky writes using the existing incident controls where appropriate.
2. Record the incident start time, suspected affected systems, last known-good time and current deployment/database versions.
3. Do not overwrite the live Pilot as the first recovery action. Restore into a separate recovery project/branch or other isolated target supported by the provider.
4. Restore the newest appropriate provider backup or PITR point once a managed backup capability is enabled.
5. Restore or re-link required Storage objects using the documented Storage recovery method. Missing objects must be treated as missing data, not silently recreated by AI.
6. Run the normal verification suite and smoke-test authentication, tenancy, Leads, Actions, Bookings, AI Receptionist, Knowledge approval, Marketing and Billing read paths.
7. Verify tenant isolation before allowing customer access.
8. Re-apply any deletion/anonymisation decisions that a restore has legitimately reintroduced from an older backup.
9. Only cut over after the recovered environment has passed the checks and the incident record documents the decision.
10. Keep the failed environment isolated until evidence needed for diagnosis has been preserved.

## Retention is not automatic deletion

`business_data_lifecycle_policies` contains review periods, not hard-delete timers. Current Pilot defaults are 365 days for lead review and 730 days for audit review. The operator reviews expired records and deletes/anonymises only where there is no continuing service, dispute, security, legal or other documented need.

Do not add an unconditional cron hard-delete to satisfy retention. Several lead-related records intentionally use restrictive foreign keys, and legal/security holds may require selective retention. Any future automated deletion must model those dependencies and holds explicitly and update the customer-facing wording only after verification.

## Restore drill acceptance criteria

A recovery drill is PASS only when: the restore completes into an isolated target; authentication works; tenant boundaries remain intact; the core owner/customer smoke tests pass; required Storage objects are accounted for; previously deleted/anonymised data is handled correctly; and the result, recovery point and recovery duration are recorded.

Until managed backups/PITR and an isolated restore drill are available, backup/DR remains a public-Production launch blocker rather than something the Pilot should pretend has passed.
