import { MARKETING_SCHEMA } from '../lib/marketing.js';

// Deliberately fail the build after this bounded diagnostic: never assign aliases.
if (process.env.VERCEL_PROJECT_ID !== 'prj_GRPhAzaJnjlNv5KcQ16LhwdOX0kF') {
  console.info('MARKETING_PROBE: wrong project; no request made');
  process.exit(1);
}
if (!process.env.OPENROUTER_API_KEY) {
  console.info('MARKETING_PROBE: credential unavailable; no request made');
  process.exit(1);
}

function redact(value) {
  let text = String(value || '');
  for (const [name, secret] of Object.entries(process.env)) {
    if (/KEY|TOKEN|SECRET|PASSWORD/i.test(name) && secret.length >= 8) text = text.split(secret).join('[redacted]');
  }
  return text.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\bsk-[\w-]+/g, '[redacted]')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[redacted]')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[redacted]')
    .replace(/https?:\/\/\S+/gi, '[url redacted]').slice(0, 1200);
}

const minimal = {
  type: 'object', additionalProperties: false,
  properties: Object.fromEntries(Object.entries(MARKETING_SCHEMA.properties).map(([key, value]) =>
    [key, value.type === 'array' ? { type: 'array', items: { type: 'string' } } : { type: 'string' }])),
  required: [...MARKETING_SCHEMA.required]
};
for (const [label, schema] of [['exact_marketing_schema', MARKETING_SCHEMA], ['basic_same_fields', minimal]]) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
      body: JSON.stringify({
        model: 'apodex/apodex-1.1-mini:free',
        provider: { require_parameters: true, allow_fallbacks: true, sort: 'latency', data_collection: 'deny', zdr: true, max_price: { prompt: 0, completion: 0 } },
        messages: [{ role: 'system', content: 'Return only the requested JSON. This is a synthetic schema compatibility test.' },
          { role: 'user', content: 'Use Synthetic Service for main_copy and short_alternative. Use empty call_to_action and empty arrays. Do not add facts.' }],
        include_reasoning: false, max_tokens: 1800,
        response_format: { type: 'json_schema', json_schema: { name: 'business_marketing', strict: true, schema } }
      })
    });
    const data = await response.json();
    const metadata = data?.error?.metadata || {};
    let raw = metadata.raw;
    if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch {} }
    // Only synthetic requests enter this script. Never log successful output or prompts.
    console.info('MARKETING_PROBE ' + JSON.stringify({ label, http_status: response.status,
      error_code: redact(data?.error?.code), error_type: redact(metadata.error_type),
      provider_name: redact(metadata.provider_name), provider_code: redact(metadata.provider_code || raw?.error?.code || raw?.code),
      summary: redact(data?.error?.message),
      provider_summary: redact(raw?.error?.message || raw?.message || (typeof raw === 'string' ? raw : '')),
      finish_reason: redact(data?.choices?.[0]?.finish_reason), cost: data?.usage?.cost ?? null }));
    if (response.status !== 400) break;
  } catch (error) {
    console.info('MARKETING_PROBE ' + JSON.stringify({ label, error_name: error.name }));
    break;
  }
}
process.exit(1);
