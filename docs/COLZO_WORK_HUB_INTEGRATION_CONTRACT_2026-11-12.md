# Colzo Work Hub — supported integration contract (12 November 2026)

## What is actually implemented

Work Hub is the authenticated business entry point for supported external work software. A separate Company workspace now provides the staff-accessible entry point to shared Colzo Actions, Projects, Bookings and Work Hub. Its desktop-first catalog renders a provider card from `WORK_HUB_PROVIDERS` in `assets/colzo-native.js`, with a real connection state and a refresh control. The only provider registered now is **ClickUp**; no other external work application is connected or represented as supported. The existing authenticated `/api/clickup` routes, task UI, and mobile five-tab navigation remain. Task and list reads/writes now require the actual OAuth authorising Colzo identity (`connected_by`), as well as owner/admin rights; staff see connection status but do not gain the owner token's task privileges.

There is no background polling and no simulated task or connection state. A provider is counted as connected **only** when its verified authenticated status returns `connected: true`, loading has completed and no read error exists. Until a status is checked, the catalog reports that it is unconfirmed. A provider/API error is labelled **Needs attention** and is not counted as connected.

## Adding a second real provider

1. Build an independently authenticated, tenant-scoped connector backed by real provider responses and auditable approved actions. Keep provider tokens encrypted server-side; never pass them into browser markup or analytics. Follow the same Development-only security and operational sign-off gates as ClickUp.
2. Add state fields for that provider's authenticated status, loading and error; add server-confirmed read/refresh handlers and any permissioned actions. Do not register a provider before its backend and frontend are implemented and secured.
3. Add a descriptor to `WORK_HUB_PROVIDERS` with its `id`, public label, description, icon, `statusKey`, `errorKey`, `loadingKey` and **working** `refreshAction`. The generic catalog renders registered cards and counts without hard-coding a total.
4. Give it a distinct provider details/workflow section, preserving current ClickUp controls and `data-cn-screen="clickup"` as the existing internal Work Hub route until a separately tested route migration is approved. Do not pretend all tools support the same operations: task create/update, customer data, messaging and bookkeeping have different permission and consent needs.
5. Add tests for unavailable, unconfigured, connected, expired/revoked, wrong-tenant and failed provider responses, including source-link validation, activity logging, owner/admin vs member rights and real desktop/mobile acceptance.

## Release boundary

This UI catalog is not an approval to activate ClickUp or another provider. The exact Development-only ClickUp migration still needs a restorable backup/rollback preflight before applying it. Live OAuth, two-business tenant isolation, revoked session/token replay, genuine mobile visual verification, operational support and privacy/DPA/retention/deletion approvals remain outstanding. Keep PR #76 and #77 draft/unmerged; no Production, billing, pilot activation, real customer data or new paid services.

**External pilot decision remains NO-GO.**
