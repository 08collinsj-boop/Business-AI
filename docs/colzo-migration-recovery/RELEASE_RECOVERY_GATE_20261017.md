# Colzo - recovery launch gate

**17 October 2026: NO-GO for public release.** This is a safe, strictly local preflight against metadata only. It does not read customer rows, connect to external providers, perform backups or restores, or deploy/merge anything.

Run from the repository root:

    node --test tests/colzo-recovery-launch-gate.test.mjs
    node scripts/colzo-recovery-launch-gate.mjs docs/colzo-migration-recovery/dev-catalog-evidence-20261017.json

The reporting command intentionally exits with code 1 while blockers exist.
An external JSON flag can never certify a successful real restore or supply
owner authorisation. This negative gate never directly triggers a deployment.

## Checks

- Expected Business-AI-Dev project reference only; excludes Production.
- The recorded schema inventory is not older than 24 hours, and timestamp
  is not more than five minutes in the future. This is not authentication
  of the snapshot provider; it only rejects obviously stale observations.
- Expected columns, RLS, public role privileges, indexes, quote precision,
  cross-business enquiry FKs and Dev-only synthetic WhatsApp policy.
- Both historical applied Dev SQL archives have approved pinned digests.
- Automatic migration sequence still has missing SQL sources and is not
  proven reproducible; DEV-only WhatsApp SQL must stay outside Production.
- Supabase provider returned no listed backups and PITR disabled. WAL-G
  being internally enabled does not prove recoverability.
- All three Storage buckets must have separately demonstrated object
  backup coverage and reconciliation.
- A separately supervised isolated database + Storage restore is required.
- Owner must authorise the final SHA, environment, budget and launch.

## Observed result

The saved schema snapshot matched 56 of 56 checks. Two historical SQL
archives passed checksum comparison. There are zero listed backups and
no point-in-time recovery. The source migration gap, absent Storage
coverage, absent isolated restore and owner approval remain blockers.

## Needed before a positive release decision

1. Agree a safe backup, offsite encryption and retention approach. Never
   publish a database dump, service credentials or customer media in GitHub.
2. Verify a restorable database backup plus recoverable objects in the
   business-knowledge, marketing-images and business-profile-media buckets.
3. With owner approval and a known cost ceiling, restore into an entirely
   isolated target with outbound jobs, Meta/Twilio and paid integrations OFF.
4. Test schema, RLS, authorised tenancy, auth and object reconciliation.
   Record actual recovery point and time (RPO/RTO).
5. Work finishes its real Dev customer tests and the flagged Stitch routes.
6. Owner confirms contracts, commercial hosting, pricing and an exact
   approved release build. Only then design a separate positive gate.

**No database modifications, customer data extraction, charges, messages,
Production deployment or merges were performed.**
