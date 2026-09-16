# Self-service business onboarding and configuration

## Scope

This foundation lets an authenticated business owner or admin configure the tenant that their server-verified membership already authorises. It does **not** create public sign-up, create businesses from a browser request, assign memberships, enable voice, or allow a browser to choose a tenant.

The forward-only migration `20260916170000_add_business_configuration_onboarding.sql` adds exactly one `business_configurations` row per business. It is applied and verified on **Business-AI-Dev** (`mvwseobgkexzpmmkgcxe`) only. Production remains unchanged.

## Configuration model

The row is keyed by `business_id` and contains business description, website, service areas, enquiry and human-handover instructions, up to 40 structured FAQs, booking preferences, enabled-module preferences, industry-template selection, and onboarding completion state.

Industry templates are code-defined, data-only defaults for general businesses, trades, automotive, personal care, lawn care, hospitality, and professional services. They prefill safe wording only. Every field remains individually editable, and a template can never alter roles, tenant selection, booking confirmation rules, or safety controls.

`voice` may appear in the module preferences for future display, but the server always persists it as `false`. Voice still requires a separate verified provider mapping and feature gate.

## API

`GET /api/business-configuration` requires a tenant membership and returns only the caller's configuration plus template metadata.

`PATCH /api/business-configuration` requires owner or admin. It uses an allowlist and size/type checks, filters the update with the server-derived `business_id`, and rejects internal fields such as `business_id`, `role`, IDs, timestamps, or user IDs.

Direct browser writes remain blocked: the table has RLS enabled, `anon` has no grants, and `authenticated` has membership-filtered `SELECT` only. The service role is server-only.

## Receptionist use

`api/enquiry.js` resolves its business server-side, then loads the matching settings and onboarding configuration. Business knowledge is treated as bounded, untrusted reference material in the AI prompt. It cannot override system guardrails, privacy, tenant scope, or appointment confirmation rules. The public web receptionist remains single-tenant-safe until a future verified public identifier/domain/widget routing design is added.

The provider-neutral voice context uses the same tenant configuration when voice is eventually enabled, but the phone system remains paused and disabled.

## First real pilot onboarding

1. Apply this migration to the chosen non-production environment and verify `supabase/verification/onboarding_configuration.sql`.
2. Ensure the pilot owner has an Auth account and an owner membership created by an authorised server-side/admin workflow.
3. Enable the existing Preview auth gates only, sign in, complete the Settings → Business profile section, and verify the public enquiry responses use the configured business facts.
4. Review the business's handover and emergency procedures before sharing the enquiry link. Keep voice disabled.
5. Before a public Production pilot, complete the documented production auth rollout, configuration migration rollout, a second-tenant isolation test, rate limiting, privacy/retention work, and a documented support/handover process.

## Future onboarding work

The next self-service expansion should add an owner-authorised business creation and membership invitation workflow, verified public tenant routing, multi-location resources, industry template versioning, a knowledge review workflow, feature entitlements, and audit logs. None should rely on editable Auth metadata.
