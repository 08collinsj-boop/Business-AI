import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, access } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = async (path) => readFile(new URL(path, root), 'utf8');
const routeKeys = (text) => [...text.matchAll(/"?([\w-]+)"?:\s*\w+Handler/g)].map(match => match[1]);

test('every dispatcher operation has a vercel rewrite', async () => {
  const operations = await read('api/operations.js');
  const vercel = await read('vercel.json');
  const routes = routeKeys(operations);
  assert.ok(routes.length > 5, 'dispatcher routes detected');
  const destinations = [...vercel.matchAll(/operation=([\w-]+)/g)].map(match => match[1]);
  for (const route of routes) {
    assert.ok(destinations.includes(route), `missing vercel rewrite for operation: ${route}`);
  }
});

test('every frontend-called api path has a vercel rewrite or a physical function', async () => {
  const vercel = await read('vercel.json');
  const sources = [...vercel.matchAll(/"source":\s*"(\/api\/[\w-]+)"/g)].map(match => match[1]);
  const frontend = await Promise.all([
    read('index.html'),
    read('assets/marketing.js')
  ]);
  const called = new Set();
  for (const text of frontend) {
    for (const match of text.matchAll(/api\('(\/api\/[\w-]+)'/g)) called.add(match[1].split('?')[0]);
  }
  assert.ok(called.size > 5, 'frontend api calls detected');
  for (const path of called) {
    const physical = path.replace('/api/', 'api/') + '.js';
    let exists = sources.includes(path);
    if (!exists) {
      try { await access(new URL(physical, root)); exists = true; } catch { exists = false; }
    }
    assert.ok(exists, `missing vercel rewrite and physical function for frontend path: ${path}`);
  }
});

test('no duplicate dispatcher or rewrite entries', async () => {
  const operations = await read('api/operations.js');
  const routes = routeKeys(operations);
  assert.equal(new Set(routes).size, routes.length);
  const vercel = await read('vercel.json');
  const sources = [...vercel.matchAll(/"source":\s*"(\/api\/[\w-]+)"/g)].map(match => match[1]);
  assert.equal(new Set(sources).size, sources.length);
});

test('all expected pilot routes remain registered', async () => {
  const operations = await read('api/operations.js');
  for (const route of ['marketing', 'marketing-schedules', 'marketing-publications', 'knowledge', 'feedback', 'billing', 'addons']) {
    assert.ok(operations.includes(`"${route}"`) || operations.includes(`${route}:`), route);
  }
});
