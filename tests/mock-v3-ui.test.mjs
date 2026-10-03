import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const css=await readFile(new URL('../assets/mock-v3.css',import.meta.url),'utf8');
const js=await readFile(new URL('../assets/mock-v3.js',import.meta.url),'utf8');

test('approved mock layer loads after the existing premium UI',()=>{
  assert.match(html,/assets\/premium-v2\.css[\s\S]{0,200}assets\/mock-v3\.css/);
  assert.match(html,/assets\/premium-ui\.js[\s\S]{0,200}assets\/mock-v3\.js/);
});

test('mock layer keeps five real bottom navigation destinations',()=>{
  assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  for(const view of ['dashboard','leads','actions','bookings','settings']) assert.ok(html.includes(`data-view="${view}"`));
});

test('new mock controls remain functional and data-backed',()=>{
  assert.match(js,/api\('\/api\/manual-leads'/);
  assert.match(js,/showView\('billing'\)/);
  assert.match(js,/showView\('team'\)/);
  assert.match(js,/stateList\('leads'\)/);
  assert.match(js,/stateList\('businessActions'\)/);
  assert.match(js,/stateValue\('teamState'/);
});

test('new lead dialog has an accessible modal name and keyboard close path',()=>{
  assert.match(js,/role="dialog" aria-modal="true" aria-labelledby="mockLeadTitle"/);
  assert.match(js,/if\(e\.key==='Escape'/);
});
