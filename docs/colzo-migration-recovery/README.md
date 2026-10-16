# Colzo applied Dev migration source - archive only

This folder contains checksum-verified historic SQL retrieved from the applied migration history of Business-AI-Dev, project `mvwseobgkexzpmmkgcxe`.

**These snapshots are NOT a production migration plan. Never run or automatically apply them.** They intentionally live outside `supabase/migrations/`.

- `20261012223925` - Colzo Clients/Projects/Quotes historical Dev schema. Digest: `29a7e140c2d3b387dab4f68fb6f305bbc6aaebb7df04fd75bc35ba06a76ba410`.
- `20261016153313` - **DEV ONLY** synthetic WhatsApp inbox tables. Digest: `1e3ea3593d9814c348977a2ee5d7c62a245cb5dbba3e2e014a2ab979b274536c`. Never migrate it to Pilot or Production.

Use `node --test tests/colzo-migration-snapshot-integrity.test.mjs` for checksum and tamper verification, then `node scripts/colzo-recovery-evidence.mjs` for a read-only status report. The latter returns BLOCKED and a nonzero exit while a real backup and segregated restore have not been verified.

Remaining requirements: independent catalog/RLS/constraint drift audit; reviewed forward-only Colzo production migration design; verified database backup; backups or recovery of all required objects in business-knowledge, marketing-images and business-profile-media; isolated restore drill; user-approved release and cost limits.

**Public launch NO-GO. No database or customer-data changes made.**
