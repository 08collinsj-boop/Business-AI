# Colzo / FLUID — Motion and interaction design system

**Scope:** Owner development branch `feature/colzo-safe-shell-20261013`. The original Business AI accounts, Supabase Auth, bookings, actions, enquiries, Stripe, marketing permissions, real customer records, public enquiries and customer portal remain unchanged. The new UI works entirely on existing authorised data and links to established editing flows. No recurring animations, dependencies or paid services were introduced.

## Visual direction

The six editable Colzo Figma concepts are the visual reference (390×844), with Graphite `#0D1115`, raised panels `#20272D`, subtle borders `#364047`, white `#F5F7FA`, secondary grey `#A5B0BB`, and carefully reserved Volt `#C8FF2E`. Keep dark interfaces legible and focused: avoid gradients behind primary text, invented metrics, indiscriminate neon borders or gimmicky animation.

## Motion language

| Surface | Interaction | Duration | Notes |
| --- | --- | --- | --- |
| Owner primary nav | Sliding glass selection plate | 500ms | Spring-like cubic-bezier, active vector icon lifts subtly; desktop uses left accent rail |
| New screen | Directional entrance with staggered data cards | 355ms main / 320ms card | Direction reflects tab order; detail page uses 420ms entrance; no artificial loading delay |
| Enquiry/project filter | Subtle local content reveal | 220ms | Text inputs rerender without transition so typing is stable |
| Enquiry trend line | Draws once when Home is entered | 850ms | Uses actual existing enquiry records, not a fake revenue line |
| Existing integrated owner views | Subtle shared arrival | 370ms | Existing business operations stay functionally identical |
| Press/hover feedback | Scale and depth | 180–320ms | Hover movement only for real mouse; touch uses press response |
| Tool finder | Focused modal rise | 335ms | Tap Home search or Settings search, or press Ctrl/Cmd+K; Esc to close, focus trap |

All effects are transform/opacity-first and use `prefers-reduced-motion:reduce` to disable JS Web Animations, CSS transitions and visual stagger. There are no infinite animations, no audio effects and no touch-swipe gestures that interfere with scrolling, iOS navigation or forms.

## Real interactions

- **Four-tab shell:** Actual SVG icons and active state; preserves per-screen scroll position when navigating away and returning. The iPhone/iOS independent scrolling fix remains intact, with the dock visible.
- **Enquiries:** Live client-side search across approved existing tenant enquiries, real counts and status filters, scoped detail page and existing editor links.
- **Projects:** Search and status filters across existing bookings/actions only; progress percentages appear only when actually recorded. Dedicated native project CRUD is *not* claimed until isolated staging and acceptance are complete.
- **Settings:** Figma-aligned rows and one-tap Spotlight-like tool finder for Home, Enquiries, Projects, Clients, Quotes, Marketing, AI receptionist, Bookings, Actions, Security, Billing. Authenticated legacy tool links retain all original workflows.
- **Quotes:** Draft-copy-only, explicitly labelled unsaved/unsent. No invented pricing, lead data or payments.
- **Account and MFA:** Password form gets matching press/focus feedback. Authenticator, protected MFA and optional passkey setup retain original security gates and the disabled-by-default experimental passkey flag.

## Accessibility and resilience

- Native navigation uses semantic buttons and `aria-current="page"` with screen headings. A dedicated small `aria-live="polite"` announces the new screen only; the entire live record list no longer emits verbose announcements on every search keystroke.
- Tool finder is a modal, with escape-to-close and keyboard focus wrapping; it is unavailable before login, while in original owner mode and during a mandatory MFA challenge. Input is escaped before rendering; no search terms are sent to the backend.
- Screen-reader announcements, cached per-screen scroll offsets and all visible private content are cleared on sign-out. No personal records are stored in localStorage/sessionStorage by these new features.
- Lower-powered devices receive short transitions; users with reduced-motion preference receive immediate, non-animated navigation.

## Verification

- `npm run verify` — all project tests, lint/security checks, static contract checks
- `NODE_PATH=/tmp/colzo-browserqa/node_modules npm run verify:colzo-native` — five mock-auth iPhone/desktop viewports, all original owner links, scroll safety
- `NODE_PATH=/tmp/colzo-browserqa/node_modules npm run verify:colzo-motion` — five mock-auth viewports, tab motion, live-data filters, project search, scroll memory, Spotlight, keyboard accessibility, reduced motion and logout
- `NODE_PATH=/tmp/colzo-browserqa/node_modules npm run verify:colzo-mfa` — real MFA overlay with synthetic factors
- `NODE_PATH=/tmp/colzo-browserqa/node_modules npm run verify:colzo-security-methods` — experimental passkey gating in a fake SDK
- `NODE_PATH=/tmp/colzo-browserqa/node_modules node scripts/colzo-safe-shell-browser.cjs` — original account/login/PWA regression

Mock-browser acceptance does **not** prove a real logged-in device passes all interactions. Authenticated owner acceptance in staging is still required before any switch to the live app. Native Project/Client/Quote editing remains a separately gated release.
