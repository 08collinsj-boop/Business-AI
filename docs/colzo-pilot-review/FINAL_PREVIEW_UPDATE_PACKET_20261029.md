# Colzo — final proposed protected Preview-only deployment packet (29 October 2026)

**STATUS: PREPARED ONLY — NOT APPROVED, NOT DEPLOYED.** This is a decision artifact, not an instruction to automatically release. PR #65 stays draft/unmerged. Secure real-business pilot remains NO-GO.

## Exact candidate and independent evidence

- **Candidate immutable Git commit:** `d5fc9f70bb4d75f9dd09d8829ced2a389f608c1a` (code change ancestor `0b6f5da3c2b6548143940f1aeafc9ae1bb163bc2`; later difference is docs-only).
- Full [GitHub Pilot Verification 40974438567](https://github.com/08collinsj-boop/Business-AI/actions/runs/40974438567) was triggered against this exact candidate head. Complete job logs independently inspected: **1,478 tests pass, 0 fail, 0 cancelled, 0 skipped**; **17 native isolated PostgreSQL booking checks pass**; Colzo React build **228,622 bytes**; static/secret-marker check **376 JS files**, zero inline scripts. Do not infer actual authenticated live acceptance.
- Baseline currently deployed immutable Git SHA `9630dbc9366ec81852c547e7f5e64ab9a246290a`, Vercel deployment `dpl_GHP3Nwmfs3hktJ5o8gNnFFnzknpE`, protected Preview URL `https://business-qzqtyw10u-buisness-ai1.vercel.app/`. Preserve as rollback reference.
- GitHub compare from deployed SHA to candidate: **three runtime source files only** `api/bookings.js`, `lib/marketing-handler.js`, `assets/colzo-native.js`. No migrations or Production/runtime configuration files. Tests and operator evidence files also change.
- Booking: HTTP handler verifies persisted status, user-entered fields and UTC-equivalent times before returning success; explicitly handles database booking conflict as safe 409. Existing Development booking trigger already installed; no new SQL needs to be applied for this candidate.
- Marketing: active eligible scoped pilot owner/admin may save/review **manual drafts** only; checks grant expiry and tenant, verifies save response, rejects anomalous foreign detail rows, does not call AI generation/payment/publishing providers. Scoped app hides provider-only image, scheduler UI. Outside scoped mode original Marketing UI/entitlement behaviour is preserved.

## Separately approvable action — code Preview only

If and only if the operator separately approves **this exact SHA** and target, deploy immutable `d5fc9f70bb4d75f9dd09d8829ced2a389f608c1a` to existing Vercel project `prj_d5DuC65u4hSITFRC54ygswiMW9ST`, **Preview** `target=null`, using existing `fix/colzo-pilot-release-gates-20261026` Development Preview environment, not a Production target. Avoid deploying a moving branch head if it advances since this packet.

Preflight **immediately before** any authorised deployment:
1. Read exact commit/changed-file list and verify code SHA, healthy project, branch environment pointing *only* to Business-AI-Dev `mvwseobgkexzpmmkgcxe`.
2. Verify Vercel SSO protection enabled and remains `all_except_custom_domains`, preserved tenant/frontend authentication, MFA/AAL2 and legal settings; no secret values logged.
3. Check existing zero-spend boundaries: billing disabled, paid voice/image generation disabled, Meta publishing and scheduled autopublish disabled; `COLZO_SCOPED_PILOT_ACCESS=true`, blanket `PILOT_FREE_STARTER_MARKETING` **not** enabled.
4. No SQL migration, grant change, expiry edit, reset, account alteration, real customer invitation, PR merge, Production alias, provider integration or paid resource is permitted under this approval.

On success read back Vercel `READY`, immutable Git SHA, Preview target, actual new URL and retained SSO. Anonymous interstitial 200 is protection, not application acceptance. Preserve currently deployed Preview as rollback; rollback itself is another separately approved action if needed.

## Minimum post-deployment authenticated smoke (not previously proved on candidate)

- Through legitimate private SSO + Supabase Auth, original fictional owner confirms booking POST/confirm/overlap 409/adjacent accepted/cancelled, saved data readback, version stale conflict, no accidental booking from refusal, existing dashboard/enquiries/actions/quotes/knowledge.
- Manual Knowledge item requires owner versioned accuracy confirmation, persists after refresh; no unapproved facts become active.
- Manual Marketing create → refresh → edit → owner preview/approve → refresh; no AI provider calls, no schedule/publish API and no Stripe state changes; inactive/expired/foreign business denied. Keep full AI Marketing offer unavailable pending separate provider/pricing decision.
- Independent QA owner must legitimately sign in, enrol MFA/AAL2 and accept current DPA privately. Then run two independently issued JWT foreign-ID, replay and role denial tests. Do not print tokens, QR codes, codes or passwords.
- Actual source/Auth/Storage backup plus isolated restore and operator/data-return/lifecycle signoff still hard gates; native/synthetic success does not bypass them.

## Decision boundary

**Code quality gate:** PASS in isolated CI. **Protected Preview upgrade:** AWAITING EXACT APPROVAL. **Authenticated live smoke:** PENDING. **True source/Auth/Storage recovery:** NO-GO. **One real-business 14-day pilot:** NO-GO. **Business AI Production:** PRESERVE UNCHANGED.

This packet is designed so the only deployment interaction left is an explicit approval and the authenticated acceptance steps; it does not prematurely approve either.
