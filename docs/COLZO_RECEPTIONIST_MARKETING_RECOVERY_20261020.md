# Colzo - Receptionist and Marketing recovery, Development only

## Changes
- AI Receptionist now loads tenant-scoped configuration, exposes Human-first/Balanced/AI-first modes, enquiry/handover instructions and reviewable FAQs.
- Owners/admins can edit via a deliberate authenticated PATCH of only the existing four supported fields. The server confirms the persisted mode. Members remain read-only.
- Existing human-handover records are shown with actual statuses. Acknowledge/resolve requires confirmation and a persisted server response. No customer message is sent.
- Phone provider connectivity remains a read-only status; this UI cannot provision or enable calling.
- Marketing exposes an owner-only review queue for existing drafts. Facebook drafts use the server's verified caption preview and sha256, then a separate approve action with that exact hash. No publishing or scheduling happens on approval.
- Generation, image providers, paid phone services, automated posting, database migrations and Production were not touched.

## Verification
- 157 focused existing and new Marketing, Knowledge, configuration, UI and safety tests passed, zero failures, no skipped tests.
- Synthetic Chromium browser on local committed app assets: receptionist configure/save/FAQ/handover workflow, owner vs member, mobile widths 375/390/430/768, zero page JS errors.
- Synthetic Chromium Marketing review: server hash preview, owner approval without publication/scheduling, read-only member, no horizontal overflow, zero page JS errors.
- Build, static verification and scope checks performed before Dev merge.
- Full repository test suite and hosted signed-in browser need separate acceptance before Production.

## Remaining acceptance gates
- Real Development account and multi-business tenant isolation checks, real iOS Safari keyboard and safe-area checks, concurrent Work changes, all feature combinations and full suite.
- Marketing Facebook Page connection and scheduled publishing require their own provider checks and permissions; never interpret approved drafts as published.
- Real AI simulation, live telephone calls, WhatsApp, external messaging and paid provider usage are not authorised by this batch.
