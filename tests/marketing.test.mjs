import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import addonsHandler from '../lib/addons-handler.js';
import marketingHandler from '../lib/marketing-handler.js';

import {
  activeAddon,
  addonDefinition
} from '../lib/addons.js';

import {
  validateMarketingInput,
  validateMarketingOutput,
  validateMarketingGrounding,
  marketingCopySimilarity,
  isNearDuplicateMarketingCopy,
  MARKETING_SYSTEM_PROMPT
} from '../lib/marketing.js';

const savedEnv = { ...process.env };
const originalFetch = globalThis.fetch;

afterEach(() => {
  process.env = { ...savedEnv };
  globalThis.fetch = originalFetch;
});

const input = {
  content_type: 'social_post',
  platform: 'facebook',
  tone: 'friendly',
  prompt: 'Promote our repairs'
};

const output = {
  main_copy: 'Explore our repair service.',
  short_alternative: 'Repairs from Acme.',
  call_to_action: 'Ask us about repairs.',
  hashtags: ['#Repairs'],
  missing_information: []
};

const response = (
  body,
  ok = true,
  status = ok ? 200 : 500
) => ({
  ok,
  status,

  text: async () => JSON.stringify(body),

  json: async () => body
});

const res = () => ({
  statusCode: 0,

  headers: {},

  setHeader(key, value) {
    this.headers[key] = value;
  },

  status(code) {
    this.statusCode = code;
    return this;
  },

  json(body) {
    this.body = body;
    return this;
  }
});

function setup({
  entitled = true,

  role = 'owner',

  reservation = {
    allowed: true,
    id: 'generation-a'
  },

  model = output,

  authValid = true
} = {}) {
  Object.assign(
    process.env,
    {
      TENANCY_AUTH_ENABLED: 'true',

      SUPABASE_URL:
        'https://example.test',

      SUPABASE_SERVICE_ROLE_KEY:
        'fake-service-key',

      OPENROUTER_API_KEY:
        'fake-provider-key'
    }
  );

  const calls = [];

  globalThis.fetch = async (
    url,
    options = {}
  ) => {
    calls.push({
      url,
      options
    });

    if (
      url.endsWith('/auth/v1/user')
    ) {
      return response(
        {
          id: 'user-a'
        },
        authValid,
        authValid ? 200 : 401
      );
    }

    if (
      url.includes(
        'business_memberships'
      )
    ) {
      return response([
        {
          business_id:
            'business-a',

          role
        }
      ]);
    }

    if (
      url.includes(
        'business_feature_entitlements'
      )
    ) {
      return response(
        entitled
          ? [
              {
                feature_key:
                  'ai_marketing',

                status:
                  'active'
              }
            ]
          : []
      );
    }

    if (url.includes('business_incident_controls')) {
      return response([]);
    }

    if (url.includes('platform_incident_controls')) {
      return response([{ id: 'global' }]);
    }

    if (
      url.includes(
        'business_settings'
      )
    ) {
      return response([
        {
          business_name:
            'Acme',

          services:
            'Repairs',

          opening_hours:
            'Monday 9–5'
        }
      ]);
    }

    if (
      url.includes(
        'business_configurations'
      )
    ) {
      return response([
        {
          description:
            'Local repairs',

          faqs: [
            {
              question:
                'Area?',

              answer:
                'York'
            }
          ]
        }
      ]);
    }

    if (
      url.includes(
        'rpc/reserve_marketing_generation'
      )
    ) {
      return response(
        reservation
      );
    }

    if (
      url.startsWith(
        'https://openrouter.ai'
      )
    ) {
      return response({
        id:
          'response-a',

        model:
          'openrouter/test-free',

        choices: [
          {
            finish_reason:
              'stop',

            message: {
              content:
                typeof model === 'string'
                  ? model
                  : JSON.stringify(model)
            }
          }
        ],

        usage: {
          prompt_tokens:
            150,

          completion_tokens:
            100
        }
      });
    }

    if (
      url.includes(
        'marketing_generations'
      ) ||
      url.includes(
        'business_audit_events'
      )
    ) {
      return response(null);
    }

    throw new Error(
      `Unexpected request: ${url}`
    );
  };

  return calls;
}

async function call(
  handler,
  {
    method = 'POST',

    body = input,

    query = {},

    token = true
  } = {}
) {
  const result = res();

  await handler(
    {
      method,

      body,

      query,

      headers:
        token
          ? {
              authorization:
                'Bearer verified'
            }
          : {}
    },

    result
  );

  return result;
}

for (
  const [name, handler]
  of [
    ['add-ons', addonsHandler],
    ['marketing', marketingHandler]
  ]
) {
  test(
    `${name}: unauthenticated access is rejected`,
    async () => {
      setup();

      assert.equal(
        (
          await call(
            handler,
            {
              token: false
            }
          )
        ).statusCode,
        401
      );
    }
  );

  test(
    `${name}: invalid token is rejected`,
    async () => {
      setup({
        authValid: false
      });

      assert.equal(
        (
          await call(handler)
        ).statusCode,
        401
      );
    }
  );

  test(
    `${name}: legacy auth-disabled mode fails closed`,
    async () => {
      const calls = setup();

      process.env.TENANCY_AUTH_ENABLED =
        'false';

      assert.equal(
        (
          await call(handler)
        ).statusCode,
        503
      );

      assert.equal(
        calls.length,
        0
      );
    }
  );

  test(
    `${name}: tenant query is rejected`,
    async () => {
      const calls = setup();

      assert.equal(
        (
          await call(
            handler,
            {
              method:
                name === 'add-ons'
                  ? 'GET'
                  : 'POST',

              query: {
                business_id:
                  'business-b'
              }
            }
          )
        ).statusCode,
        400
      );

      assert.ok(
        calls.every(
          call =>
            !call.url.includes(
              'business-b'
            )
        )
      );
    }
  );
}

test(
  'add-on catalogue returns only membership-scoped entitlement and safe pricing',
  async () => {
    const calls = setup();

    const result =
      await call(
        addonsHandler,
        {
          method:
            'GET'
        }
      );

    assert.equal(
      result.statusCode,
      200
    );

    assert.equal(
      result.body
        .addons[0]
        .entitlement,
      'active'
    );

    assert.equal(
      result.body
        .addons[1]
        .entitlement,
      'unavailable'
    );

    assert.ok(
      result.body
        .addons
        .every(
          addon =>
            !addon.purchasable
        )
    );

    assert.equal(
      result.body
        .addons[0]
        .pricing
        .amount,
      1999
    );

    assert.equal(
      result.body
        .addons[1]
        .pricing
        .amount,
      null
    );

    assert.ok(
      calls.find(
        call =>
          call.url.includes(
            'business_feature_entitlements?business_id=eq.business-a'
          )
      )
    );

    assert.doesNotMatch(
      JSON.stringify(
        result.body
      ),
      /stripe_price|service-key/
    );
  }
);

for (
  const key
  of [
    'unknown',
    '__proto__',
    'constructor'
  ]
) {
  test(
    `unknown add-on ${key} rejected`,
    async () => {
      setup();

      assert.equal(
        (
          await call(
            addonsHandler,
            {
              body: {
                action:
                  'purchase',

                key
              }
            }
          )
        ).statusCode,
        400
      );

      assert.throws(
        () =>
          addonDefinition(
            key
          )
      );
    }
  );
}

for (
  const extra
  of [
    {
      active: true
    },

    {
      status:
        'active'
    },

    {
      status:
        'invalid'
    },

    {
      business_id:
        'business-b'
    },

    {
      price:
        1
    },

    {
      price_id:
        'price_fake'
    },

    {
      stripe_price_id:
        'price_fake'
    },

    {
      amount:
        1
    }
  ]
) {
  test(
    `client cannot grant or price entitlement: ${
      Object.keys(extra)[0]
    }=${
      Object.values(extra)[0]
    }`,
    async () => {
      const calls =
        setup();

      assert.equal(
        (
          await call(
            addonsHandler,
            {
              body: {
                action:
                  'purchase',

                key:
                  'ai_marketing',

                ...extra
              }
            }
          )
        ).statusCode,
        400
      );

      assert.equal(
        calls.filter(
          call =>
            call.options
              .method ===
            'POST'
        ).length,
        0
      );
    }
  );
}

for (
  const key
  of [
    'ai_marketing',
    'ai_phone'
  ]
) {
  test(
    `${key} cannot start unconfigured checkout`,
    async () => {
      const calls =
        setup();

      assert.equal(
        (
          await call(
            addonsHandler,
            {
              body: {
                action:
                  'purchase',

                key
              }
            }
          )
        ).statusCode,
        409
      );

      assert.ok(
        calls.every(
          call =>
            !call.url.includes(
              'stripe'
            )
        )
      );
    }
  );
}

for (
  const role
  of [
    'admin',
    'member'
  ]
) {
  test(
    `${role} can read add-ons but cannot manage purchases`,
    async () => {
      setup({
        role
      });

      assert.equal(
        (
          await call(
            addonsHandler,
            {
              method:
                'GET'
            }
          )
        ).statusCode,
        200
      );

      assert.equal(
        (
          await call(
            addonsHandler,
            {
              body: {
                action:
                  'purchase',

                key:
                  'ai_marketing'
              }
            }
          )
        ).statusCode,
        403
      );
    }
  );
}

test(
  'inactive, expired and coming-soon entitlements cannot grant access',
  () => {
    assert.equal(
      activeAddon(
        'ai_marketing',
        {
          status:
            'active',

          expires_at:
            '2000-01-01'
        }
      ),
      false
    );

    assert.equal(
      activeAddon(
        'ai_marketing',
        {
          status:
            'inactive'
        }
      ),
      false
    );

    assert.equal(
      activeAddon(
        'ai_phone',
        {
          status:
            'active'
        }
      ),
      false
    );
  }
);

test(
  'no entitlement prevents context reads, reservations and AI calls',
  async () => {
    const calls =
      setup({
        entitled:
          false
      });

    assert.equal(
      (
        await call(
          marketingHandler
        )
      ).statusCode,
      403
    );

    assert.ok(
      calls.every(
        call =>
          !/business_settings|openrouter|reserve_marketing/.test(
            call.url
          )
      )
    );
  }
);

for (
  const role
  of [
    'owner',
    'admin',
    'member'
  ]
) {
  test(
    `entitled ${role} generates using only own business context`,
    async () => {
      const calls =
        setup({
          role
        });

      const result =
        await call(
          marketingHandler
        );

      assert.equal(
        result.statusCode,
        200
      );

      assert.deepEqual(
        result.body.output,
        output
      );

      const storageReads =
        calls.filter(
          call =>
            /business_settings|business_configurations|business_feature_entitlements/.test(
              call.url
            )
        );

      assert.ok(
        storageReads.every(
          call =>
            call.url.includes(
              'business_id=eq.business-a'
            )
        )
      );

      const reserve =
        JSON.parse(
          calls.find(
            call =>
              call.url.includes(
                'rpc/'
              )
          ).options.body
        );

      assert.equal(
        reserve.p_business_id,
        'business-a'
      );

      assert.equal(
        reserve.p_actor_user_id,
        'user-a'
      );

      const modelCall =
        JSON.parse(
          calls.find(
            call =>
              call.url.includes(
                'openrouter.ai'
              )
          ).options.body
        );

      const context =
        JSON.parse(
          modelCall.messages[1].content
        );

      assert.equal(
        context[
          'TRUSTED BUSINESS FACTS'
        ].business_name,
        'Acme'
      );

      assert.equal(
        context[
          'TRUSTED BUSINESS FACTS'
        ].faqs[0].answer,
        'York'
      );

      assert.equal(
        context[
          'TRUSTED BUSINESS FACTS'
        ].price,
        undefined
      );

      // Marketing no longer uses the old 2,200 token cap.
      assert.equal(
        modelCall.max_output_tokens,
        undefined
      );

      assert.equal(
        modelCall.model,
        'liquid/lfm-2.5-2.6b:free'
      );

      assert.equal(
        modelCall.provider.require_parameters,
        true
      );

      assert.equal(
        modelCall.provider.allow_fallbacks,
        true
      );

      assert.equal(
        modelCall.provider.sort,
        'throughput'
      );

      assert.equal(
        modelCall.provider.data_collection,
        'deny'
      );

      assert.equal(
        modelCall.response_format.type,
        'json_schema'
      );

      assert.equal(
        modelCall.max_tokens,
        1800
      );

      assert.ok(
        calls.find(
          call =>
            call.url.includes(
              'marketing_generations?id=eq.generation-a&business_id=eq.business-a'
            )
        )
      );
    }
  );
}

for (
  const [key, value]
  of [
    [
      'business_id',
      'business-b'
    ],

    [
      'content_type',
      'invalid'
    ],

    [
      'platform',
      'tiktok'
    ],

    [
      'tone',
      'invalid'
    ],

    [
      'prompt',
      'x'.repeat(
        2001
      )
    ],

    [
      'extra_instructions',
      'x'.repeat(
        1001
      )
    ],

    [
      'active',
      true
    ]
  ]
) {
  test(
    `marketing rejects invalid ${key}`,
    async () => {
      const calls =
        setup();

      assert.equal(
        (
          await call(
            marketingHandler,
            {
              body: {
                ...input,

                [key]:
                  value
              }
            }
          )
        ).statusCode,
        400
      );

      assert.ok(
        calls.every(
          call =>
            !call.url.includes(
              'openrouter'
            )
        )
      );
    }
  );
}

for (
  const value
  of [
    null,
    [],
    '{',
    'x'.repeat(
      12001
    ),
    {
      ...input,
      prompt:
        '   '
    }
  ]
) {
  test(
    `marketing body validation rejects ${
      typeof value === 'string'
        ? value.slice(
            0,
            10
          )
        : JSON.stringify(
            value
          )
    }`,
    () =>
      assert.throws(
        () =>
          validateMarketingInput(
            value
          )
      )
  );
}

test('marketing grounding rejects newly invented service categories', () => {
  const facts = {
    business_name: 'Hartlepool Test Electrical',
    business_type: 'Electrical services',
    services: 'Socket replacement, Lighting repairs',
    service_areas: 'Hartlepool'
  };
  const request = { ...input, prompt: 'Promote our socket replacement service in Hartlepool' };

  assert.doesNotThrow(() => validateMarketingGrounding({
    ...output,
    main_copy: 'Need a socket replacement in Hartlepool? Ask Hartlepool Test Electrical about socket replacement.',
    short_alternative: 'Socket replacement in Hartlepool.',
    call_to_action: 'Ask us about socket replacement.'
  }, facts, request));

  assert.throws(() => validateMarketingGrounding({
    ...output,
    main_copy: 'We provide comprehensive safety assessments alongside socket replacement.',
    short_alternative: 'Book a safety assessment today.',
    call_to_action: 'Schedule your safety assessment.'
  }, facts, request), /not supported by saved business information/i);
});



test('marketing prompt requires a hidden factuality and quality preflight', () => {
  assert.match(MARKETING_SYSTEM_PROMPT, /Every factual, measurable or reputation claim/i);
  assert.match(MARKETING_SYSTEM_PROMPT, /silently check every factual claim/i);
  assert.match(MARKETING_SYSTEM_PROMPT, /Avoid fake urgency, clickbait, generic hype/i);
});

test('marketing grounding rejects unsupported hype and business claims', () => {
  const facts = { business_name: 'The Smashed Burger Co.', services: 'Burgers', service_areas: 'Hartlepool' };
  const request = { ...input, prompt: 'Promote our burgers in Hartlepool' };

  for (const main_copy of [
    'Try Hartlepool’s best burgers.',
    'Enjoy our award-winning burgers.',
    'Made with fresh locally sourced ingredients.',
    'A family-run burger business you can trust.',
    'Serving burgers with 20 years of experience.'
  ]) {
    assert.throws(() => validateMarketingGrounding({
      ...output,
      main_copy,
      short_alternative: 'Burgers in Hartlepool.',
      call_to_action: 'Get in touch.'
    }, facts, request), /unsupported marketing claim/i);
  }

  assert.doesNotThrow(() => validateMarketingGrounding({
    ...output,
    main_copy: 'Our family-run burger business uses fresh locally sourced ingredients.',
    short_alternative: 'Fresh locally sourced ingredients.',
    call_to_action: 'Get in touch.'
  }, facts, { ...request, prompt: 'Promote our family-run burger business using fresh locally sourced ingredients.' }));
});

test('marketing prompt uses previous posts as style only and improves caption quality', () => {
  assert.match(MARKETING_SYSTEM_PROMPT, /BRAND STYLE EXAMPLES/i);
  assert.match(MARKETING_SYSTEM_PROMPT, /NOT trusted facts/i);
  assert.match(MARKETING_SYSTEM_PROMPT, /Match the style, not the facts/i);
  assert.match(MARKETING_SYSTEM_PROMPT, /Start with a clear, relevant hook/i);
  assert.match(MARKETING_SYSTEM_PROMPT, /2–5 short readable paragraphs/i);
  assert.match(MARKETING_SYSTEM_PROMPT, /avoid repeating the\s+same topic or opening/i);
});

test('style examples never authorise an unsupported factual claim', () => {
  const facts = { business_name: 'The Smashed Burger Co.', services: 'Burgers', service_areas: 'Hartlepool' };
  const request = { ...input, prompt: 'Write a Facebook caption about our burgers' };
  assert.throws(() => validateMarketingGrounding({
    ...output,
    main_copy: 'Try our award-winning burgers made with fresh locally sourced ingredients.',
    short_alternative: 'Burgers in Hartlepool.',
    call_to_action: 'Get in touch.'
  }, facts, request), /unsupported marketing claim/i);
});

test('marketing prompt treats saved services as a closed catalogue', () => {
  assert.match(MARKETING_SYSTEM_PROMPT, /catalogue as CLOSED/i);
  assert.match(MARKETING_SYSTEM_PROMPT, /must not invite customers to book,\s*schedule or request a service unless/i);
});

test('marketing grounding rejects invented qualifications and free quotes', () => {
  const facts = { services: 'Lighting installation', service_areas: 'Hartlepool' };
  const request = { ...input, prompt: 'Promote lighting installation enquiries. Do not add certified electricians or free quotes.' };
  for (const main_copy of ['Our certified electricians install lighting.', 'Ask for a free quote.']) {
    assert.throws(() => validateMarketingGrounding({ ...output, main_copy,
      short_alternative: 'Lighting installation enquiries.', call_to_action: 'Contact us.'
    }, facts, request), /qualification or free quote claim/i);
  }
  assert.doesNotThrow(() => validateMarketingGrounding({ ...output,
    main_copy: 'Our certified electricians offer a free quote.',
    short_alternative: 'Lighting installation enquiries.', call_to_action: 'Contact us.'
  }, { ...facts, qualifications: 'certified electricians', quote_policy: 'free quote' }, request));
});

test('marketing grounding rejects self-confirmed booking wording', () => {
  const facts = { business_name: 'Hartlepool Test Electrical', services: 'Socket replacement', service_areas: 'Hartlepool' };
  const request = { ...input, prompt: 'Promote socket replacement enquiries in Hartlepool' };
  assert.throws(() => validateMarketingGrounding({
    ...output,
    main_copy: 'Request a socket replacement in Hartlepool and confirm the time yourself.',
    short_alternative: 'Book instantly.',
    call_to_action: 'Confirm your appointment.'
  }, facts, request), /booking could be confirmed without the business/i);
});

test('marketing grounding rejects invented percentages and promotions', () => {
  const facts = { business_name: 'Hartlepool Test Electrical', services: 'Socket replacement', service_areas: 'Hartlepool' };
  const request = { ...input, prompt: 'Promote socket replacement enquiries in Hartlepool' };
  assert.throws(() => validateMarketingGrounding({
    ...output,
    main_copy: 'Get 80% off socket replacement this week.',
    short_alternative: 'Special offer: save 80%.',
    call_to_action: 'Request a quote.'
  }, facts, request), /promotion or percentage/i);

  assert.doesNotThrow(() => validateMarketingGrounding({
    ...output,
    main_copy: 'Get 20% off socket replacement this week.',
    short_alternative: '20% off socket replacement.',
    call_to_action: 'Request a quote.'
  }, facts, { ...request, prompt: 'Create a 20% off socket replacement post for this week' }));
});

test('marketing prompt requires business confirmation for bookings', () => {
  assert.match(MARKETING_SYSTEM_PROMPT, /only creates booking requests/i);
  assert.match(MARKETING_SYSTEM_PROMPT, /business confirms availability and the final time/i);
  assert.match(MARKETING_SYSTEM_PROMPT, /confirm the time yourself/i);
});

test(
  'rapid duplicates and quota failures return 429 before provider call',
  async () => {
    const calls =
      setup({
        reservation: {
          allowed:
            false,

          reason:
            'rate_limit'
        }
      });

    const result =
      await call(
        marketingHandler
      );

    assert.equal(
      result.statusCode,
      429
    );

    assert.equal(
      result.headers[
        'Retry-After'
      ],
      '60'
    );

    assert.ok(
      calls.every(
        call =>
          !call.url.includes(
            'openrouter'
          )
      )
    );
  }
);

test(
  'entitlement revoked at reservation is denied',
  async () => {
    const calls =
      setup({
        reservation: {
          allowed:
            false,

          reason:
            'entitlement'
        }
      });

    assert.equal(
      (
        await call(
          marketingHandler
        )
      ).statusCode,
      403
    );

    assert.ok(
      calls.every(
        call =>
          !call.url.includes(
            'openrouter'
          )
      )
    );
  }
);

test('Marketing rotates to another free model when a provider route returns 400', async () => {
  const calls = setup();
  const baseFetch = globalThis.fetch;
  let providerAttempts = 0;

  globalThis.fetch = async (url, options = {}) => {
    if (url.startsWith('https://openrouter.ai')) {
      providerAttempts++;
      if (providerAttempts === 1) {
        await baseFetch(url, options);
        return response({ error: { message: 'Provider returned error' } }, false, 400);
      }
    }
    return baseFetch(url, options);
  };

  const result = await call(marketingHandler);
  assert.equal(result.statusCode, 200);

  const models = calls
    .filter(call => call.url.startsWith('https://openrouter.ai'))
    .map(call => JSON.parse(call.options.body).model);

  assert.deepEqual(models, [
    'liquid/lfm-2.5-2.6b:free',
    'nvidia/nemotron-3-super-120b-a12b:free'
  ]);
});

test('Marketing retries rotate across independent free models', async () => {
  const calls = setup();
  const baseFetch = globalThis.fetch;
  let providerAttempts = 0;

  globalThis.fetch = async (url, options = {}) => {
    if (url.startsWith('https://openrouter.ai')) {
      providerAttempts++;
      if (providerAttempts < 3) {
        await baseFetch(url, options);
        return response({ error: { message: 'temporary provider failure' } }, false, 503);
      }
    }
    return baseFetch(url, options);
  };

  const result = await call(marketingHandler);
  assert.equal(result.statusCode, 200);

  const models = calls
    .filter(call => call.url.startsWith('https://openrouter.ai'))
    .map(call => JSON.parse(call.options.body).model);

  assert.deepEqual(models, [
    'liquid/lfm-2.5-2.6b:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'dots-studio/dots-3-note-preview:free'
  ]);
});

test('Marketing provider request is compact enough to avoid truncated draft JSON', async () => {
  const calls = setup();
  const result = await call(marketingHandler);
  assert.equal(result.statusCode, 200);
  const providerCall = calls.find(call => call.url.startsWith('https://openrouter.ai'));
  const body = JSON.parse(providerCall.options.body);
  assert.equal(body.max_tokens, 1800);
  assert.equal(body.response_format.json_schema.schema.properties.main_copy.maxLength, 900);
  assert.equal(body.response_format.json_schema.schema.properties.short_alternative.maxLength, 260);
  assert.equal(body.response_format.json_schema.schema.properties.call_to_action.maxLength, 160);
  assert.equal(body.response_format.json_schema.schema.properties.hashtags.maxItems, 6);
  assert.match(body.messages[0].content, /exact service names/i);
  assert.match(body.messages[0].content, /no more than about 700 characters/i);
});

test(
  'explicit one-generation facts stay separate and never update knowledge',
  async () => {
    const calls =
      setup();

    assert.equal(
      (
        await call(
          marketingHandler,
          {
            body: {
              ...input,

              prompt:
                'Create a 20% discount post'
            }
          }
        )
      ).statusCode,
      200
    );

    const context =
      JSON.parse(
        JSON.parse(
          calls.find(
            call =>
              call.url.includes(
                'openrouter'
              )
          ).options.body
        ).messages[1].content
      );

    assert.match(
      context[
        'OWNER REQUEST'
      ].prompt,
      /20%/
    );

    assert.doesNotMatch(
      JSON.stringify(
        context[
          'TRUSTED BUSINESS FACTS'
        ]
      ),
      /20%/
    );

    assert.ok(
      calls
        .filter(
          call =>
            /business_settings|business_configurations/.test(
              call.url
            )
        )
        .every(
          call =>
            !call.options
              .method
        )
    );

    assert.match(
      MARKETING_SYSTEM_PROMPT,
      /Never invent/
    );

    assert.match(
      MARKETING_SYSTEM_PROMPT,
      /not permanent/
    );
  }
);

for (
  const bad
  of [
    'not json',

    {
      ...output,
      main_copy:
        null
    },

    {
      ...output,
      secret:
        'bad'
    },

    {
      ...output,
      hashtags:
        Array(13).fill(
          '#bad'
        )
    }
  ]
) {
  test(
    `malformed model output handled safely: ${
      JSON.stringify(
        bad
      ).slice(
        0,
        35
      )
    }`,
    async () => {
      const calls =
        setup({
          model:
            bad
        });

      const result =
        await call(
          marketingHandler
        );

      assert.equal(
        result.statusCode,
        502
      );

      assert.equal(
        result.body.output,
        undefined
      );

      const saved =
        calls.filter(
          call =>
            call.url.includes(
              'marketing_generations'
            )
        );

      assert.equal(
        JSON.parse(
          saved[0]
            .options
            .body
        ).status,
        'failed'
      );
    }
  );
}

test(
  'transient invalid provider output is retried once and then saved',
  async () => {
    const calls = setup();
    const base = globalThis.fetch;
    let providerAttempts = 0;

    globalThis.fetch = async (url, options = {}) => {
      if (url.startsWith('https://openrouter.ai')) {
        providerAttempts += 1;

        if (providerAttempts === 1) {
          await base(url, options);

          return response({
            id: 'response-invalid',
            model: 'openrouter/test-free',
            choices: [
              {
                finish_reason: 'stop',
                message: {
                  content: 'not json'
                }
              }
            ]
          });
        }
      }

      return base(url, options);
    };

    const result = await call(marketingHandler);

    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.body.output, output);
    assert.equal(providerAttempts, 2);
    assert.equal(
      calls.filter(call =>
        call.url.startsWith('https://openrouter.ai')
      ).length,
      2
    );

    const completed = calls
      .filter(call =>
        call.url.includes('marketing_generations')
      )
      .map(call => {
        try {
          return JSON.parse(call.options.body || '{}');
        } catch {
          return {};
        }
      })
      .find(body => body.status === 'completed');

    assert.ok(completed);
  }
);

test(
  'near-duplicate marketing copy is detected without blocking a genuinely different caption',
  () => {
    const previous = 'We are testing Business AI with local businesses and would love honest feedback on the AI receptionist and marketing tools during the pilot.';
    const repeated = 'We are testing Business AI with local businesses and would love honest feedback on our AI receptionist and marketing tools during this pilot.';
    const different = 'Need help keeping up with customer enquiries? Business AI can capture new leads and organise follow-ups so your team can stay focused on the work.';

    assert.ok(marketingCopySimilarity(previous, repeated) >= 0.72);
    assert.equal(isNearDuplicateMarketingCopy({ main_copy: repeated }, [{ main_copy: previous }]), true);
    assert.equal(isNearDuplicateMarketingCopy({ main_copy: different }, [{ main_copy: previous }]), false);
  }
);

test(
  'output bounds reject excessive generated text',
  () =>
    assert.throws(
      () =>
        validateMarketingOutput({
          ...output,

          main_copy:
            'x'.repeat(
              5001
            )
        })
    )
);

test(
  'provider failure returns safe error and retains failed reservation',
  async () => {
    const calls =
      setup();

    const base =
      globalThis.fetch;

    globalThis.fetch =
      async (
        url,
        options
      ) =>
        url.includes(
          'openrouter'
        )
          ? response(
              {
                error: {
                  type:
                    'provider_error',

                  code:
                    'test_error',

                  message:
                    'must not leak'
                }
              },
              false,
              500
            )
          : base(
              url,
              options
            );

    const result =
      await call(
        marketingHandler
      );

    assert.equal(
      result.statusCode,
      502
    );

    assert.doesNotMatch(
      JSON.stringify(
        result.body
      ),
      /must not leak/
    );

    assert.ok(
      calls.some(
        call =>
          call.url.includes(
            'marketing_generations'
          )
      )
    );
  }
);
