# Business AI Pilot launch status - 7 October 2026

This is an internal snapshot of what was re-verified on 7 October 2026. Production remains untouched.

## PASS

- Marketing generation reliability hotfix is committed to GitHub on `pilot-progress-20261007`.
- Live Pilot uses `openrouter/free` routing with three generation attempts and the third-attempt retry guard.
- The clean Git-backed deployment is live on `business-ai-pilot.vercel.app`.
- Vercel project build overrides were restored to normal after the temporary hotfix deployment.
- `My Business` Marketing automation remains enabled, `fully_automated`, one post per day.
- Existing scheduled publications were not altered by the reliability repair.
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

Vercel deployment context currently reports the `Buisness-AI` team plan as `hobby`.

Keep real paid-customer launch blocked until Business AI is moved to a Vercel plan / hosting arrangement that permits the intended commercial use. Do not purchase or upgrade without explicit operator approval.

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
