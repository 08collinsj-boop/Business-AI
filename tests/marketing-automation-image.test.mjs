import assert from 'node:assert/strict';
import test from 'node:test';

const savedEnv = { ...process.env };
const savedFetch = globalThis.fetch;

function response(body, ok = true, status = ok ? 200 : 500) {
  return {
    ok,
    status,
    text: async () => typeof body === 'string' ? body : JSON.stringify(body)
  };
}

function metaEnv() {
  process.env.META_APP_ID = 'app-id';
  process.env.META_APP_SECRET = 'app-secret';
  process.env.META_REDIRECT_URI = 'https://pilot.example.test/api/meta-callback';
  process.env.META_GRAPH_API_VERSION = 'v24.0';
  process.env.META_OAUTH_SCOPES = 'pages_show_list,pages_read_engagement,pages_manage_posts';
  process.env.META_TOKEN_ENCRYPTION_KEY = '11'.repeat(32);
  process.env.META_PUBLISH_ENABLED = 'true';
}

test('image generation defaults to simulation and does not require paid provider configuration', async () => {
  delete process.env.IMAGE_GENERATION_MODE;
  delete process.env.OPENAI_API_KEY;
  const image = await import(new URL('../lib/marketing-image.js?config=' + Math.random(), import.meta.url));
  const config = image.imageGenerationConfiguration();
  assert.equal(config.mode, 'simulate');
  assert.equal(config.provider, 'simulation');
  assert.equal(config.configured, true);
});

test('marketing image prompt uses trusted facts and asks the image model not to invent claims', async () => {
  const image = await import(new URL('../lib/marketing-image.js?prompt=' + Math.random(), import.meta.url));
  const prompt = image.buildMarketingImagePrompt(
    {
      output: {
        main_copy: 'We provide electrical maintenance for local businesses.'
      }
    },
    {
      business_name: 'Example Electrical',
      business_type: 'Electrical contractor',
      services: 'Electrical maintenance',
      address: 'Teesside'
    }
  );
  assert.match(prompt, /Example Electrical/);
  assert.match(prompt, /Electrical maintenance/);
  assert.match(prompt, /Do not invent prices, discounts/);
  assert.doesNotMatch(prompt, /guaranteed cheapest|50% off/i);
});

test('automation settings accept only owner-controlled supported values', async () => {
  const automation = await import(new URL('../lib/marketing-automation.js?settings=' + Math.random(), import.meta.url));
  assert.deepEqual(
    automation.validateMarketingAutomationUpdate({
      enabled: true,
      mode: 'approval_required',
      tone: 'friendly',
      image_enabled: true
    }),
    {
      enabled: true,
      mode: 'approval_required',
      tone: 'friendly',
      image_enabled: true
    }
  );
  assert.throws(
    () => automation.validateMarketingAutomationUpdate({
      enabled: true,
      mode: 'fully_automated',
      tone: 'friendly',
      image_enabled: false,
      business_id: 'attacker-controlled'
    }),
    /Invalid automation settings/
  );
  assert.throws(
    () => automation.validateMarketingAutomationUpdate({
      enabled: true,
      mode: 'anything_goes',
      tone: 'friendly',
      image_enabled: false
    }),
    /Invalid automation settings/
  );
});

test('Facebook image publishing posts to the selected Page photos endpoint and keeps tokens out of the URL', async () => {
  metaEnv();
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return response({ id: 'photo-post-1' });
  };

  const meta = await import(new URL('../lib/meta.js?photo=' + Math.random(), import.meta.url));
  const account = {
    provider_account_id: 'page-123',
    ...meta.encryptMetaToken('EAAB-sensitive-page-token')
  };

  const result = await meta.publishMetaPhoto({
    platform: 'facebook',
    account,
    text: 'A business post',
    imageUrl: 'https://signed.example.test/image.jpg?token=temporary'
  });

  assert.equal(result.providerPostId, 'photo-post-1');
  assert.equal(result.mediaType, 'image');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/page-123\/photos$/);
  assert.doesNotMatch(calls[0].url, /EAAB-sensitive-page-token/);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer EAAB-sensitive-page-token');
  const form = new URLSearchParams(calls[0].options.body);
  assert.equal(form.get('message'), 'A business post');
  assert.equal(form.get('url'), 'https://signed.example.test/image.jpg?token=temporary');
  assert.equal(form.get('published'), 'true');
});

test.after(() => {
  process.env = savedEnv;
  globalThis.fetch = savedFetch;
});
