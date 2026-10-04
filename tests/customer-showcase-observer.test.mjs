import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('customer showcase observer settles without rewriting customer copy',async()=>{
  const source=await readFile(new URL('../assets/final-showcase.js',import.meta.url),'utf8');
  let mutations=0;let observer;
  const textNode=initial=>{let text=initial;return {get textContent(){return text;},set textContent(value){text=value;mutations++;}};};
  const title=textNode('Welcome');const copy=textNode('Old copy');
  const tabs=['home','find','enquiries','account'].map(name=>({dataset:{customerTab:name},label:textNode(name),querySelector(){return this.label;}}));
  const hero={querySelector:selector=>selector==='span'?title:copy};
  const document={body:{classList:{add(){}}},querySelector:selector=>selector==='.customer-portal-hero'?hero:null,
    querySelectorAll:selector=>selector==='[data-customer-tab]'?tabs:[]};
  vm.runInNewContext(source,{document,location:{pathname:'/customer',href:'https://pilot.example/customer'},URL,
    MutationObserver:class {constructor(callback){observer=callback;}observe(){}}});
  assert.equal(title.textContent,'Welcome');assert.ok(mutations>0);
  mutations=0;observer();assert.equal(mutations,0,'observer must not create new childList mutations when text is unchanged');
  title.textContent='Refreshed';mutations=0;observer();assert.equal(mutations,0,'customer copy must remain owned by the customer portal runtime');
  assert.equal(title.textContent,'Refreshed');
});
