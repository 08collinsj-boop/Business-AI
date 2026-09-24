# Configurable AI handling modes

Implemented in the existing Pilot configuration and `/api/enquiry` pipeline. No deployment or remote database changes were performed.

## Behaviour

| Mode | Approved basic FAQ | Supported detailed enquiry | Personalised quote / commitment | Booking |
| --- | --- | --- | --- | --- |
| Human-first | Answer | Collect contact and hand over | Collect contact and hand over | Collect contact and hand over |
| Balanced (default) | Answer | Answer / qualify using approved knowledge | Hand over | Existing enquiry/request behaviour |
| AI-first | Answer | Progress and qualify within existing capabilities | Hand over: the Pilot has no authorised quote calculator | Existing enquiry/request behaviour; never confirm availability |

Every mode preserves emergency, complaint, high-risk, unsupported/uncertain and explicit-human escalation. The structured AI intent classification handles semantic requests; deterministic safety/human checks also run before autonomous generation. The mode policy is server-generated, higher priority than business reference data or customer history. Missing/invalid classifications fail to handover. Configuration read errors fail closed instead of silently increasing autonomy.

## Files and architecture

- `lib/business-configuration.js`: mode constants, validation, defaults, policy, server instructions and handover decision; existing template/configuration helpers retained.
- `api/enquiry.js`: trusted slug routing, configuration loading, structured intent, persistent handover continuation and existing `saveLead` integration.
- `index.html`: saved Settings radio control, onboarding question/review/persistence, always-visible customer handover control, AI disclosure. Existing Save business profile action is used; selection alone does not write. Failure retains the draft and shows an inline error.
- `supabase/migrations/20260922160645_add_ai_handling_modes.sql`: one defaulted configuration column, allowlist constraint, additional existing handover reason, transactional public enquiry persistence function. No new table.
- `tests/ai-handling.test.mjs`, `tests/onboarding.test.mjs`: policy/API/security and executable UI save/onboarding tests.
- `tests/business-creation.test.mjs`, `tests/pilot-operations.test.mjs`, `tests/migrations.test.mjs`: update existing regression assertions for atomic persistence and the additive migration.
- `supabase/verification/ai-handling.mjs`: executable disposable PostgreSQL verification using actual relevant repository schemas/migration.

Owner saves continue through `/api/business-configuration`, with verified Supabase user, server-resolved membership, owner/admin authorization and a tenant filter. No authentication helper or RLS policy was relaxed. Public requests reject `ai_handling_mode`, `business_id` and `tenant_id` body fields. Query tenant/mode values cannot replace trusted slug resolution. Existing `?business=<slug>` URLs are retained.

## Persistence and audit

The existing `saveLead` public path calls a service-role-only, security-invoker transaction that writes the existing leads/actions/handovers/history/audit tables. A per-business transaction advisory lock serialises contact matching and writes, preventing duplicate public leads and follow-ups on retries. Partial failure rolls back all those writes. The existing internal voice bridge retains its previous storage path.

The transaction reuses the existing phone/email matching rule. Existing handovers are reused, safety escalation reopens the existing action, and subsequent requests cannot downgrade an emergency. Enquiry context is preserved on the lead; audit metadata contains only the handling mode, reason and operational flags, never the prompt or transcript. Handover summaries display “Wants human response” in the existing handover UI. No outbound contact capability was invented.

A signed, expiring, tenant-bound continuation preserves a pending handover when client history is truncated. It contains no customer details, raw tenant ID or lead access capability. A saved handover also remains authoritative in the database when client continuity is omitted. Customer acknowledgements claim success only after the transaction succeeds.

## Validation

Final results: **92 tests passed, 0 failed, 0 skipped** in the full automated suite (including auth, billing/Stripe, public enquiries, tenant routing, leads/history/actions/bookings, voice, onboarding and UI controls). Disposable PostgreSQL verification passed. All API/library/test/service-worker/inline browser JavaScript syntax checks and whitespace checks passed.

Run the full repository suite with `npm test`. Run syntax checks with `node --check` on API/library/test files and extracted inline browser JavaScript. Run `git diff --check`.

The database verification uses disposable local PostgreSQL (PGlite), never a remote connection:

```sh
npm install --prefix /private/tmp/business-ai-mode-validation --no-audit --no-fund @electric-sql/pglite@0.3.14
PGLITE_MODULE=/private/tmp/business-ai-mode-validation/node_modules/@electric-sql/pglite/dist/index.js node supabase/verification/ai-handling.mjs
```

It verifies migration reruns, balanced defaults, valid/invalid values, real PostgreSQL role/RLS isolation, denied anonymous/authenticated writes and RPC execution, retry deduplication, context preservation, safety escalation, cross-tenant contact separation, zero booking creation, and transactional rollback on action failure.

## Assumptions and remaining limitations

- The existing public endpoint has no authorised quote calculator or live availability/booking confirmation tool. AI-first grants no new capabilities; its quote policy is limited by that existing capability boundary.
- Deduplication intentionally follows the existing per-tenant contact identity. A separate future enquiry from the same phone/email can reuse an existing lead/handover. No separate conversation store was introduced.
- Public requests are serialised per tenant while saving. This is appropriate for Pilot volume; higher volumes may warrant finer-grained locking with a separately reviewed identity strategy.
- Natural-language understanding and knowledge support classification still depend on the existing model. Regression tests mock model output and test server enforcement; they do not establish live model accuracy.
- PostgreSQL verification is local against the relevant repository schemas. No hosted Supabase environment was modified, and no live browser/provider smoke test or deployment was performed.
- Apply the migration to the verified Pilot database before deploying this code there. The new runtime deliberately does not fall back to non-atomic writes or ignore a configuration database error.
- The pre-existing uncommitted authentication styling in `index.html` is preserved and excluded from the implementation commit.
