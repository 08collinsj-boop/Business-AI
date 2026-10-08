import assert from 'node:assert/strict';
import test from 'node:test';
import { marketingProviderDiagnostics } from '../lib/marketing-provider-diagnostics.js';
import { validateMarketingOutput, MARKETING_SCHEMA } from '../lib/marketing.js';

test('numeric router and nested provider errors survive safe diagnostics', () => {
  const result = marketingProviderDiagnostics({ error: {
    code: 400, message: 'Provider returned error', metadata: {
      provider_name: 'Novita', raw: JSON.stringify({ error: { code: 400,
        message: "Model 'apodex/apodex-1.1-mini' does not support 'json_schema' response format. Supported formats: json_object." } })
    }
  } });
  assert.equal(result.provider_code, 400);
  assert.equal(result.upstream_code, 400);
  assert.equal(result.provider_name, 'Novita');
  assert.equal(result.provider_error_summary, 'json_schema response format unsupported; supported format: json_object');
});

test('provider errors cannot leak echoed prompts, secrets or customer metadata', () => {
  const sensitive = 'private-customer-and-credential-value';
  const result = marketingProviderDiagnostics({ error: {
    code: sensitive, type: sensitive, param: sensitive, message: sensitive,
    metadata: { provider_name: sensitive, provider_code: sensitive,
      raw: JSON.stringify({ error: { code: sensitive, message: sensitive } }), request: sensitive }
  } });
  assert.ok(!JSON.stringify(result).includes(sensitive));
  assert.equal(result.provider_error_summary, 'Provider error detail withheld');
  assert.equal(result.provider_code, 'unknown');
});

test('free-model training restriction is classified without exposing the original message', () => {
  const result = marketingProviderDiagnostics({ error: { code: 404,
    message: 'No endpoints found matching your data policy (Free model training). Configure: private-url' } });
  assert.equal(result.provider_code, 404);
  assert.equal(result.provider_error_summary, 'No endpoint matches free-model training data policy');
  assert.ok(!JSON.stringify(result).includes('private-url'));
});

const valid = { main_copy: 'Synthetic Service.', short_alternative: '', call_to_action: '', hashtags: [], missing_information: [] };
test('JSON mode rejects malformed objects and applies every provider schema bound locally', () => {
  for (const key of ['main_copy', 'short_alternative', 'call_to_action']) {
    const max = MARKETING_SCHEMA.properties[key].maxLength;
    assert.doesNotThrow(() => validateMarketingOutput({ ...valid, [key]: 'x'.repeat(max) }));
    assert.throws(() => validateMarketingOutput({ ...valid, [key]: 'x'.repeat(max + 1) }));
  }
  for (const key of ['hashtags', 'missing_information']) {
    const max = MARKETING_SCHEMA.properties[key].maxItems;
    assert.doesNotThrow(() => validateMarketingOutput({ ...valid, [key]: Array(max).fill('item') }));
    assert.throws(() => validateMarketingOutput({ ...valid, [key]: Array(max + 1).fill('item') }));
  }
  for (const key of MARKETING_SCHEMA.required) {
    const incomplete = { ...valid }; delete incomplete[key];
    assert.throws(() => validateMarketingOutput(incomplete));
  }
  assert.throws(() => validateMarketingOutput({ ...valid, extra: 'untrusted' }));
  assert.throws(() => validateMarketingOutput({ ...valid, hashtags: [123] }));
  assert.throws(() => validateMarketingOutput('not an object'));
});
