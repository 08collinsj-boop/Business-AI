# Business AI Pilot launch status - 7 October 2026

This is an internal snapshot of what was re-verified on 7 October 2026. Production remains untouched.

## PASS

- The original Marketing generation reliability hotfix is live, but the natural 8 October automation run exposed a remaining provider-latency/reliability failure before draft creation.
- The authenticated Marketing draft test on `dpl_GE4AYr2etiAQr7dY3JA4hqGdN4zN` failed at 18:53 UTC on 8 October. Runtime logs showed Gemma free had no endpoint compatible with the requested parameters, Dots hit `finish_reason:length` at the 1,200-token budget, and the generic free router had no compatible endpoint.
- The corrected Marketing build passed 516 / 516 tests plus `verify:local` across 159 JavaScript files and is live on Pilot deployment `dpl_2BHqwXehGUPYmj9TBxMfnom91eWi` at commit `6e887617486808850dc7e19c6a9a338f8f9873c0`. It uses only the current free zero-data-retention OpenRouter models advertising both `response_format` and structured outputs - Apodex 1.1 Mini and NVIDIA Nemotron 3 Super - across three bounded attempts, with the structured output budget restored to 1,800 tokens. A fresh authenticated draft generation on this exact deployment is still required before Marketing automation is called fully end-to-end re-certified.
- The clean Git-backed deployment is live on `business-ai-pilot.vercel.app`.
- Live public receptionist smoke testing against hidden `Hartlepool Test Electrical` passed: provider fallback recovered from an OpenAI 429, no-contact enquiries did not create leads, and a labelled fake-data enquiry persisted a New lead plus a `requested` booking while keeping business confirmation explicit.
- Vercel project build overrides were restored to normal after the temporary hotfix deployment.
- `My Business` Marketing automation remains enabled, `fully_automated`, one post per day.
- Existing scheduled publications were not altered by the reliability repair.
- Two 11 October publications are an accidental duplicate of the same Marketing generation at the same scheduled time. No deletion has been performed; one requires explicit operator approval to cancel.
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
