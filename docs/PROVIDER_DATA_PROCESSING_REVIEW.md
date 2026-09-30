# Business AI provider data-processing review

Status: internal launch review, 1 October 2026. This records the current provider-contract position checked against provider-published terms; it is not independent legal certification. Provider terms can change and should be rechecked before a later Production launch.

## Reviewed providers

| Provider | Current review | UK transfer position | Launch note |
| --- | --- | --- | --- |
| Supabase | Customer DPA reviewed. | DPA incorporates the ICO UK Addendum for covered UK transfers. | Pilot database is in `eu-west-1`; retain the DPA and current sub-processor list in the compliance record. |
| Resend | DPA reviewed after enabling transactional Auth SMTP. | DPA defines UK SCCs as EU SCCs amended by the UK Addendum. | Verified sender is `auth.getbusiness-ai.com`; sending credential is domain-restricted. |
| Vercel | DPA and Terms reviewed. | Current DPA includes UK transfer terms but applies to Pro and Enterprise customers. | **Paid launch blocker:** the connected Business AI team is currently Hobby, and Vercel's current Terms restrict Hobby to personal/non-commercial use. Upgrade to Pro or move to another commercial host before accepting paying customers. |
| OpenAI | Current Services DPA reviewed (effective 1 January 2026). | UK Data is covered using the SCCs as amended by the UK Addendum. | Applies to API/business services. Keep customer-enquiry prompts limited to data needed to answer the enquiry. |
| OpenRouter | DPA reviewed (last updated 5 May 2026). | Section 13 applies the UK Addendum to UK international transfers. | DPA states no Sensitive Data processing is intended unless separately agreed. Marketing prompts should therefore stay limited to business/marketing facts and exclude customer personal/sensitive data. |
| Cloudflare | Customer DPA v6.4 reviewed (effective 3 April 2026). | UK transfers use EU SCCs as amended by the UK Addendum; Cloudflare also describes its UK-US DPF participation. | Current use is Workers AI image generation from business marketing prompts. |
| Stripe | DPA reviewed (last updated 28 September 2026). | DPA incorporates its Data Transfers Addendum, including UK transfer mechanisms. | Stripe may act as processor and/or controller depending on the processing; the public provider notice must not describe Stripe as only a sub-processor. |
| Meta Platforms | Current connected Facebook publishing feature identified. | Current role/transfer terms must be confirmed against the Meta terms applying to the connected Developer app before paid launch. | Keep Meta optional and approval-controlled until that review is recorded. Do not describe Meta as only a sub-processor. |

## Provider source record

- Supabase DPA: https://supabase.com/legal/customer-resources/data-processing-addendum
- Resend DPA: https://resend.com/legal/dpa
- Vercel DPA: https://vercel.com/legal/dpa
- Vercel Terms: https://vercel.com/legal/terms
- OpenAI DPA: https://openai.com/policies/data-processing-addendum/
- OpenRouter DPA: https://openrouter.ai/data-processing-agreement
- Cloudflare DPA: https://www.cloudflare.com/cloudflare-customer-dpa/
- Stripe DPA: https://stripe.com/legal/dpa
- Meta: record the exact Developer/Platform terms accepted by the Business AI Meta app during the final pre-launch review.

## Operating rules

- Recheck provider terms when a material provider, model route or data flow changes.
- Keep the public provider notice descriptive rather than assigning a single legal role where the provider's role varies by feature.
- Do not send payment-card details into Business AI chat or AI providers.
- Do not route customer personal/special-category data through AI Marketing.
- Record the final Meta terms review before enabling public Meta connection/publishing.
- Resolve the Vercel commercial-plan blocker before the first real paid customer.
