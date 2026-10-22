import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync('site/pilot/index.html', 'utf8');
test('pilot page identifies its verified Facebook destination as Colzo', () => {
  assert.match(html, /href="https:\/\/www\.facebook\.com\/1369934002862359"[^>]*>Or message Colzo on Facebook/);
  assert.doesNotMatch(html, /Or message Business\.AI on Facebook/i);
});
