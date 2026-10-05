# Business AI provider data-processing review

Status: internal launch review refreshed 5 October 2026. This records the current provider-contract position checked against provider-published terms; it is not independent legal certification.

## Reviewed providers

| Provider | Current review | UK transfer position | Launch note |
| --- | --- | --- | --- |
| Supabase | Customer DPA reviewed. | DPA incorporates the ICO UK Addendum for covered UK transfers. | Pilot database is in the existing EU region; retain the DPA/current sub-processor list. |
| Resend | DPA reviewed after enabling transactional Auth SMTP. | DPA defines UK SCCs as EU SCCs amended by the UK Addendum. | Keep transactional email limited to required account/security messages. |
| Vercel | Terms/DPA rechecked 5 Oct 2026. | Current Vercel DPA applies to Pro and Enterprise customers. | **Paid commercial blocker:** Vercel's current Terms state Hobby is personal/non-commercial use. Move Business AI to Pro or another suitable commercial host before real paid customers. |
| OpenAI | Services DPA reviewed. | UK Data is covered using relevant transfer safeguards described by the provider. | Keep customer-enquiry prompts limited to data needed to answer the enquiry. |
| OpenRouter | DPA reviewed. | Provider DPA includes UK-transfer provisions. | Marketing prompts should remain business/marketing facts and exclude customer personal/sensitive data. |
| Cloudflare | Customer DPA reviewed. | Provider DPA includes UK transfer mechanisms. | Current use is image generation from business marketing prompts. |
| Stripe | DPA reviewed. | Provider DPA includes UK transfer mechanisms. | Stripe's legal role varies by processing; public wording must not describe Stripe as only a sub-processor. |
| Meta Platforms | Connected Facebook publishing identified. | Final applicable Developer/Platform terms still require live confirmation. | Keep Meta optional/approval-controlled until the browser certification records the current terms. Do not describe Meta as only a sub-processor. |

## Operating rules

- Recheck provider terms when a material provider, model route or data flow changes.
- Keep the public provider notice descriptive rather than assigning a single legal role where the provider's role varies by feature.
- Do not send payment-card details into Business AI chat or AI providers.
- Do not route customer personal/special-category data through AI Marketing.
- Record the final Meta terms review before wider public Meta use.
- Resolve the Vercel commercial-plan blocker before the first real paid customer.
