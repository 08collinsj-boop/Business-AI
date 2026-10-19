# Colzo website and offer claims - proposed copy, not live

**Status: REVIEW ONLY. No public pages, signup funnels or Stripe settings changed.**
Scope: marketing.html, index.html, docs/STRIPE_BILLING_PILOT_SETUP.md,
docs/ADDONS_MARKETING.md and docs/COLZO_V1_CONTROLLED_LAUNCH_RUNBOOK.md.
Static source audit executed 16 October 2026.

## Pricing consistency

| Offer | Current advertised / internal source | Recommended launch wording |
| --- | --- | --- |
| 7-day paid Trial | £3.99 one-time for seven days (visible on marketing.html and in backend plan presentation) | "7 days for £3.99 one-off. Does not automatically become a subscription." Only advertise after Stripe TEST and legal acceptance are certified |
| Starter | £34.99 per month | Keep amount only if the current Stripe price ID and entitlements are verified against actual configured plans |
| Pro | £79.99 per month | Same |
| Business | £159.99 per month | Same; avoid unsupported priority-support SLA wording |
| AI Marketing add-on | £19.99 per month in internal documentation; main marketing page says "optional add-on" but omits the amount | Propose "Optional AI Marketing add-on - £19.99/month" after live price/entitlements are checked |
| Free 14-day Pilot | Separate historic invitation offer | Never label the paid £3.99 seven-day trial as free or imply existing Pilot entitlements automatically transfer |

The pricing numbers themselves match source documentation, but this audit did
not inspect live Stripe product/price IDs, card charges or licence terms.
The plan descriptions "advanced features", "higher limits" and "priority
support" require documented concrete entitlements and a monitored support
service. Do not promise more because a pricing tile has room for copy.

## Proposed customer-friendly changes

| Present marketing page wording | Proposed for Colzo | Reason / required proof |
| --- | --- | --- |
| "Your business, always available." | "A simpler way to manage incoming enquiries." | Avoid implying uptime guarantee, live phone service or instantaneous responses |
| "Booking confirmed" in a UI illustration | "Booking request received" | A request is not a confirmed appointment; do not fabricate calendar confirmations |
| "Book appointments" | "Collect booking requests" | Pending independent Dev confirmation and scheduling acceptance |
| "Follow up automatically" | "Create and manage follow-up actions" | An action record is not independently delivered email/SMS |
| "Respond day or night" | "Collect website enquiries outside opening hours, when configured" | Qualify supported web channels and uptime conditions |
| "Priority support" on Business tier | "Support options confirmed before purchase" or remove | No independently certified response-time SLA |
| "Advanced features" | Name only features that the plan actually enables | Avoid vague promises or treating future roadmap as currently delivered |
| "Start trial" / "Get started" links to app.getbusiness-ai.com | Review Colzo domain, login, enrolment and paid-checkout routing before changing | Do not switch domains or turn on paid checkout without sign-off |
| AI Marketing draft generation | "Create drafts and review them before publishing" | Real Facebook/Instagram publishing depends on approvals and provider checks; no universal automatic publishing claim |
| Phone or WhatsApp reception (future copy) | "Not included in this launch" | Existing-number WhatsApp and live AI phone answering are not production-certified |

## MVP offer description for review

"Colzo brings customer enquiries, booking requests, contacts and everyday
business tasks into one workspace. Its website AI receptionist can respond
using the information you approve and hand complicated enquiries back to
your team. Use the dashboard to review enquiries and actions, organise
customers and keep track of your work. Availability and specific features
depend on the plan and connections you configure."

**Do not use this publicly until real signed-in Dev acceptance establishes
that all mentioned journeys are functioning as described.**

## Additional pages and concerns

- marketing.html currently still uses the Business AI brand, old domain and
  CTA targets. Coordinate the eventual switch with legal identity,
  protected login and deployment domain, not merely a CSS/logo rewrite.
- Graphite & Volt PWA manifest and Colzo icons already exist; this does not
  certify the public marketing funnel.
- "AI receptionist" means supported website enquiry automation, not
  live Twilio voice or WhatsApp by default.
- Marketing library, drafting and scheduling have existing code paths, but
  must pass explicit Dev API and permission checks, including no unapproved
  publishing and no paid API calls.
- Quote creation/save is distinct from customer-visible sending/acceptance.
  Avoid "send quotes directly to customers" copy until that flow works.
- Mark every demo value/sample graphic as illustrative if it is not sourced
  from genuine application state.

**Release gate: marketing content needs owner approval, functional evidence,
legal alignment, monitored support route and a cost-controlled offer.**
