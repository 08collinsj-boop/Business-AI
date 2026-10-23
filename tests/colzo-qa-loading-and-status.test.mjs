import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const native = await readFile(new URL('../assets/colzo-native.js', import.meta.url), 'utf8');
const react = await readFile(new URL('../src/colzo/primitives.jsx', import.meta.url), 'utf8');
const enquiries = await readFile(new URL('../src/colzo/Enquiries.jsx', import.meta.url), 'utf8');

test('QA F09: owner status badges match In Progress/Won filter vocabulary', () => {
  const start = native.indexOf(' const status=(v)=>');
  const end = native.indexOf(' const greetingLine', start);
  assert.ok(start >= 0 && end > start, 'find real native status badge function');
  const code = native.slice(start,end);
  const pill = runInNewContext(code+'; status("Contacted")', {
    leadStage: () => 'In Progress', safe: value => String(value)
  });
  assert.match(pill, />In Progress<\/span>/);
  assert.doesNotMatch(pill, />Contacted<\/span>/);
  assert.match(react, />{group}<\/span>/);
  assert.match(native, /v==='Contacted'\?'In Progress'/);
});

test('QA F06: initial dashboard does not claim zero records before first successful load', () => {
  const start = native.indexOf(' function home(){');
  const end = native.indexOf(' function figmaStat(', start);
  assert.ok(start >= 0 && end > start, 'find real dashboard render');
  const result = runInNewContext(native.slice(start,end)+'; home()', {
    state: { recordsReady: false }, records:()=>({enquiries:[],bookings:[],actions:[]}),
    greeting:()=> 'Good evening', figmaStat:(a,b)=>'<strong>'+b+'</strong>',
    figmaTrend:()=>'', leadRow:()=>'', empty:()=>'', safe:v=>String(v)
  });
  assert.match(result, /Loading business overview/);
  assert.doesNotMatch(result, /All recorded|No enquiries recorded yet/);
  assert.match(native, /dashboardLoaded:\(\)=>\{dashboardFailure=null;state.recordsReady=true/);
});

test('QA F06: enquiry directory displays loading rather than an empty list before data arrives', () => {
  assert.match(enquiries, /LoadingState/);
  assert.match(enquiries, /if\(!model.recordsReady\)return <LoadingState/);
});
