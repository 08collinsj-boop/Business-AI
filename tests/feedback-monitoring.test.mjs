import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('feedback storage failures emit a privacy-safe operational event', async () => {
  const [handler, logger] = await Promise.all([
    readFile(new URL('../lib/feedback-handler.js', import.meta.url), 'utf8'),
    readFile(new URL('../lib/operational-log.js', import.meta.url), 'utf8')
  ]);

  assert.match(handler, /logOperationalEvent\('feedback\.storage_error'/);
  assert.match(handler, /error_name:/);
  assert.doesNotMatch(handler, /error\.message/);
  assert.match(logger, /token\|secret\|password\|authorization\|email\|phone\|address\|message\|content/i);
});
