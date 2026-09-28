import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('Marketing photo uploads validate supported owner image metadata', async () => {
  const image = await import(new URL('../lib/marketing-image.js?photo-validation=' + Math.random(), import.meta.url));
  assert.deepEqual(
    image.validateMarketingPhotoUpload({ fileName: 'finished-job.jpg', mimeType: 'image/jpeg', sizeBytes: 2048 }),
    { fileName: 'finished-job.jpg', mimeType: 'image/jpeg', sizeBytes: 2048, extension: 'jpg' }
  );
  assert.equal(image.validateMarketingPhotoUpload({ fileName: 'menu.webp', mimeType: 'image/webp', sizeBytes: 4096 }).extension, 'webp');
  assert.throws(() => image.validateMarketingPhotoUpload({ fileName: 'photo.png', mimeType: 'image/jpeg', sizeBytes: 100 }), /does not match/i);
  assert.throws(() => image.validateMarketingPhotoUpload({ fileName: 'photo.gif', mimeType: 'image/gif', sizeBytes: 100 }), /JPG, PNG or WebP/i);
  assert.throws(() => image.validateMarketingPhotoUpload({ fileName: 'photo.jpg', mimeType: 'image/jpeg', sizeBytes: 11 * 1024 * 1024 }), /10 MB/i);
});

test('Marketing UI offers owner photo upload, replacement, removal and private signed upload flow', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const script = await readFile(new URL('../assets/marketing.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../assets/marketing.css', import.meta.url), 'utf8');
  for (const id of ['marketingUploadPhoto','marketingPhotoInput','marketingRemoveImage','marketingImagePreview']) {
    assert.ok(html.includes(id), 'missing ' + id);
  }
  assert.match(html, /Upload your photo/);
  assert.match(html, /Generate AI image/);
  assert.match(script, /uploadToSignedUrl/);
  assert.match(script, /action:'create_upload'/);
  assert.match(script, /action:'finalize_upload'/);
  assert.match(script, /action:'remove'/);
  assert.match(script, /Business AI used the visible photo context to refresh the caption/);
  assert.match(css, /marketing-image-actions/);
});

test('Marketing photo context is explicitly non-authoritative and publish path accepts completed uploaded media', async () => {
  const marketing = await readFile(new URL('../lib/marketing.js', import.meta.url), 'utf8');
  const image = await readFile(new URL('../lib/marketing-image.js', import.meta.url), 'utf8');
  const publication = await readFile(new URL('../lib/marketing-publication.js', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../supabase/migrations/20260928231500_allow_owner_uploaded_marketing_photos.sql', import.meta.url), 'utf8');
  assert.match(marketing, /PHOTO CONTEXT/);
  assert.match(marketing, /never treat it as proof/i);
  assert.match(image, /provider: 'upload'/);
  assert.match(image, /reserve_marketing_generation/);
  assert.match(publication, /getMarketingImageForPublish/);
  assert.doesNotMatch(publication, /provider=eq\.(?:openai|cloudflare)/);
  assert.match(migration, /'upload'/);
});
