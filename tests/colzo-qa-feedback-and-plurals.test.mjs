import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const native = await readFile(new URL('../assets/colzo-native.js', import.meta.url), 'utf8');
const customers = await readFile(new URL('../src/colzo/Customers.jsx', import.meta.url), 'utf8');

test('QA F10: booking success notice is cleared on navigation to unrelated Actions', () => {
  const start=native.indexOf(' function navigate(screen){');
  const end=native.indexOf(' const commandItems=',start);
  assert.ok(start >= 0 && end > start);
  const state={screen:'bookings',scrollByScreen:new Map(),workFeedback:'Booking updated successfully.'};
  const root={querySelector:()=>null};
  runInNewContext(native.slice(start,end)+'; navigate("actions")',{
    state,root,dirtyFormSelector:'.dirty',closeCommand:()=>{},currentScroll:()=>0,
    restoreScroll:()=>{},render:()=>{},navPosition:()=>0,detailSourceRect:null
  });
  assert.equal(state.screen,'actions');
  assert.equal(state.workFeedback,'','booking message must not be repeated as an action notice');
});

test('QA F11: customer record count is a single accessible text value', () => {
  assert.match(customers, /filtered.length === 1 \? 'record' : 'records'/);
});
