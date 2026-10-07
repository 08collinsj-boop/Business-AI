# Business AI Pilot source status

Last verified: 7 October 2026

This status applies to the isolated Business AI Pilot and Business-AI-Dev environment. The separate Business AI Production environment remains untouched.

## Current verified source

- Active Pilot branch: `pilot-progress-20261007`.
- Final full verification was run after the status refresh on 7 October 2026; use the branch history for the current documentation-only head.
- Full source gate: **513 / 513 automated tests passing**, 0 failed, 0 skipped.
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
- The reliability fix is permanent in source: Marketing uses `openrouter/free` and may make up to three attempts for retryable provider, validation, grounding or repetition failures.
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
- Supabase leaked-password protection is still disabled and should be enabled before wider public signup.
- Managed backups/PITR and an isolated restore drill remain an accepted temporary soft-launch risk, not a technical PASS.

## Live Pilot

- `https://business-ai-pilot.vercel.app/api/health` returns HTTP 200 with `{"status":"ok"}`.
- The live Marketing source contains `openrouter/free`, the three-attempt loop and the third-attempt retry guard.
- The current live Pilot Vercel production deployment is based on source commit `b20230dfd88e29204951b32ae5467a12d9fb2210`, including both the Marketing router fix and the AI Receptionist fallback-router hardening.
- Recent runtime inspection found no fresh functional 5xx group after the Marketing repair. A Node `url.parse()` deprecation warning remains in runtime telemetry and is not directly referenced by Business AI source.

## Remaining launch gates

1. **Meta public access** - complete App Review / Advanced Access, required verification and an unrelated-account retest.
2. **Commercial hosting** - the Business AI Vercel team is currently on Hobby. Paid/commercial launch remains blocked until the operator approves a suitable commercial hosting plan or another suitable host.
3. **Authentication hardening** - enable Supabase leaked-password protection.
4. **Browser certification** - complete the remaining authenticated owner/customer, rendered legal, recovery, Stripe TEST and Meta-console checks in `PUBLIC_LAUNCH_BROWSER_CERTIFICATION.md`.
5. **ICO registration/payment** - the self-assessment result has been recorded, but any registration, declaration or payment requires explicit operator approval.
6. **Backups/PITR** - retained as the documented post-launch P1 risk for the small supervised Pilot.

## Production

The separate Business AI Production environment is intentionally unchanged. Do not promote Pilot changes or apply Pilot migrations to Production without explicit approval and the Production rollout checklist.
