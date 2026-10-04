import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const [html, customerJs, showcaseCss, showcaseJs, premiumUi] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../assets/customer-portal.js', import.meta.url), 'utf8'),
  readFile(new URL('../assets/final-showcase.css', import.meta.url), 'utf8'),
  readFile(new URL('../assets/final-showcase.js', import.meta.url), 'utf8'),
  readFile(new URL('../assets/premium-ui.js', import.meta.url), 'utf8')
]);

test('customer redesign keeps the welcome hero on Overview and gives every signed-in tab its own surface', () => {
  assert.match(html, /data-customer-pane="home"[\s\S]*customer-home-hero[\s\S]*customerPortalGreeting/);
  assert.match(html, /data-customer-pane="find"[\s\S]*customer-search-box-premium/);
  assert.match(html, /data-customer-pane="enquiries"[\s\S]*customer-privacy-note/);
  assert.match(html, /data-customer-pane="account"[\s\S]*customerAccountInitial/);
});

test('signed-in business search is search-first and renders consistent business result cards', () => {
  assert.match(customerJs, /if\(normalized.length<2\)\{resetCustomerBusinessSearch\(\);return;\}/);
  assert.match(customerJs, /customer-search-result-mark/);
  assert.match(customerJs, /data-customer-account-label/);
});

test('customer showcase no longer replaces the Business AI brand with an enquiry business', () => {
  assert.doesNotMatch(showcaseJs, /brand\.textContent=title/);
});

test('guest and signed-in customer surfaces share the redesigned mobile visual system', () => {
  assert.match(showcaseCss, /Customer experience redesign/);
  assert.match(showcaseCss, /\.customer-home-actions\{display:grid/);
  assert.match(showcaseCss, /\.public-directory-reference-hero\{grid-template-columns:minmax\(0,1fr\) 112px!important/);
  assert.match(premiumUi, /final-showcase\.css\?v=20261005-settings-profile-width-1/);
  assert.match(premiumUi, /final-showcase\.js\?v=20261004-customer-redesign-1/);
});
