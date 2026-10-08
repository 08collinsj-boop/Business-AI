const TYPES = new Set(['bad_request', 'invalid_request_error', 'invalid_json_schema', 'unsupported_response_format', 'rate_limit_exceeded', 'server', 'no_endpoints_found']);
const PARAMETERS = ['response_format', 'json_schema', 'json_object', 'maxLength', 'maxItems', 'include_reasoning', 'max_tokens'];

// Provider errors may echo prompts. Emit only known codes and fixed summaries,
// never the raw error, arbitrary metadata, headers, request or response output.
export function marketingProviderDiagnostics(data) {
  const error = data?.error || {};
  const metadata = error.metadata || {};
  let raw = metadata.raw;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { raw = { message: raw }; }
  }
  const upstream = raw?.error || raw || {};
  const code = value => Number.isInteger(value) && value >= 100 && value <= 599
    ? value : TYPES.has(value) ? value : 'unknown';
  const combined = [error.message, upstream.message].filter(v => typeof v === 'string').join('\n');
  let summary = 'Provider error detail withheld';
  if (/does not support ['"]?json_schema['"]? response format/i.test(combined)) {
    summary = 'json_schema response format unsupported';
    if (/supported formats:\s*json_object\.?\s*$/im.test(combined)) summary += '; supported format: json_object';
  } else if (/no endpoints found matching your data policy/i.test(combined)) {
    summary = /free model training/i.test(combined) ? 'No endpoint matches free-model training data policy' : 'No endpoint matches data policy';
  } else if (/invalid.*schema|schema.*(?:invalid|unsupported)/i.test(combined)) {
    summary = 'JSON schema rejected';
  } else if (/rate limit/i.test(combined)) summary = 'Provider rate limit';
  const param = [error.param, upstream.param].find(v => PARAMETERS.includes(v)) || 'none';
  return {
    provider_code: code(error.code),
    upstream_code: code(metadata.provider_code ?? upstream.code),
    provider_type: TYPES.has(metadata.error_type ?? error.type) ? metadata.error_type ?? error.type : 'unknown',
    provider_name: ['Novita', 'Nvidia', 'NVIDIA'].includes(metadata.provider_name) ? metadata.provider_name : 'unknown',
    provider_param: param,
    provider_error_summary: summary,
    provider_metadata_present: Boolean(error.metadata)
  };
}
