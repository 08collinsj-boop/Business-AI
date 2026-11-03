import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const owner = readFileSync(new URL('../assets/colzo-native.js', import.meta.url), 'utf8');

function nativeFunction(start, end, globals) {
  const first = owner.indexOf(start);
  const last = owner.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, 'Expected actual native owner view source');
  const name = start.match(/function (\w+)\(/)?.[1];
  assert.ok(name);
  return vm.runInNewContext(owner.slice(first, last) + '\n' + name + '()', globals);
}

test('Home prioritises follow-ups and calls every booking a recorded booking, not a confirmed appointment', () => {
  const result = nativeFunction('function home(){', 'function figmaStat(', {
    state: { recordsReady: true },
    records: () => ({ enquiries: [], bookings: [{ id: 1, status: 'requested' }], actions: [{ status: 'pending' }] }),
    settings: { business_name: 'Example fictional shop' },
    greeting: () => 'Good morning',
    safe: String,
    figmaStat: (label, number, description) => '<div>' + label + ':' + number + ' ' + description + '</div>',
    figmaTrend: () => '',
    empty: message => '<div>' + message + '</div>'
  });
  assert.match(result, /Bookings:1 All recorded bookings/);
  assert.doesNotMatch(result, /Existing appointments/);
  assert.match(result, /data-cn-screen="actions"[^>]*>[\s\S]*?Follow-ups/);
  assert.match(result, /data-cn-create-lead/);
  assert.match(result, /data-cn-screen="bookings"/);
});

test('Bookings explain requests versus confirmations in the rendered native view', () => {
  const result = nativeFunction('function bookingScreen(){', 'function bookingMonth(){', {
    state: { workFilter: { bookings: 'Active' }, workFeedback: '', workModal: null },
    records: () => ({ bookings: [{ id: 1, status: 'requested', starts_at: null }] }),
    workItems: () => [],
    workHeader: () => '<h1>Bookings</h1>',
    bookingMonth: () => '',
    workCard: () => '',
    empty: () => '',
    safe: String
  });
  assert.match(result, /requested/i);
  assert.match(result, /not confirmed/i);
  assert.match(result, /separat(e|ely)/i);
});

test('Follow-ups explain that recording an action never sends a message', () => {
  const result = nativeFunction('function actionsScreen(){', 'const validWorkId=', {
    state: { workFilter: { actions: 'Open' }, workFeedback: '', workModal: null },
    records: () => ({ actions: [{ id: 1, status: 'pending', priority: 'normal' }] }),
    workItems: () => [],
    workCount: () => 1,
    workHeader: () => '<h1>Actions</h1>',
    workCard: () => '',
    empty: () => '',
    safe: String
  });
  assert.match(result, /follow-up/i);
  assert.match(result, /does not send.*message/i);
});

test('React enquiry directory gives useful, filter-specific next steps without suggesting automatic booking confirmation', async () => {
  const bundle = await build({
    entryPoints: ['src/colzo/entry.jsx'],
    bundle: true, write: false, format: 'iife', platform: 'browser',
    define: { 'process.env.NODE_ENV': '"production"' }
  });
  const dom = new JSDOM('<!doctype html><div id="view"></div>', {
    runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://fixture.invalid/'
  });
  try {
    dom.window.eval(bundle.outputFiles[0].text);
    const view = dom.window.document.querySelector('#view');
    const model = {
      screen: 'enquiries', recordsReady: true, search: '', filter: 'All',
      enquiries: [{ id: '1', name: 'Fictional Contact', status: 'New', job_type: 'Repairs' }],
      onSearch: () => {}, onResetEnquiry: () => {}
    };
    dom.window.ColzoReact.renderScreen(view, model);
    assert.match(view.querySelector('[data-cn-enquiry-guide]')?.textContent || '', /review/i);
    assert.match(view.querySelector('[data-cn-enquiry-guide]')?.textContent || '', /booking.*confirm/i);
    model.filter = 'In Progress';
    dom.window.ColzoReact.renderScreen(view, model);
    assert.match(view.querySelector('[data-cn-enquiry-guide]')?.textContent || '', /follow-up/i);
  } finally { dom.window.close(); }
});
