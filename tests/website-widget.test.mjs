import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('website widget loader embeds the public assistant without exposing internal tenant IDs', async () => {
  const source = await read('widget.js');
  assert.match(source, /data-business/);
  assert.match(source, /searchParams\.set\('business', slug\)/);
  assert.match(source, /searchParams\.set\('embed', '1'\)/);
  assert.match(source, /attachShadow/);
  assert.match(source, /sandbox/);
  assert.match(source, /allow-scripts allow-forms allow-same-origin/);
  assert.match(source, /loading = 'lazy'/);
  assert.doesNotMatch(source, /business_id|x-business-id/i);
});

test('owner settings expose a simple copy-and-paste website widget install code', async () => {
  const html = await read('index.html');
  assert.match(html, /id="websiteWidgetCard"/);
  assert.match(html, /Website AI widget/);
  assert.match(html, /id="websiteWidgetCode"/);
  assert.match(html, /copyWebsiteWidgetCode/);
  assert.match(html, /previewWebsiteWidget/);
  assert.match(html, /websiteWidgetInstallCode/);
  assert.match(html, /new URL\('\/widget\.js',window\.location\.origin\)/);
  assert.match(html, /data-business="'\+slug\+'"/);
  assert.match(html, /never an internal business ID/i);
});

test('embedded customer mode removes the large landing UI and keeps the chat viewport compact', async () => {
  const html = await read('index.html');
  assert.match(html, /websiteWidgetEmbedFromLocation/);
  assert.match(html, /classList\.add\('public-embed'\)/);
  assert.match(html, /body\.public-enquiry\.public-embed \.public-assistant-hero/);
  assert.match(html, /body\.public-enquiry\.public-embed \.public-quick-actions-panel/);
  assert.match(html, /display:none!important/);
  assert.match(html, /body\.public-enquiry\.public-embed \.public-messages/);
});
