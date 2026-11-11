import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const cssPath = new URL('../assets/colzo-desktop-command-centre.css', import.meta.url);
const css = (() => { try { return readFileSync(cssPath, 'utf8'); } catch { return ''; } })();

test('desktop command-centre stylesheet is loaded after the existing workspace styles', () => {
  const existing = html.indexOf('/assets/colzo-customers-mobile.css?');
  const command = html.indexOf('/assets/colzo-desktop-command-centre.css?');
  assert.ok(existing > 0, 'the existing stylesheet must be preserved');
  assert.ok(command > existing, 'new desktop styles must load after existing styles');
});

test('desktop briefing has a truthful accessible summary and working navigation targets', () => {
  assert.match(html, /id="colzoDesktopBriefing"[^>]*aria-label="Daily workspace briefing"/);
  assert.match(html, /id="colzoBriefingText"[^>]*aria-live="polite"/);
  assert.match(html, /class="colzo-briefing-action"[^>]*onclick="showView\('leads'\)"/);
  assert.match(html, /id="fictionalOnlyWorkspaceBanner"/);
});

test('desktop layout uses existing real widgets and does not replace mobile navigation', () => {
  assert.match(css, /@media\s*\(min-width:\s*1100px\)/);
  assert.match(css, /grid-template-areas:/);
  for (const selector of ['#dashboardView .colzo-command-hero', '#dashboardView #stats', '#dashboardView #valueDashboardCard', '#dashboardView #colzoUpcomingBookingsCard', '#dashboardView #colzoDesktopBriefing']) {
    assert.ok(css.includes(selector), 'expected existing dashboard element ' + selector);
  }
  assert.match(css, /#colzoDesktopBriefing\s*\{\s*display:\s*none/);
  assert.match(html, /class="bottom-nav"/);
});

test('briefing format reports only recorded work and never invents booked or converted revenue', () => {
  const start = html.indexOf('function colzoBriefingSummary(');
  const end = html.indexOf('\nfunction renderDashboard()', start);
  assert.ok(start >= 0 && end > start, 'pure briefing helper should be defined before dashboard renderer');
  const fn = runInNewContext(html.slice(start, end) + '\ncolzoBriefingSummary');
  assert.equal(fn({newLeads: 0, dueActions: 0, bookingRequests: 0}), 'No new enquiries, due actions or booking requests need your attention.');
  const result = fn({newLeads: 3, dueActions: 2, bookingRequests: 1});
  assert.match(result, /3 new enquiries/);
  assert.match(result, /2 actions due/);
  assert.match(result, /1 booking request/);
  assert.doesNotMatch(result, /confirmed|revenue|£/i);
  assert.doesNotMatch(fn({newLeads: -1, dueActions: 1.5, bookingRequests: NaN}), /-1|1\.5|NaN/);
});

test('desktop proportions and controls follow the approved Stitch handoff', () => {
  assert.ok(css.includes('grid-template-columns:minmax(0,1.85fr) minmax(0,1fr)!important'), 'desktop workspace must reserve more width for the attention column');
  assert.match(css, /min-height:44px!important;min-width:148px!important/,'briefing primary action must meet 44px target');
  assert.ok(css.includes('width:224px!important'), 'desktop sidebar follows the approved 224px token');
});
