import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { JSDOM } from 'jsdom';
const origin = 'https://getbusiness-ai.com';
const read = path => readFileSync(path, 'utf8');
function pages(dir = 'site') {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = `${dir}/${entry.name}`;
    return entry.isDirectory() ? (entry.name === 'public' ? [] : pages(path)) : entry.name.endsWith('.html') ? [path] : [];
  });
}
test('sitemap contains every canonical public page exactly once', () => {
  const xml = new JSDOM(read('site/sitemap.xml'), { contentType: 'text/xml' }).window.document;
  const urls = [...xml.querySelectorAll('loc')].map(node => node.textContent);
  assert.equal(new Set(urls).size, urls.length);
  for (const path of pages()) {
    const doc = new JSDOM(read(path)).window.document;
    const canonical = doc.querySelector('link[rel="canonical"]')?.href;
    assert.ok(canonical?.startsWith(origin + '/'), path);
    assert.ok(urls.includes(canonical), `Missing sitemap entry: ${canonical}`);
  }
});
test('homepage describes the product in its title and has matching website structured data', () => {
  const doc = new JSDOM(read('site/index.html')).window.document;
  assert.match(doc.title, /enquir|receptionist/i);
  const data = [...doc.querySelectorAll('script[type="application/ld+json"]')].map(node => JSON.parse(node.textContent));
  assert.ok(data.some(item => item['@type'] === 'WebSite' && item.name === 'Colzo' && item.url === origin + '/'));
});
test('public page titles are unique and internal links resolve to real pages and anchors', () => {
  const docs = new Map(pages().map(path => [path, new JSDOM(read(path), { url: origin + '/' + path.replace(/^site\//, '').replace(/index\.html$/, '') }).window.document]));
  const titles = [...docs.values()].map(doc => doc.title);
  assert.equal(new Set(titles).size, titles.length);
  for (const [path, doc] of docs) for (const a of doc.querySelectorAll('a[href]')) {
    const url = new URL(a.href);
    if (url.origin !== origin) continue;
    const target = url.pathname.endsWith('/') ? `${url.pathname}index.html` : url.pathname;
    const file = (target.startsWith('/legal/') ? '' : 'site') + decodeURIComponent(target);
    assert.doesNotThrow(() => read(file.replace(/^\//, '')), `${path}: ${a.getAttribute('href')}`);
    if (url.hash && docs.has(file)) assert.ok(docs.get(file).getElementById(decodeURIComponent(url.hash.slice(1))), `${path}: ${url.hash}`);
  }
});
