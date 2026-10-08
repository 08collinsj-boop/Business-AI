# Business AI Pilot launch status - 7 October 2026

This is an internal snapshot of what was re-verified on 7 October 2026. Production remains untouched.

## PASS

- The original Marketing generation reliability hotfix is live, but the natural 8 October automation run exposed a remaining provider-latency/reliability failure before draft creation.
- The 8 October Marketing hardening now rotates across three structured-output-capable free OpenRouter models, permits provider fallback, prioritises throughput and limits each attempt to 25 seconds. The full source gate passed 514 / 514 and the change is live on Pilot deployment `dpl_HogkxWGfw3Tjs1UUdu9F5zanw362`.
- A real provider generation on the new live code still needs confirmation before Marketing automation is called fully re-certified.
- The clean Git-backed deployment is live on `business-ai-pilot.vercel.app`.
- Vercel project build overrides were restored to normal after the temporary hotfix deployment.
- `My Business` Marketing automation remains enabled, `fully_automated`, one post per day.
- Existing scheduled publications were not altered by the reliability repair.
- Five explicitly labelled QA/test/fake businesses were removed from public directory search while preserving their direct test routes.
- Service-provider legal identity endpoint returns `identity_configured: true`.
- Legal identity fields include operator/trading identity, sole-trader type, geographic address, support email and telephone.
- DPA gating code now permits owner acceptance once provider identity is configured. No DPA was accepted on anyone's behalf during this work.
- Public enquiry availability is derived from the live `assistant_available` state.
- Owner dashboard receptionist status shows `Online` only when the public assistant is actually available, otherwise `Public access off`.
- `Speak to someone` falls back to the configured business phone/contact path when the assistant is unavailable.
- Owner-uploaded Marketing photos are implemented in the Create flow and saved-draft flow.
- Marketing automation includes publishable post-photo and inspiration-photo libraries.
- No placeholder Google/Facebook review URLs are currently stored in Pilot business settings.
- Customer account route uses the shared loading screen while an authenticated customer session is being verified, avoiding the previous portal/login flash.
- Meta connection and selected Business.AI Page exist for the active Pilot integrations.
- Facebook publishing has already succeeded in the Pilot.

## PASS WITH FINAL VISUAL CERTIFICATION STILL REQUIRED

- Legal identity API is fully configured and the browser-side legal script is designed to replace the static fallback Pilot notice.
- The lightweight fetch renderer does not provide sufficiently reliable JavaScript-render evidence for the identity block, so final visual browser certification of Terms/Privacy/DPA remains required.

## BLOCKED ON EXTERNAL / OPERATOR STEP

### Meta public access

The Meta app is Published, but unrelated normal Facebook-account access still needs the App Review / Advanced Access path and any verification Meta requires. The reviewer pack is in `docs/META_APP_REVIEW_PACKET.md`.

Do not accept Tech Provider onboarding automatically.

### Vercel commercial hosting

Vercel deployment context currently reports the `Buisness-AI` team plan as `hobby`. Hobby terms are for personal/non-commercial use.

Operator decision: do not purchase or upgrade hosting until prospects confirm they would pay for Business AI. Keep real paid-customer launch blocked until a suitable commercial hosting arrangement is approved.

### Supabase leaked-password protection

Operator decision: defer enabling leaked-password protection until prospects confirm they would pay for Business AI. Keep the Pilot limited/supervised in the meantime, and enable it before wider public signup or real customer onboarding.

### ICO registration/payment

Operator decision: do not register or pay until prospects provide clear commercial validation by confirming they would pay. The prior self-assessment remains recorded. This decision does not itself establish a legal exemption, so recheck the ICO position before expanding the Pilot or taking real customers.

### Browser-only certification

A final authenticated browser run is still needed for:
- rendered legal identity block;
- fresh owner/customer auth and recovery;
- final fake-data end-to-end owner/customer journey;
- final Meta-console terms/review state;
- Stripe TEST checkout/legal access if it needs repeating;
- final runtime/browser certification report.

## Deferred

- Managed backups/PITR and isolated restore drill remain post-launch P1 under the existing small supervised soft-launch risk decision.
- Voice/phone answering remains disabled for Pilot.
- Instagram publishing remains disabled until separately implemented and certified.
