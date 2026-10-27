import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const controller=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const start=controller.indexOf(' function billing(){');
const end=controller.indexOf(' async function loadGrowth(',start);
assert.ok(start>=0&&end>start,'billing renderer must be present');
function render(data){
 return runInNewContext(controller.slice(start,end)+'\nbilling();',{
  state:{billingData:data,billingLoading:false,billingError:''},
  safe:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),
  empty:()=>''
 });
}
test('scoped pilot billing does not promise the Marketing feature denied by the server',()=>{
 const html=render({pilot_free_access:true,account:null,entitlements:{active:true,features:['leads','bookings']}});
 assert.match(html,/Pilot access/);
 assert.match(html,/at no charge/);
 assert.doesNotMatch(html,/AI Marketing access are included/);
 assert.match(html,/approved pilot features/i);
});
test('pilot billing does not create a checkout or subscription action',()=>{
 const html=render({pilot_free_access:true,account:null,entitlements:{active:true}});
 assert.match(html,/read-only/);
 assert.doesNotMatch(html,/<(?:button|a)[^>]*(?:checkout|subscribe)/i);
});
test('paid plan status still comes from the billing response and is escaped',()=>{
 const html=render({account:{plan:'pro',status:'active <review>',has_customer:true,has_subscription:true}});
 assert.match(html,/<h2>pro<\/h2>/);
 assert.match(html,/active &lt;review&gt;/);
 assert.doesNotMatch(html,/approved pilot features/i);
});
