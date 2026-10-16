# Colzo accepted Stitch designs - functional integration batch 1

Source: Colzo_Design_Handover.zip and Colzo_122_Screen_Design_Review.md, with
129-page original before/after review. Three Customer visuals were previously
approved, 107 more designs were accepted as visual references only, and the
12 initially flagged screens were withheld. Work has since proposed corrections
for those 12, but none is automatically owner-approved.

Five locked visual baselines: Home, Enquiries directory, Bookings calendar,
Booking Details and Customers directory.

## Implemented in this isolated development branch

- 001 Customer Profile: approved look with real saved customer, Overview and
  Activity tabs, linked matching enquiries, saved notes, Call/Email device
  shortcuts, Edit and Bookings navigation. Links rely on actual data only.
- 002 Add Customer: approved-style form with only stored name, email, phone and
  notes; Cancel and Save use existing tenant-scoped POST API.
- 003 Edit Customer: populated approved-style form, Cancel/Save, existing secure
  PATCH and server-backed optimistic version guard.
- 007 Quotes Directory: accepted graphite/volt styling applied to real saved
  quote records, preserving draft-only authoring and no sending capability.
- 011 Projects Directory: accepted graphite/volt styling applied to real
  saved projects, progress/status and native create/edit/detail actions.

Quote details/create/edit (#008-010) and project details/create/edit (#012-014)
remain functional from the existing Colzo backend, but visual fine-tuning is
still required to match every accepted Stitch export. No live quote delivery,
payments, phone AI, WhatsApp, new database fields or paid resources were added.

## Data and security decisions

The currently supported customer fields are full_name, email, phone, notes.
Company, customer type and location fields in the Stitch concept are NOT
present in the current persistent customer schema and are not falsely shown
as working. Customer activity is derived only from enquiries with a matching
saved email or phone, never invented.

All existing authentication, memberships, access controls, save validation,
expected_updated_at concurrency handling, quote status safeguards and server
API routes are unchanged. No Production, Pilot, Dev Supabase or live users
are accessed by the acceptance tests.

## Verification

- Full existing suite: 663/663 before five new regression tests.
- New focused design/functional safety checks: 5/5 passed.
- Synthetic real Chromium: 4/4 (375x812, 390x844, 430x932, 1366x768).
  Each exercised saved customer profile, linked enquiry, Overview/Activity,
  Edit Customer PATCH with conflict version, Add Customer POST, Quotes and
  Projects lists and no horizontal overflow. No real accounts were used.
- Full combined suite and exact committed SHA must be rerun before handover.

## Remaining batches

1. Enquiry Details/Create/Edit (#004-006) and detailed quote/project forms,
   comparing the original exported HTML to existing operational handlers.
2. Knowledge, Marketing, AI, Analytics and Settings visual parity with
   honest disabled-provider states and approval controls.
3. Authentication, security, business onboarding and billing - independent
   authenticated test journeys, no fabricated social providers or passkeys.
4. The 12 originally held screens require individually approved corrections
   and browser safe-area checks before integration.

Status: isolated draft code, not merged, deployed, or Production-ready.
