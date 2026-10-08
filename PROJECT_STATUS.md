# Business AI Pilot source status

Last verified: 8 October 2026

This status applies to the isolated Business AI Pilot and Business-AI-Dev environment. The separate Business AI Production environment remains untouched.

## Current verified source

- Active Pilot branch: `pilot-progress-20261007`.
- The 8 October Marketing reliability hardening is committed and deployed to the live Pilot.
- Full source gate: **514 / 514 automated tests passing**, 0 failed, 0 skipped.
- `npm run verify:local`: **159 JavaScript files verified**, with secret-pattern and temporary-marker checks passing.
- Tenant authentication, single-business membership resolution, owner/admin/member permissions and AAL2 owner step-up are implemented.
- Leads, history, pipeline, bookings, actions, handovers, team, audit/lifecycle, customer portal and public business routing remain tenant-scoped.
- Business Knowledge supports private upload, extraction, owner review/approval and trusted retrieval.
- Public/customer routing does not accept a browser-supplied internal tenant ID.
- Customer account routing stays behind the shared loading screen until the customer session is verified.
- AI Receptionist keeps OpenAI as its primary provider and now uses `openrouter/free` for its OpenRouter fallback, with the existing two-attempt interactive latency bound.
- AI Phone Calls remains disabled for the Pilot.

## Billing and product

Current Pilot pricing:

- Paid Trial: £3.99 for 7 days, 100 AI enquiries.
- Starter: £34.99/month, 250 AI enquiries.
- Pro: £79.99/month, 1,000 AI enquiries.
- Business: £159.99/month, 3,000 AI enquiries.
- AI Marketing add-on: £19.99/month.

The server owns plan/add-on Price IDs and billing rules. Stripe checkout, webhooks, portal/subscription controls and stale-event protections are implemented. The Marketing add-on is available only through server-approved configuration.

## AI Marketing

- Marketing generation is grounded in the business profile plus approved Business Knowledge.
- The 8 October reliability candidate rotates Marketing across three structured-output-capable free OpenRouter models, keeps three retryable attempts, enables provider fallback, prioritises throughput and bounds each provider request to 25 seconds.
- Draft history, editing, approval, deletion, copy controls, scheduling and Facebook publication records are implemented.
- Owner-uploaded JPG/PNG/WebP Marketing photos are implemented, including Add photo and Upload / replace photo flows.
- Fully automated Marketing is owner-controlled and protected by the stronger owner/AAL2 path.
- `My Business` remains enabled in fully automated mode at one post per day.
- The live Supabase cron job `business-ai-marketing-scheduler-hourly` is active at `0 * * * *` and calls the protected Pilot Marketing scheduler.
- Vercel also retains the 08:00 UTC daily Marketing scheduler cron as fallback protection.

## Meta / Facebook

- Meta app: `Business-AI Pages`.
- Pilot Facebook Page connection is live and the selected Page is `Business.AI`.
- A real owner-directed Pilot Facebook publication has completed successfully.
- OAuth state protection, encrypted server-side provider tokens, server-discovered Page IDs, disconnect and publication idempotency are implemented.
- Public access for unrelated businesses is not yet certified. Meta App Review / Advanced Access and any verification Meta requires remain external launch work.
- Do not accept Tech Provider onboarding automatically.
- Instagram publishing remains disabled until a real media publication workflow is separately implemented and certified.
- Reviewer material is prepared in `docs/META_APP_REVIEW_PACKET.md`.

## Legal, privacy and security

- The public legal identity endpoint is configured and reports provider identity ready.
- The current DPA is v1.1. Acceptance remains owner-controlled and must never be recorded on another business's behalf.
- The former DPA provider-identity blocker is resolved for configured Pilot businesses.
- Supabase Security Advisor currently has no HIGH/ERROR finding.
- The two RLS-without-policy INFO findings are intentional service-role-only incident-control tables with no browser grants.
- Supabase leaked-password protection is still disabled. Operator decision: defer enabling it until there is clear commercial validation from prospects confirming they would pay. Keep the Pilot limited/supervised in the meantime, and enable it before wider public signup or real customer onboarding.
- Managed backups/PITR and an isolated restore drill remain an accepted temporary soft-launch risk, not a technical PASS.

## Live Pilot

- `https://business-ai-pilot.vercel.app/api/health` returns HTTP 200 with `{"status":"ok"}`.
- The live Pilot Vercel deployment is `dpl_HogkxWGfw3Tjs1UUdu9F5zanw362`, based on source commit `158da80e05e159f5a999e5ae4a9b7fffb297e904`; `/api/health` returns HTTP 200 with `{"status":"ok"}`.
- The natural `My Business` automation run at 01:00 UTC on 8 October failed in the old AI generation path after roughly 104 seconds before creating a draft. The replacement failover code is now live, but a real provider generation on the new live code still needs runtime/browser confirmation before Marketing automation is called fully re-certified.
- The hourly scheduler remains healthy and Facebook publication of an existing scheduled post succeeded separately.
- Five unambiguously labelled QA/test/fake businesses were removed from public directory search without deleting them or disabling their direct test routes.
- A Node `url.parse()` deprecation warning remains in runtime telemetry and is not directly referenced by Business AI source.

## Remaining launch gates

1. **Meta public access** - complete App Review / Advanced Access, required verification and an unrelated-account retest.
2. **Commercial hosting** - the Business AI Vercel team is currently on Hobby. Operator decision: do not upgrade or purchase hosting until prospects have confirmed they would pay. Resolve this before taking real paid customers.
3. **Authentication hardening** - operator decision: defer Supabase leaked-password protection until commercial validation, while keeping the Pilot limited/supervised. Enable it before wider public signup or real customer onboarding.
4. **Browser certification** - complete the remaining authenticated owner/customer, rendered legal, recovery, Stripe TEST and Meta-console checks in `PUBLIC_LAUNCH_BROWSER_CERTIFICATION.md`.
5. **ICO registration/payment** - operator decision: do not register or pay until there is clear commercial validation from prospects confirming they would pay. The existing self-assessment result remains recorded. This commercial decision does not itself establish a legal exemption, so the ICO position must be rechecked before expanding the Pilot or taking real customers.
6. **Backups/PITR** - retained as the documented post-launch P1 risk for the small supervised Pilot.

## Production

The separate Business AI Production environment is intentionally unchanged. Do not promote Pilot changes or apply Pilot migrations to Production without explicit approval and the Production rollout checklist.
