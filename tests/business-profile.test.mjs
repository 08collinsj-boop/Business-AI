import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const [html, handler, publicBusiness, directory, operations, vercel, migration, customerJs, css] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../lib/business-profile-handler.js', import.meta.url), 'utf8'),
  readFile(new URL('../lib/public-business-handler.js', import.meta.url), 'utf8'),
  readFile(new URL('../lib/public-businesses-handler.js', import.meta.url), 'utf8'),
  readFile(new URL('../api/operations.js', import.meta.url), 'utf8'),
  readFile(new URL('../vercel.json', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20261004231500_add_business_public_profile_media.sql', import.meta.url), 'utf8'),
  readFile(new URL('../assets/customer-portal.js', import.meta.url), 'utf8'),
  readFile(new URL('../assets/final-showcase.css', import.meta.url), 'utf8')
]);

test('owner Settings card opens the dedicated Business Profile editor', () => {
  assert.match(html, /reference-profile-summary-button[^>]+onclick="openBusinessProfile\(\)"/);
  assert.match(html, /id="businessProfileView"/);
  assert.match(html, /id="businessProfileAvatarInput"/);
  assert.match(html, /id="businessProfileBannerInput"/);
  assert.match(html, /Preview as customer/);
  assert.match(html, /function previewBusinessProfile\(\)/);
  assert.match(html, /uploadToSignedUrl\(prepared\.path,prepared\.token,file/);
});

test('Settings Business Profile row matches the mobile Settings card geometry', () => {
  assert.match(css, /#settingsView \.reference-profile-summary\{width:100%!important;max-width:none!important;padding:14px!important/);
  assert.match(css, /#settingsView \.reference-profile-summary-button\{grid-template-columns:52px minmax\(0,1fr\) auto 18px!important;gap:12px!important;align-items:center!important/);
  assert.match(css, /\.reference-profile-mark\{width:52px!important;height:52px!important;border-radius:14px!important/);
});

test('profile media uploads are tenant-scoped server-prepared and verified before publication', () => {
  assert.match(handler, /requireBusinessMember/);
  assert.match(handler, /requireBusinessAdmin/);
  assert.match(handler, /object\/upload\/sign/);
  assert.match(handler, /auth\.businessId \+ '\/' \+ slot \+ '\/'/);
  assert.match(handler, /downloadObject\(path\)/);
  assert.match(handler, /detectedMime\(bytes\) !== input\.mimeType/);
  assert.match(handler, /PROFILE_INVALID_PATH/);
  assert.doesNotMatch(html, /SUPABASE_SERVICE_ROLE_KEY/);
});

test('profile media migration uses a dedicated public-read bucket with constrained image types', () => {
  assert.match(migration, /add column if not exists profile_image_path text not null default ''/);
  assert.match(migration, /add column if not exists profile_banner_path text not null default ''/);
  assert.match(migration, /'business-profile-media'/);
  assert.match(migration, /true,/);
  assert.match(migration, /8388608/);
  assert.match(migration, /image\/jpeg/);
  assert.match(migration, /image\/png/);
  assert.match(migration, /image\/webp/);
});

test('customer profile shows banner, rounded profile image and public business details without street address', () => {
  assert.match(html, /id="publicBusinessProfileScreen"/);
  assert.match(html, /id="publicProfileBanner"/);
  assert.match(html, /id="publicProfileAvatar"/);
  assert.match(html, /id="publicProfileHours"/);
  assert.match(html, /id="publicProfileCall"/);
  assert.match(html, /id="publicProfileMessage"/);
  assert.match(html, /id="publicProfileWebsite"/);
  assert.match(css, /\.public-profile-avatar\{[\s\S]{0,320}border-radius:30px/);
  assert.match(publicBusiness, /service_areas/);
  assert.doesNotMatch(publicBusiness, /select=[^\n]*address/);
});

test('directory and signed-in customer search route through the business profile', () => {
  assert.match(directory, /profile_image_url/);
  assert.match(directory, /profile_path: `\/customer\?business=/);
  assert.match(customerJs, /business\.profile_path\|\|business\.message_path/);
  assert.match(customerJs, /View profile/);
  assert.match(html, /business\.profile_path\|\|publicBusinessProfileUrl/);
});

test('Business Profile API stays in the consolidated operations function', () => {
  assert.match(operations, /businessProfileHandler/);
  assert.match(operations, /"business-profile": businessProfileHandler/);
  const config = JSON.parse(vercel);
  assert.ok(config.rewrites.some(route => route.source === "/api/business-profile" && route.destination === "/api/operations?operation=business-profile"));
});
