import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LEGAL_VERSIONS } from '../lib/legal.js';

const pages = {
  terms: 'terms.html',
  privacy: 'privacy.html',
  acceptable_use: 'acceptable-use.html',
  dpa: 'dpa.html',
  storage: 'storage.html',
  subprocessors: 'subprocessors.html'
};
for (const [key, filename] of Object.entries(pages)) {
  test('Legal API version equals published '+key+' notice version', async () => {
    const html = await readFile(new URL('../legal/'+filename, import.meta.url), 'utf8');
    const match = html.match(/<p class="meta">Version\s+([0-9.]+)/i);
    assert.ok(match,'Missing public version on '+filename);
    assert.equal(LEGAL_VERSIONS[key],match[1],
      'Legal API reports a different version from '+filename);
  });
}
