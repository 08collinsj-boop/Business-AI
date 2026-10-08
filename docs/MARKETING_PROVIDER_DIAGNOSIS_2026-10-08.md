# Pilot Marketing provider diagnosis - 8 October 2026

## Confirmed failure

The owner request at 19:25:20-19:25:26 UTC (20:25 BST), request `z72zj-1791487520408-9cc96c02237e`, failed on deployment `dpl_2BHqwXehGUPYmj9TBxMfnom91eWi`, source `6e887617486808850dc7e19c6a9a338f8f9873c0`.

- Apodex via Novita returned HTTP/code 400. The top-level message was "Provider returned error". Synthetic replay captured nested provider metadata: "Model 'apodex/apodex-1.1-mini' does not support 'json_schema' response format. Supported formats: json_object."
- The exact Marketing schema and a basic schema with the same fields failed identically. This was a response-format incompatibility, not a maxLength/maxItems error.
- NVIDIA free returned 404: no endpoints matched the free-model training data policy. Its free route was absent from the current ZDR endpoint list. Paid ZDR alternatives were not used.
- The old logger ignored numeric codes and nested provider metadata, hiding the meaningful rejection.

The public endpoint catalogue advertised structured_outputs/response_format for Novita's free Apodex route. Its actual runtime rejected json_schema. Capability metadata alone is insufficient.

## Compatibility checks and fix

All probes were isolated build-time requests in the business-ai-pilot project, using synthetic data, never the authenticated Marketing API or customer content. Diagnostic builds deliberately exited with code 1, preventing deployment/alias replacement. No database, billing, scheduler, publishing or Knowledge approval call was made.

- Exact schema and basic schema rejection: `dpl_EYM5NREWrkScJBCafeWFV73kwrux`.
- JSON-object mode with legacy reasoning settings: `dpl_EQgn7Li4k9YdKY95TLX5jyXNSpQB`, HTTP 200, cost 0, finish_reason length, no valid object.
- JSON-object mode with reasoning explicitly disabled: `dpl_9sbeGXrstgw6xiekTvfk7ocrTySJ`, HTTP 200, cost 0, finish_reason stop, all five required fields.
- Real generateMarketing function: `dpl_3ycS35k28xAgGPmuS3DxsQKHWu91`. Grounding rejected unsupported service claims on attempts 1 and 2; attempt 3 validated successfully. No draft was stored.

Marketing now uses the free Apodex route for three bounded attempts, JSON-object mode with the closed output schema in its system instructions, and local enforcement of required fields, types, no extra fields and the original schema limits (900/260/160 characters; 6 hashtags; 4 missing-information items). Grounding, Brand Voice and retry corrections remain in place. It is locally validated structured JSON, not provider-enforced strict JSON Schema.

Privacy is strengthened with explicit `zdr: true` alongside retained `data_collection: deny` and `require_parameters: true`. `max_price: { prompt: 0, completion: 0 }` and the explicit :free model prohibit paid routing. Provider fallbacks remain enabled within these restrictions. Reasoning is explicitly disabled; include_reasoning:false alone only hid reasoning and did not prevent token-budget exhaustion. Per-attempt timeout remains 20 seconds and output budget 1,800 tokens.

Safe error diagnostics retain numeric and recognised nested error codes and classify known errors into fixed summaries. Arbitrary upstream messages, prompts, headers, metadata and customer information are not logged.

## Knowledge prerequisite and certification

The signed-in owner workspace is **Business AI**, public slug **my-business**, with profile services Pilot Testing and Marketing and description AI Receptionist. The Knowledge panel shows no uploaded files, no pending sources, no last review and 0 approved uploaded facts. Profile fields are separate from uploaded Knowledge. Server access is scoped to the authenticated account's single business membership; no other business's facts are borrowed.

No facts were uploaded or approved, and no business was switched. The requested certification against an approved saved Knowledge service remains blocked until the owner supplies and approves suitable facts for this business. Manual saved-draft generation and natural automation remain uncertified. AUTOMATION_FAILED remains unchanged. No authenticated generation was rerun.

Source verification: 520/520 tests passed, 0 failures/skips, and 162 JavaScript files passed verify:local. Regression checks cover numeric/nested provider diagnostics, error redaction, JSON-mode shape and bounds, ZDR and zero-price routing, reasoning settings, grounding, and Brand Voice.
