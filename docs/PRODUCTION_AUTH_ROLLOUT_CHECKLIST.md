# Production authentication rollout checklist

Use this checklist only after owner approval. The Preview validation on `auth-preview` must remain the reference result. Do not activate one auth gate without the other.

## Pre-flight

1. Confirm the intended Production domain is `https://business-ai-theta.vercel.app`.
2. In Supabase Auth, set the Site URL to that domain and add it as an approved Redirect URL. Keep the validated Preview redirect URL available for future Preview testing.
3. In Vercel Production, confirm these values already exist and are correct: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `OPENAI_API_KEY`.
4. Add `SUPABASE_PUBLISHABLE_KEY` to Production using the Supabase browser-safe publishable key. Never use the service-role key for this variable.
5. Confirm the real owner can sign in to Supabase Auth and still has the expected membership. Do not create substitute users or memberships.
6. Record the currently active Production deployment URL/commit so it can be rolled back quickly.

## Activation

1. Set **both** Production variables in the same controlled change:
   - `TENANCY_AUTH_ENABLED=true`
   - `FRONTEND_AUTH_ENABLED=true`
2. Redeploy the already-reviewed release or trigger a new Production deployment so both values take effect together.
3. Do not enable only one gate. Backend-only activation blocks the legacy dashboard; frontend-only activation leaves backend protection off.

## Immediate verification

1. Confirm the unauthenticated Production page shows the login screen and does not display dashboard data.
2. Confirm unauthenticated requests to `/api/leads`, `/api/history`, `/api/pipeline`, and `/api/settings` return 401.
3. Sign in as the real owner and verify dashboard data, lead opening/history, pipeline, settings read, and one authorised settings or lead update only if the owner approves a non-destructive test record.
4. Confirm logout returns to login, and `/api/enquiry` remains public without a dashboard bearer token.
5. Review Vercel errors for authentication/configuration failures. Do not log or copy tokens or secret values.

## Rollback

If authentication prevents legitimate access or creates unexpected errors:

1. Set **both** Production gates to a value other than exact lowercase `true` (recommended: remove both variables or set both to `false`) in the same controlled change.
2. Redeploy immediately so the legacy frontend and server behaviour are restored together.
3. Verify the public dashboard returns to its previous behaviour, private API routes no longer require bearer tokens, and `/api/enquiry` remains available.
4. Do not remove, rotate, or expose Supabase/OpenAI credentials during rollback.
5. Preserve deployment/log identifiers, diagnose in Preview, and repeat the Production rollout only after the issue is resolved and revalidated.
