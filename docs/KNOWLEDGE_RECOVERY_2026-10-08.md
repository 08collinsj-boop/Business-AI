# Pilot Knowledge recovery - 8 October 2026

Scope: business-ai-pilot only, branch pilot-progress-20261007. No separate Production application changes, billing changes, Marketing generation, automation runs or publishing.

## Evidence

The failed request `8pxwn-1791489600592-1d51ef3e0938` ended at 21:00:06 BST with HTTP 502. OpenAI Responses returned HTTP 429 and both Liquid free fallback attempts returned HTTP 429. The previous logger discarded error bodies and Retry-After headers, so neither historical 429 subtype can be recovered from these application logs. Do not label OpenAI's failure as exhausted credits on status alone.

A guarded Pilot diagnostic used GET /api/v1/key only for OpenRouter and an intentionally nonexistent OpenAI model (no inference or model charges possible). At approximately 21:05 BST, OpenRouter reported 7 free requests used of 50, 43 remaining, and zero daily monetary usage. This rules out an exhausted daily free allowance at the check time; it does not prove which upstream or per-minute limit caused the original 429. OpenAI returned model_not_found on the diagnostic, confirming authenticated API access but not credit availability. The diagnostic deployment deliberately failed its build and did not replace the live Pilot.

The unhandled rejection came from returning the fallback promise without awaiting it while asynchronous OpenAI file deletion ran in finally. The fallback could reject before the caller had attached a handler.

## Changes

- Await the fallback before cleanup; cover the rejection window in a child process using --unhandled-rejections=strict.
- Retain only allowlisted provider codes/types and classification flags in logs. Never log provider message bodies, keys, file contents or prompts.
- Retry temporary 429 responses at most once, honour numeric/date Retry-After, use exponential backoff with jitter and bounded delays, stop on long Retry-After or known quota restrictions, and use a warm-instance provider cooldown. Cooldowns are not durable across independent serverless instances.
- Check OpenRouter free allowance before text inference; skip inference when it is exhausted.
- Replace the Liquid text fallback with the previously verified Apodex free JSON-object endpoint, reasoning disabled, data_collection deny, explicit ZDR and zero-price limits. Keep local extraction validation and owner review. The existing primary OpenAI model is unchanged; no paid model is added or enabled.
- Add owner-only manual individual fact/service entry, with no provider or object-storage request. Store facts and their sources as Needs Review in the existing tables and normal review interface.
- Derive business/user from authenticated membership, reject tenant/status overrides, validate text/types/bounds, audit creation without fact contents, reject normalised duplicates, and use the existing unique business/hash index against concurrent manual duplicates. RLS policies and grants are unchanged; no migration is required.
- Preserve the failed uploaded source. Manual sources are separate and have no replacement link.

## Verification

530 tests passed, 0 failures, 0 skips. Local verification passed for 165 JavaScript files. Regressions cover Retry-After dates/seconds, long-delay stopping, permanent/unknown quota stopping, bounded retries, cooldowns, allowance checks, error redaction, async cleanup, owner-only entry, input validation, duplicates, failure-source preservation, Needs Review exclusion and explicit versioned approval followed by active-only retrieval used by Marketing.

Live facts must remain Needs Review until the owner explicitly approves in the normal interface. Live activation and Marketing grounding verification are conditional on that approval; no Marketing generation is authorised in this recovery task.
