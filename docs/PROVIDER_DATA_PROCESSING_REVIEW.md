# Business AI provider data-processing review

Status: internal launch review refreshed 7 October 2026. This records the current provider-contract and technical position; it is not independent legal certification.

## Reviewed providers

| Provider | Current review | Launch note |
| --- | --- | --- |
| Supabase | Database/Auth provider position reviewed; Pilot database remains in the existing configured region. | Keep the provider DPA and sub-processor information current. Security Advisor currently has no HIGH/ERROR finding; leaked-password protection remains disabled in Auth and should be enabled before wider signup. |
| Resend | Transactional authentication email provider. | Keep email limited to required account/security messages and approved transactional uses. |
| Vercel | Team is currently on Hobby. Current Vercel terms restrict Hobby to personal/non-commercial use. | **Paid commercial blocker:** approve a suitable commercial plan/host before accepting real paid customers. Current Vercel DPA coverage should be rechecked when the commercial plan is selected. |
| OpenAI | AI enquiry processing and configured AI features. | Keep enquiry prompts limited to data needed to answer the enquiry. Do not route card data through AI features. |
| OpenRouter | AI Marketing text generation/model routing. Marketing currently uses `openrouter/free`. | Marketing prompts must stay scoped to business/marketing facts and exclude unnecessary customer personal/sensitive data. |
| Cloudflare | Marketing image generation. | Current use is limited to business marketing prompts/images. |
| Stripe | Checkout/subscription billing. | Stripe's legal role varies by processing; public wording must not describe Stripe as only a sub-processor. |
| Meta Platforms | Facebook Page connection/publishing is live for the Pilot and has successfully published a Page post. | Public App Review/advanced-access status and the exact current Developer/Platform terms still require browser verification before wider third-party connections. Do not describe Meta as only a sub-processor. |

## Operating rules

- Recheck provider terms when a material provider, model route or data flow changes.
- Keep the public provider notice descriptive rather than assigning a single legal role where a provider's role varies by feature.
- Do not send payment-card details into Business AI chat or AI providers.
- Do not route customer personal/special-category data through AI Marketing.
- Record the final Meta terms/App Review checkpoint before wider public Meta use.
- Resolve the Vercel commercial-hosting blocker before the first real paid customer.
