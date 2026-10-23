import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

// Free-pilot release scope: customer-to-business portal replies are a separate
// paid-launch project. This gate protects the free-pilot candidate from an
// accidental stacked-PR merge. It must be consciously retired for paid release.
const forbidden = [
  ['api/operations.js', /customerRepliesHandler|['"]customer-replies['"]/],
  ['vercel.json', /\/api\/customer-replies/],
  ['lib/customer-portal-handler.js', /customer_visible_replies|business_replies/],
  ['assets/customer-portal.js', /business_replies|Replies from the business/],
  ['assets/colzo-native.js', /cnCustomerReplyForm|Customer portal replies/],
];

function detectDeferredReplyFeatures(contents, migrationNames) {
  const issues = [];
  for (const [path, expression] of forbidden) {
    if (expression.test(contents.get(path) || '')) issues.push(path);
  }
  if (migrationNames.some(name => /customer_visible_replies/i.test(name))) {
    issues.push('supabase/migrations/customer_visible_replies');
  }
  if (contents.has('lib/customer-replies-handler.js')) {
    issues.push('lib/customer-replies-handler.js');
  }
  return issues;
}

test('free pilot contains no deferred customer reply API, owner composer or database migration', async () => {
  const contents = new Map();
  for (const [path] of forbidden) {
    contents.set(path, await readFile(new URL('../' + path, import.meta.url), 'utf8'));
  }
  const migrations = await readdir(new URL('../supabase/migrations/', import.meta.url));
  const handler = await import('node:fs/promises').then(fs =>
    fs.stat(new URL('../lib/customer-replies-handler.js', import.meta.url))
      .then(() => true, error => {
        if (error.code === 'ENOENT') return false;
        throw error;
      }));
  if (handler) contents.set('lib/customer-replies-handler.js', '<exists>');
  assert.deepEqual(
    detectDeferredReplyFeatures(contents, migrations),
    [],
    'Do not stack draft PR #60 on the free-pilot release; replies are deferred until paid launch'
  );
});

test('the release-scope gate catches an accidental paid-feature import or migration', () => {
  const contents = new Map([
    ['api/operations.js', "import customerRepliesHandler from '../lib/customer-replies-handler.js';"],
    ['vercel.json', '{"source":"/api/customer-replies"}'],
    ['assets/colzo-native.js', '<form id="cnCustomerReplyForm"></form>'],
    ['lib/customer-replies-handler.js', 'server-only']
  ]);
  const issues = detectDeferredReplyFeatures(contents, ['20261023103000_colzo_customer_visible_replies.sql']);
  assert.deepEqual(issues, [
    'api/operations.js', 'vercel.json', 'assets/colzo-native.js',
    'supabase/migrations/customer_visible_replies', 'lib/customer-replies-handler.js'
  ]);
});
