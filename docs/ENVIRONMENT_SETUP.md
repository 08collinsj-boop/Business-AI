# Pilot environment setup

Use `.env.example` as the authoritative variable inventory. Never commit a real `.env` file.

## Client-safe

- `SUPABASE_PUBLISHABLE_KEY` (preferred) or the legacy `SUPABASE_ANON_KEY` fallback is intentionally exposed only through `/api/public-config` when frontend auth is enabled.

## Server-only core

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `RATE_LIMIT_SALT`
- `TENANCY_AUTH_ENABLED=true`
- `FRONTEND_AUTH_ENABLED=true`
- `PUBLIC_ENQUIRY_RATE_LIMIT_MODE=database`

## Stripe Pilot/Test

- `BILLING_ENABLED`
- `BILLING_APP_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_TRIAL`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_BUSINESS`
- `STRIPE_PRICE_ADDON_AI_MARKETING` only after the Marketing price is explicitly approved and a matching active GBP monthly Test Price exists.

The browser sends only plan/add-on keys. Price IDs stay server-side.

## Meta Pilot

- `PUBLIC_APP_URL`
- `META_APP_ID`
- `META_APP_SECRET`
- `META_REDIRECT_URI`
- `META_GRAPH_API_VERSION`
- `META_OAUTH_SCOPES`
- `META_TOKEN_ENCRYPTION_KEY`
- `META_PUBLISH_ENABLED=false` until live Pilot verification passes.

Do not freeze a Graph API version or permission set from old documentation. Confirm the current Meta app/API requirements at deployment time.

## Marketing scheduler

- `MARKETING_SCHEDULER_SECRET` — random server-to-server value at least 32 characters.

A server scheduler must POST to `/api/marketing-scheduler` using this bearer secret. Browser timers are not used.

## Voice

- `VOICE_RECEPTIONIST_ENABLED=false` during this Pilot source rollout.

Provider/number/webhook/recording-policy configuration is intentionally deferred.
