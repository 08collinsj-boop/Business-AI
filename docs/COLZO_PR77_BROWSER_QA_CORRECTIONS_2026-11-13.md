# Colzo — PR #77 independent browser QA corrections (13 Nov 2026)

Source of findings: `Colzo_PR77_Independent_Browser_QA_2026-11-13.html` from the independent Work browser acceptance pass (owner sign-in + MFA, two pre-MFA reproductions). Tested baseline was commit `37e5ef8a7f7cc18f8b70c106fba1c22d68e0e486`. **Browser retest remains outstanding.** Do not treat this coding work or automatic Preview READY state as a new QA pass.

## QA-001 / P1 — pre-MFA business data in document (fix candidate)

**Evidence:** two password-only owner sign-ins exposed enquiry and booking text in document/accessibility snapshots under the blocking MFA dialog. No server-side AAL1 bypass was demonstrated.

**Cause identified in source:** `index.html` switched to `auth-ready` and began `loadAll()` before separate `assets/security-center.js` used `enforceExistingMfa()` to open an MFA dialog. Business records could therefore hydrate/mount before the overlay and remain readable to normal accessibility/document inspection. A visual overlay or inert background is not a privacy boundary.

**Correction:** `handleSession()` now clears previously loaded business state and DOM immediately upon entering `auth-pending`. After the account-level legal status response, but **before** invitations, business onboarding/configuration, business records, PWA registration or `auth-ready`, it requires `window.colzoRequireWorkspaceAal2()`. That helper uses the existing Supabase Auth verified AAL session and real TOTP challenge (or pre-workspace enrollment); after the challenge the app independently confirms AAL2 and the same authenticated user. If unavailable/cancelled/invalid, it remains locked and does not call business APIs. Existing server `requireBusinessMember` AAL2 requirements for the scoped Preview are preserved unchanged. Account legal/recovery remain accessible without tenant records.

**Unit evidence:** `tests/colzo-pre-mfa-document-boundary.test.mjs` (initial red, then 5/5 green) covers waiting/cancelled MFA without tenant reads, legitimate verification with exactly one load, stale AAL1/mismatched assurance, missing security code fail-closed, and helper presence. Existing pilot-expiry fixture updated to emulate the **real** required pre-workspace MFA contract instead of silently bypassing it.

**Browser acceptance required:** test cold sign-in and logout/re-login, both with TOTP empty and after a failed code, inspect the entire DOM, accessibility tree and any cached state for business records; verify protected API responses return expected non-sensitive denial for AAL1; then complete genuine AAL2, confirm correct tenant and a single data hydration. Repeat on desktop and mobile. This source-only change must not be marked resolved until actual browser evidence supports it.

## QA-002 / P2 — controls/glyph consistency (fix candidate)

`assets/colzo-connected-workspace.css` now scopes a consistent Graphite/Volt secondary-button family to Company Workspace, My Work and Work Hub, with coherent hover, focus, disabled styles and 44px minimum height. Company Workspace card text glyphs, including unsupported arrow corners, are replaced with vector SVG strokes via `companyToolIcon` in `assets/colzo-native.js`. The ClickUp unavailable state and role limits are unchanged.

**Retest:** compare real rendered Company, My Work and Work Hub screens with screenshot evidence E01/E02/E03/E05 at normal zoom. Check no missing-glyph boxes and keyboard focus remains visible.

## QA-003 / P2 — desktop Home composition (partial refinement, sign-off pending)

Desktop Home greeting/header now offers **real** `Add action` and `Create booking` routes that open the existing validated task and booking forms; no sample tasks are created. The top command palette trigger presents a larger, truthful **Search Colzo tools** affordance (this is tool navigation, **not** a new universal business-data search). The desktop Settings entry is anchored toward the sidebar footer. Existing attention-row links retain their correct live destinations and remain limited to real metadata rather than fictional reference content.

**Retest:** compare with approved Stitch screenshot R01 using actual E01 app viewport size. Confirm functionality of both creation actions, command palette focus/search and the sidebar/footer hierarchy. Full pixel/interaction equivalence and attention-row contextual controls are **not yet approved**; record any remaining differences explicitly.

## QA-004 / P3 — narrow header touch targets (fix candidate)

New max-width 919px CSS gives both menu (`.cn-wordmark`) and search (`.cn-command-trigger`) minimum 44×44 CSS-pixel hit areas with keyboard focus. Verify no target overlaps on real iPhone/Android viewports, with safe-area insets, keyboard and browser zoom; desktop zoom is not physical phone evidence.

## Explicit NO-GO boundaries

- Neither PR #76 nor #77 may be merged and **Production stays unchanged**.
- No billed services, real-customer data changes, pilot activation, privileged Preview config or hosted SQL in this correction.
- ClickUp and individual assignments remain blocked by absent Development tables/column and the separately approved backup/migration gates.
- Real authenticated admin/staff/second-tenant permissions, server replay/revocation, mobile, backup/restore and operating/privacy sign-off remain incomplete.
- A successful regression suite and automatic protected Preview build are **not** final pilot acceptance.
