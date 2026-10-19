import assert from 'node:assert/strict';
import test from 'node:test';
import { isCurrentBusinessDpa } from '../lib/business-dpa-validation.js';
const accepted = {id:37,business_id:'business-a',document_key:'dpa',document_version:'1.1'};
test('correct DPA record can enable current version only for its business',()=>{
 assert.equal(isCurrentBusinessDpa([accepted],'business-a','1.1'),true);
 assert.equal(isCurrentBusinessDpa([accepted],'business-b','1.1'),false);
 assert.equal(isCurrentBusinessDpa([accepted],'business-a','1.2'),false);
});
test('DPA acceptance never trusts missing, duplicate, foreign or wrong type rows',()=>{
 for(const rows of [[],null,{},[null],[{id:37}],[{...accepted,document_version:'1.0'}],
 [{...accepted,document_key:'terms'}],[{...accepted,business_id:'business-b'}],
 [accepted,{...accepted,id:38}],['any'],[{...accepted,id:null}],
 [{...accepted,id:false}],[{...accepted,id:0}],[{...accepted,id:"unverified"}]]){
  assert.equal(isCurrentBusinessDpa(rows,'business-a','1.1'),false);
 }
});

test('a positive PostgREST bigint ID encoded as a string is accepted',()=>{
 assert.equal(isCurrentBusinessDpa([{...accepted,id:"37"}],"business-a","1.1"),true);
});
