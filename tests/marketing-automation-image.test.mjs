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
  assert.match(prompt, /Do not invent prices, discounts, percentages/);
  assert.match(prompt, /NO READABLE TEXT OR NUMBERS OF ANY KIND/);
  assert.match(prompt, /BS 1363 Type G sockets\/plugs/);
  assert.match(prompt, /do not show North American NEMA outlets/i);
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


test('simulated live provider completes storage and Facebook photo pipeline without external calls', async () => {
  const BUSINESS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const GENERATION = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const IMAGE = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  Object.assign(process.env, {
    BILLING_ENABLED: 'false',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'server-key',
    OPENAI_API_KEY: 'fake-provider-key',
    IMAGE_GENERATION_MODE: 'live',
    IMAGE_GENERATION_MODEL: 'fake-image-model',
    META_APP_ID: 'app-id',
    META_APP_SECRET: 'app-secret',
    META_REDIRECT_URI: 'https://pilot.example.test/api/meta-callback',
    META_GRAPH_API_VERSION: 'v24.0',
    META_OAUTH_SCOPES: 'pages_show_list,pages_read_engagement,pages_manage_posts',
    META_TOKEN_ENCRYPTION_KEY: '22'.repeat(32),
    META_PUBLISH_ENABLED: 'true'
  });

  const calls = [];
  const fakeImage = Buffer.alloc(256, 7).toString('base64');
  globalThis.fetch = async (url, options = {}) => {
    const href = String(url);
    calls.push({ href, options });

    if (href.includes('/rest/v1/business_feature_entitlements')) {
      return response([{ feature_key: 'ai_marketing', status: 'active', source: 'manual', expires_at: null }]);
    }
    if (href.includes('/rest/v1/marketing_generations')) {
      return response([{
        id: GENERATION,
        business_id: BUSINESS,
        content_type: 'social_post',
        platform: 'facebook',
        tone: 'friendly',
        request_text: 'Promote electrical maintenance',
        status: 'completed',
        approval_status: 'approved',
        output: {
          main_copy: 'Reliable electrical maintenance for local businesses.',
          short_alternative: 'Electrical maintenance.',
          call_to_action: 'Message us to learn more.',
          hashtags: ['#Electrical'],
          missing_information: []
        },
        edited_output: null
      }]);
    }
    if (href.includes('/rest/v1/business_settings')) {
      return response([{ business_name: 'Example Electrical', business_type: 'Electrical contractor', services: 'Electrical maintenance', address: 'Teesside', opening_hours: null, phone: null, email: null }]);
    }
    if (href.includes('/rest/v1/business_configurations')) {
      return response([{ description: 'Local electrical contractor', website: null, service_areas: ['Teesside'], faqs: [] }]);
    }
    if (href.includes('/rest/v1/business_knowledge_')) {
      return response([]);
    }
    if (href.includes('/rest/v1/rpc/reserve_marketing_image_usage')) {
      return response({ allowed: true, id: '99999999-9999-4999-8999-999999999999', used: 1, limit: 3 });
    }
    if (href.includes('/rest/v1/marketing_images?on_conflict=business_id,generation_id') && options.method === 'POST') {
      const body = JSON.parse(options.body);
      return response([{ id: IMAGE, ...body, created_at: new Date().toISOString() }], true, 201);
    }
    if (href.includes('/rest/v1/marketing_images?business_id=eq.') && options.method === 'PATCH') {
      const body = JSON.parse(options.body);
      return response([{
        id: IMAGE,
        generation_id: GENERATION,
        business_id: BUSINESS,
        provider: 'openai',
        model: 'fake-image-model',
        storage_path: BUSINESS + '/' + GENERATION + '/' + IMAGE + '.jpg',
        created_at: new Date().toISOString(),
        ...body
      }]);
    }
    if (href === 'https://api.openai.com/v1/images/generations') {
      return response({ data: [{ id: 'fake-provider-image', b64_json: fakeImage }] });
    }
    if (href.includes('/storage/v1/object/marketing-images/')) {
      return response({}, true, 200);
    }
    if (href.includes('/storage/v1/object/sign/marketing-images/')) {
      return response({ signedURL: 'https://signed.example.test/generated-image.jpg?token=test' });
    }
    if (href.includes('graph.facebook.com') && href.endsWith('/page-123/photos')) {
      return response({ id: 'page-123_photo-1' });
    }
    return response([], true, 200);
  };

  const imageModule = await import(new URL('../lib/marketing-image.js?pipeline=' + Math.random(), import.meta.url));
  const generated = await imageModule.generateMarketingImage({
    businessId: BUSINESS,
    actorUserId: null,
    generationId: GENERATION
  });

  assert.equal(generated.status, 'completed');
  assert.equal(generated.image_url, 'https://signed.example.test/generated-image.jpg?token=test');
  assert.equal(generated.mime_type, 'image/jpeg');
  const approvalReset = calls.find(call => call.href.includes('/rest/v1/marketing_generations?business_id=eq.') && call.options.method === 'PATCH');
  assert.ok(approvalReset, 'new image must reset the Marketing draft approval');
  const approvalBody = JSON.parse(approvalReset.options.body);
  assert.equal(approvalBody.approval_status, 'draft');
  assert.equal(approvalBody.approved_at, null);
  assert.equal(approvalBody.approved_by, null);

  const meta = await import(new URL('../lib/meta.js?pipeline=' + Math.random(), import.meta.url));
  const account = {
    provider_account_id: 'page-123',
    ...meta.encryptMetaToken('EAAB-simulated-page-token')
  };
  const published = await meta.publishMetaPhoto({
    platform: 'facebook',
    account,
    text: 'Reliable electrical maintenance for local businesses.',
    imageUrl: generated.image_url
  });

  assert.equal(published.providerPostId, 'page-123_photo-1');
  assert.equal(published.mediaType, 'image');

  const providerCall = calls.find(call => call.href === 'https://api.openai.com/v1/images/generations');
  assert.ok(providerCall);
  const storageUpload = calls.find(call => call.href.includes('/storage/v1/object/marketing-images/'));
  assert.ok(storageUpload);
  assert.equal(storageUpload.options.headers['Content-Type'], 'image/jpeg');
  assert.equal(Buffer.isBuffer(storageUpload.options.body), true);
  const metaCall = calls.find(call => call.href.endsWith('/page-123/photos'));
  assert.ok(metaCall);
  const form = new URLSearchParams(metaCall.options.body);
  assert.equal(form.get('url'), generated.image_url);
  assert.equal(form.get('published'), 'true');
});


test('Cloudflare FLUX adapter generates, stores and signs an image through the shared pipeline', async () => {
  const BUSINESS = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const GENERATION = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const IMAGE = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  const ACCOUNT = 'a'.repeat(32);
  const TOKEN = 'cloudflare-test-token-value-1234567890';

  Object.assign(process.env, {
    BILLING_ENABLED: 'false',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'server-key',
    IMAGE_GENERATION_PROVIDER: 'cloudflare',
    CLOUDFLARE_ACCOUNT_ID: ACCOUNT,
    CLOUDFLARE_API_TOKEN: TOKEN,
    CLOUDFLARE_IMAGE_MODEL: '@cf/black-forest-labs/flux-1-schnell'
  });
  delete process.env.OPENAI_API_KEY;

  const calls = [];
  const fakeImage = Buffer.alloc(256, 9).toString('base64');
  globalThis.fetch = async (url, options = {}) => {
    const href = String(url);
    calls.push({ href, options });

    if (href.includes('/rest/v1/business_feature_entitlements')) {
      return response([{ feature_key: 'ai_marketing', status: 'active', source: 'manual', expires_at: null }]);
    }
    if (href.includes('/rest/v1/marketing_generations')) {
      return response([{
        id: GENERATION,
        business_id: BUSINESS,
        content_type: 'social_post',
        platform: 'facebook',
        tone: 'friendly',
        request_text: 'Promote electrical maintenance',
        status: 'completed',
        approval_status: 'approved',
        output: {
          main_copy: 'Reliable electrical maintenance for local businesses.',
          short_alternative: '',
          call_to_action: '',
          hashtags: [],
          missing_information: []
        },
        edited_output: null
      }]);
    }
    if (href.includes('/rest/v1/business_settings')) {
      return response([{ business_name: 'Example Electrical', business_type: 'Electrical contractor', services: 'Electrical maintenance', address: 'Teesside' }]);
    }
    if (href.includes('/rest/v1/business_configurations')) return response([{}]);
    if (href.includes('/rest/v1/business_knowledge_')) return response([]);
    if (href.includes('/rest/v1/rpc/reserve_marketing_image_usage')) {
      return response({ allowed: true, id: '99999999-9999-4999-8999-999999999999', used: 1, limit: 3 });
    }
    if (href.includes('/rest/v1/marketing_images?on_conflict=business_id,generation_id') && options.method === 'POST') {
      const body = JSON.parse(options.body);
      return response([{ id: IMAGE, ...body, created_at: new Date().toISOString() }], true, 201);
    }
    if (href.includes('/rest/v1/marketing_images?business_id=eq.') && options.method === 'PATCH') {
      const body = JSON.parse(options.body);
      return response([{
        id: IMAGE,
        generation_id: GENERATION,
        business_id: BUSINESS,
        provider: 'cloudflare',
        model: '@cf/black-forest-labs/flux-1-schnell',
        storage_path: BUSINESS + '/' + GENERATION + '/' + IMAGE + '.jpg',
        created_at: new Date().toISOString(),
        ...body
      }]);
    }
    if (href === 'https://api.cloudflare.com/client/v4/accounts/' + ACCOUNT + '/ai/run/@cf/black-forest-labs/flux-1-schnell') {
      return response({ success: true, result: { image: fakeImage }, errors: [], messages: [] });
    }
    if (href.includes('/storage/v1/object/marketing-images/')) return response({}, true, 200);
    if (href.includes('/storage/v1/object/sign/marketing-images/')) {
      return response({ signedURL: 'https://signed.example.test/cloudflare-image.jpg?token=test' });
    }
    return response([], true, 200);
  };

  const image = await import(new URL('../lib/marketing-image.js?cloudflare=' + Math.random(), import.meta.url));
  const config = image.imageGenerationConfiguration();
  assert.equal(config.provider, 'cloudflare');
  assert.equal(config.configured, true);
  assert.equal(config.model, '@cf/black-forest-labs/flux-1-schnell');

  const generated = await image.generateMarketingImage({
    businessId: BUSINESS,
    actorUserId: null,
    generationId: GENERATION
  });

  assert.equal(generated.status, 'completed');
  assert.equal(generated.provider, 'cloudflare');
  assert.equal(generated.image_url, 'https://signed.example.test/cloudflare-image.jpg?token=test');

  const providerCall = calls.find(call => call.href.includes('api.cloudflare.com/client/v4/accounts/'));
  assert.ok(providerCall);
  assert.equal(providerCall.options.headers.Authorization, 'Bearer ' + TOKEN);
  const providerBody = JSON.parse(providerCall.options.body);
  assert.equal(providerBody.steps, 8);
  assert.match(providerBody.prompt, /Example Electrical/);
  assert.ok(providerBody.prompt.length <= 2048);
});

test.after(() => {
  process.env = savedEnv;
  globalThis.fetch = savedFetch;
});
