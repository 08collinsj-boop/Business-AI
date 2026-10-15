# Colzo → Google Stitch handoff

**Status:** Prepared for manual import into Google Stitch. The files and six synthetic screenshots are safe to share as design input; they contain no real customer records or secrets. There is no verified Google Stitch connector available inside this ChatGPT session, so this step **has not** created or edited a Stitch project.

## Design mission

Act as a senior Apple-calibre mobile SaaS designer and expert in motion design, accessibility and complex business workflows. **Polish the existing Colzo app, do not redesign it into a different product.** Use the existing Graphite & Volt design system and the supplied six reference screenshots as the structural reference. Refine each screen into a beautiful, exceptionally usable and consistent native-feeling experience. Prioritise working interaction patterns and correct real-world states above decorative graphics.

### Inputs

1. `DESIGN.md` (root of feature branch): import as the project design system in Stitch. The file has Stitch-compatible YAML token front matter and standard narrative sections.
2. **One-image contact sheet:** `docs/stitch-reference/colzo-current-six-screens.png` (labelled synthetic data), plus individual current-state screenshots (all 390×844):
   - `docs/stitch-reference/home.png`
   - `docs/stitch-reference/enquiries.png`
   - `docs/stitch-reference/projects.png`
   - `docs/stitch-reference/settings.png`
   - `docs/stitch-reference/bookings.png`
   - `docs/stitch-reference/actions.png`
3. Original six-phone Colzo reference image (provided by the owner in ChatGPT): supply it separately to Stitch as the style target. It is a **reference**, not a licence to invent data shown in the mockup.
4. Development preview for context, not for automated sign-in: `https://business-ai-pilot-o2lmxapvq-buisness-ai1.vercel.app/`. This may present authentication to unauthorised visitors, so the synthetic screenshots are the reliable visual inputs.
5. Existing source screens: `assets/colzo-native.js`, `assets/colzo-native.css`, `assets/colzo-motion.css`, `assets/colzo-settings.css`, `assets/colzo-workflows.css` and current `index.html` layout. **Do not upload `.env`, API secrets, backend code or real customer information** to Stitch.

### Existing screen/functionality inventory

| Surface | Current state | Stitch deliverable |
|---|---|---|
| Welcome / Sign-in / MFA | Working authentication; existing AAL2 must remain | Polished native-looking entry, error, recovery and two-step states |
| Home | Native Colzo summary, quick actions, charts | Beautiful verified metric hierarchy, real-data-friendly empty and skeleton states |
| Enquiries | Native list and detail | Search, status segmented filters, task flows, visible CTA, customer detail and editing states |
| Projects | Native overview, currently built from bookings and actions | Attractive genuine project board and future progress states **without inventing stored projects** |
| Clients | Contacts derived from enquiries | Client profiles, activity timeline, native edit/new flows as clearly labelled proposed states |
| Quotes | Copy-only draft estimate; no real persistent quote storage/sending in this release | Draft, edit, review, sent and accepted state designs. Mark unimplemented actions as design concepts |
| Bookings | **New native screens** connected to existing authenticated GET/POST/PATCH | Month grid, agenda, booking edit sheet, date errors, status variants, responsive desktop calendar |
| Actions | **New native screens** connected to existing authenticated GET/POST/PATCH | List, priority states, due-date editing, completion, empty and error states |
| More / Settings | Seven native detail pages; advanced links still touch old UI | Cohesive native screens, profile, team, integrations, notifications, appearance, security, support |
| Marketing | Functional old Business AI area; no full native Colzo UI yet | Full native library, campaign builder, social preview and approval/scheduling flow |
| AI receptionist | Functional old area; no full native Colzo UI yet | Native conversation overview, knowledge, availability, escalation and handover settings |
| Billing | Stripe integrated in original app; native Colzo UI incomplete | Real plan/allowance, payment status and management flows, no invented entitlements |
| Analytics | Existing reports partly available | Measured enquiry conversion, funnels, charts, data-absence states; no fake results |
| Customer portal | Original customer experience exists | Colzo-branded discovery, enquiry tracking, booking/quote history, secure mobile flows |

### Exactly what to generate

- Editable, consistent mobile designs for **every** surface above; start with the six existing current-state screenshot pages and establish shared components before creating the missing screens.
- Include all critical states per component: default, pressed, selected, loading/skeleton, empty, success, error, disabled, long content and offline/session expiry where appropriate.
- Show an explicit **four-tab navigation pattern** with in-shell secondary routes; do not create seven competing bottom tabs.
- Produce a matching desktop interpretation at 1440×900 alongside the 390×844 mobile baseline. Check 375×812 and 430×932 too.
- Demonstrate navigation transitions, active-tab sliding highlight, modal entrance and exit, card press feedback, chart reveal and calm skeleton loading. Provide durations/easing and reduced-motion fallback in a motion spec.
- Create a reusable component/style library: typography, colours, spacing, elevation, cards, buttons, segmented controls, status pills, lists, date/time inputs, dialogs, toasts, empty states, charts, calendar, four-tab bar.
- Highlight any proposed flows that are **not implemented** in the app. Do not present concepts as deployed functionality.
- Deliver Figma-editable frames or exportable components, design tokens and interaction notes suitable for coding back into the existing vanilla JavaScript/CSS app. Do not create a replacement backend.

## Paste this into Stitch

> I am importing the existing mobile-first Colzo SaaS design. Use the attached DESIGN.md, current-state screenshot set and original six-phone Colzo reference as non-negotiable context. Act as a senior Apple-calibre product and motion designer. Preserve the Colzo brand, Graphite & Volt dark palette (#0D1115, #20262C and volt #C8FF2E), the four-tab Home / Enquiries / Projects / More shell and the genuine product flows. Perform a cohesive visual and interaction polish, not a new concept unrelated to the app. First redesign Home, Enquiries, Projects, Settings, Bookings and Actions to closely match the original six-phone reference while improving readability, alignment, compactness and mobile safe-area behaviour. Build reusable components and realistic state variants; make transitions feel springy but controlled, and add reduced-motion equivalents. Then create matching native screens for Clients, Quotes, AI Receptionist, Marketing, Billing, Analytics and customer portal, clearly marking new features as concepts until implemented. No fake customer records, fake revenue, bypassed MFA or claims that a design is a functioning backend. Deliver editable screens, components, tokens and a motion/developer handoff for implementation in the existing Colzo codebase.

## Safety / implementation boundaries

- **No production deployment, Git merge, live customer write or migration.** Keep the feature branch isolated until explicit release approval.
- Preserve existing Supabase owner accounts, MFA/AAL2, business membership/RLS, bookings and enquiries, Stripe and Meta connections, and marketing approval safeguards.
- The Stitch output is a **visual design review**. It must be implemented and integration-tested in the existing Colzo repository before it becomes a real screen.
- No paid subscriptions, new hosted environments or chargeable APIs are authorised.
- Approved handoff direction: Stitch concepts/tokens → (optional) Figma editable screens → existing GitHub Colzo development branch → Vercel preview QA → owner approval before Production.

## Acceptance rubric

1. Native polished visual consistency across every tab and nested page.
2. Original reference match: recognisable graphite/volt visual hierarchy and navigation.
3. Legible typography and touch targets ≥44×44px; contrast and accessibility verified.
4. No clipped cards, scroll lock, keyboard overlap, broken iPhone safe areas or active-tab overlap.
5. Motion states specified and practical to implement in plain CSS and browser JS.
6. Form data, real empty states, warnings and failures remain visible; never invent business success.
7. All old-interface redirects replaced by explicit Colzo-native design proposals, then separately implemented in code.
