---
version: alpha
name: Colzo — Graphite & Volt
description: Premium mobile-first operations software for small businesses, preserving the original six-phone Colzo visual language.
colors:
  primary: "#C8FF2E"
  on-primary: "#142018"
  background: "#0D1115"
  graphite: "#15181D"
  surface: "#20262C"
  surface-raised: "#262D33"
  surface-high: "#303B40"
  border: "#364047"
  on-surface: "#F6F8FA"
  text-secondary: "#A7B2B9"
  success: "#87F4BA"
  on-success: "#163126"
  warning: "#FFD8A4"
  error: "#FFB9C4"
  focus: "#C8FF2E"
typography:
  display:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: -0.035em
  heading-large:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: 780
    lineHeight: 1.14
    letterSpacing: -0.03em
  heading-medium:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 740
    lineHeight: 1.3
    letterSpacing: -0.02em
  body-large:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 450
    lineHeight: 1.5
  body-medium:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 450
    lineHeight: 1.55
  body-small:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 680
    lineHeight: 1.3
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 780
    lineHeight: 1.25
    letterSpacing: 0.14em
rounded:
  xs: 8px
  sm: 11px
  md: 14px
  lg: 18px
  xl: 24px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  xxxl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 12px
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 12px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 16px
  dialog:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: 20px
  field:
    backgroundColor: "{colors.background}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    height: 48px
    padding: 12px
  selected-tab:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: 8px
---

## Overview

Colzo is a premium, trustworthy, mobile-first workspace for UK small-business owners. The aesthetic is **Graphite & Volt**: near-black carbon surfaces, cool graphite raised cards, warm-white typographic clarity and a carefully limited electric-lime highlight. It should feel like a thoughtful native iPhone productivity tool, not a gaming dashboard, neon cyberpunk concept, or another clone of the original Business AI interface.

The user-provided six-phone design reference is the visual north star: simple four-tab bottom navigation (Home / Enquiries / Projects / More), low-gloss charcoal cards, gentle green glow on selected controls, bold hierarchy, clean compact enquiry rows, clear project progress and calm settings lists. Preserve Colzo's mark, name and current brand; do not generate a new brand. The existing app is a real multi-tenant SaaS; design work is visual and presentational, not an invitation to invent business data or rewrite its security/backend.

## Colors

- **Primary accent `#C8FF2E`**: the active navigation indicator, one important action per context, status markers and compact visual highlights. Avoid overusing it.
- **Dark background `#0D1115` / `#15181D`**: atmospheric, matte black rather than flat pure black.
- **Card surfaces `#20262C` and `#262D33`**: differentiated by one-pixel borders `#364047`, subtle internal illumination, not heavy grey boxes.
- **Text `#F6F8FA`**, secondary text `#A7B2B9`: strong contrast and clear hierarchy; label text should generally be at least 12px (larger for important information).
- **Semantic colors**: green `#87F4BA` for complete, amber `#FFD8A4` for attention, rose `#FFB9C4` for errors; never use lime alone to explain a status.

## Typography

Use Inter (or system SF Pro when rendered by iOS) with a compact Apple-inspired hierarchy. Headlines are bold and slightly tight; body text is intentionally readable. Important values should use lining/tabular numerals. The existing source sometimes uses 9–11px supporting text; correct that where necessary rather than preserving unreadable labels. Avoid more than 2–3 emphasis levels within a card.

## Layout

- Mobile design first at **375×812, 390×844 and 430×932**. Native iOS-like safe areas and a persistent, non-obstructing 4-tab navigation; all content must be scrollable to the end.
- Desktop at **1366×768 and 1440×900**: spacious but not stretched, with left sidebar or appropriately adapted navigation and readable two-column workspaces.
- Minimum 44×44px tap targets (prefer 48px for prominent actions), consistent 8px spatial rhythm with 4px micro adjustments; 16–20px content gutters.
- Content is genuinely dynamic: long customer names, large lists, empty states, saving states, permission errors and long descriptions must not break the layout or obscure the nav.
- Cards typically 14–20px radius; large primary containers 20–24px. Prefer alignment and whitespace to unnecessary dividers.

## Elevation & Depth

Use subtle tonal gradients and low-opacity inner-edge highlights to distinguish surfaces. Glass/blur may be used for **navigation/header/modal scrims**, with fallback on unsupported or low-power devices. Maintain text contrast. Reserve strong green glow for the selected tab, focus ring or a key call-to-action. No overpowering bloom, full-screen blur or gratuitous shimmer.

## Shapes

Rounded rectangles with deliberate geometry: 11–14px for controls; 16–19px for regular cards; 20–24px for sheets and large hero sections; pill-shaped status chips. Crisp outline SVG navigation icons at consistent 20–22px weight, no emoji or mismatched icon families as final artwork.

## Components

Use the same component specifications on *every* screen:

- **Bottom tab bar**: Home, Enquiries, Projects, More. A moving, gently springy selection plate and corresponding lime stroke. Always above page content but below active dialogs. Restore scroll position when returning to a tab.
- **Header and navigation**: compact wordmark, context title, search, account access; nested pages have a predictable back button into Colzo rather than a link to Business AI.
- **Cards and lists**: consistent 1px borders, small raised effect, leading icon/avatar, 2-line content hierarchy, status on the right, optional trailing chevron. At least one visible action or clear empty-state explanation.
- **Forms**: native inputs, visible labels, helper text, focused and validation states, disabled and saving states. Never lose entered values when an API request fails.
- **Dialogs / bottom sheets**: modal on mobile, centred on desktop, controlled scroll and focus trap; Escape/back action; background nav must never cover Save; no surprise dismissal during saves.
- **Status chips**: clear text first; colour second. States New / In Progress / Won, requested / confirmed / completed / cancelled, Open / Completed / Cancelled etc. based on real app capabilities.
- **Calendar**: Monday-first UK locale, monthly grid with indicator dots for real booking dates, clear filter/sort controls, tap into booking details and edit.
- **Charts**: real recorded values only. Use sparing lime lines/fills with axis labels, readable units and no fabricated revenue or improvements.
- **Tool finder**: quick search for screens and actions (Cmd/Ctrl+K on desktop), keyboard accessible and disabled behind mandatory MFA.
- **Feedback**: real skeletons for async loads; no blinking/fake counters or endless spinner; clear failure retry.

## Do's and Don'ts

- Do match the original six-phone Colzo reference more closely while preserving functional progress.
- Do polish entrance, tab, card, sheet and inline-state transitions with durations roughly 180–420ms and ease-out / controlled spring curves; gestures should respond without blocking the task.
- Do respect `prefers-reduced-motion`, high-contrast focus rings, semantic controls, keyboard and screen-reader navigation.
- Do preserve the existing Supabase Auth, MFA, RLS/tenant scoping, API contracts, Stripe and Meta integration boundaries. These do **not** belong in design tool exports.
- Do provide designs for home, enquiries/detail, projects, clients, draft quotes, bookings, actions, AI receptionist, marketing, settings subpages, billing, authentication and customer-facing pages as clearly separate editable frames.
- Don't invent customer identities, revenue, plan entitlements, successful AI actions or social account connection statuses.
- Don't rebuild backend code, charge for external services, create production deployments or treat a design prototype as a functioning app.
- Don't route Colzo screens to the original Business AI UI as the final product. Unfinished controls must be clearly identified and designed as Colzo-native surfaces.
- Don't remove the existing authenticator/MFA gate or promise passkey sign-in is live. Passkeys remain experimental/feature-gated and cannot silently bypass AAL2.
