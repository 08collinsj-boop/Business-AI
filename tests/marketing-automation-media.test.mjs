import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const mediaModule = await import(new URL('../lib/marketing-automation-media.js?test=' + Math.random(), import.meta.url));
const imageModule = await import(new URL('../lib/marketing-image.js?automation-media=' + Math.random(), import.meta.url));

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const marketingClient = await readFile(new URL('../assets/marketing.js', import.meta.url), 'utf8');
const automationSource = await readFile(new URL('../lib/marketing-automation.js', import.meta.url), 'utf8');
const mediaSource = await readFile(new URL('../lib/marketing-automation-media.js', import.meta.url), 'utf8');

test('automation media accepts only publishable post photos or non-publishable inspiration photos', () => {
  assert.equal(mediaModule.validateAutomationMediaRole('post'), 'post');
  assert.equal(mediaModule.validateAutomationMediaRole('inspiration'), 'inspiration');
  assert.throws(() => mediaModule.validateAutomationMediaRole('publish_anything'), /valid automation photo type/i);
});

test('automation rotates post photos and keeps inspiration separate', () => {
  const rows = [
    { id: 'post-new', role: 'post', created_at: '2026-10-02T10:00:00Z', last_used_at: '2026-10-02T12:00:00Z', visual_context: 'A burger on a dark plate.' },
    { id: 'post-unused', role: 'post', created_at: '2026-10-02T11:00:00Z', last_used_at: null, visual_context: 'A burger meal.' },
    { id: 'inspiration-1', role: 'inspiration', created_at: '2026-10-02T13:00:00Z', visual_context: 'Dark background, tight crop, warm highlights.' },
    { id: 'inspiration-2', role: 'inspiration', created_at: '2026-10-02T09:00:00Z', visual_context: 'Clean overhead food photography.' }
  ];
  const selected = mediaModule.selectAutomationMediaContext(rows);
  assert.equal(selected.post.id, 'post-unused');
  assert.match(selected.inspiration_context, /Dark background, tight crop, warm highlights/);
  assert.match(selected.inspiration_context, /Clean overhead food photography/);
  assert.doesNotMatch(selected.inspiration_context, /A burger meal/);
});

test('inspiration photos are explicitly style-only in AI image prompts', () => {
  const prompt = imageModule.buildMarketingImagePrompt(
    { output: { main_copy: 'Burgers available from The Smashed Burger Co.' } },
    { business_name: 'The Smashed Burger Co.', business_type: 'Food business', services: 'Burgers', address: 'Hartlepool' },
    { inspirationContext: 'Moody close-up photography with warm side lighting.' }
  );
  assert.match(prompt, /VISUAL INSPIRATION \(STYLE ONLY\)/i);
  assert.match(prompt, /mood, composition, lighting, framing and presentation/i);
  assert.match(prompt, /Never treat anything in these references as a business fact/i);
  assert.match(prompt, /Moody close-up photography/);
});

test('only post-role automation media can be copied onto a generated post', () => {
  assert.match(mediaSource, /role=eq\.post/);
  assert.match(automationSource, /generation\.media_context\?\.post\?\.id/);
  assert.match(automationSource, /attachAutomationPostPhoto/);
  assert.match(automationSource, /inspirationContext: generation\.media_context\?\.inspiration_context/);
  assert.doesNotMatch(mediaSource, /role=eq\.inspiration[\s\S]{0,800}marketing_images\?on_conflict/);
});

test('Marketing automation Advanced settings clearly separates publishable and inspiration media', () => {
  assert.match(index, /Advanced settings/);
  assert.match(index, /Post photos/);
  assert.match(index, /Only add images you are happy to publish publicly/);
  assert.match(index, /Inspiration photos/);
  assert.match(index, /These photos are never published directly/);
  assert.match(index, /marketingAutomationMediaInput/);
  assert.match(marketingClient, /media_create_upload/);
  assert.match(marketingClient, /media_finalize_upload/);
  assert.match(marketingClient, /media_delete/);
  assert.match(marketingClient, /Post photos can be published; inspiration photos never are/);
});
