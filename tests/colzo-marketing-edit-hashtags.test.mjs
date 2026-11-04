import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const source=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const start=source.indexOf(' async function saveMarketingEdit(form){');
const end=source.indexOf('\n async function deleteMarketingDraft(',start);
assert.ok(start>=0&&end>start);

// Exercise the real editor-to-API boundary with actual HTML form values.
// The network is replaced so this cannot write a live draft or publish a post.
async function save(hashtags){
 const dom=new JSDOM('<form><textarea name="main_copy">Fictional draft only.</textarea><textarea name="hashtags"></textarea></form><p id="cnMarketingEditFeedback"></p>');
 try{
  const form=dom.window.document.querySelector('form');
  form.elements.hashtags.value=hashtags;
  const state={marketingBusy:false,marketingEditing:{id:'fixture-draft',output:{}},screen:'home'};
  const requests=[];
  const api=async(path,options)=>{requests.push({path,options});return {};};
  const edit=new Function('state','FormData','content','api','loadMarketingDrafts','render',source.slice(start,end)+';return saveMarketingEdit;')(
   state,dom.window.FormData,dom.window.document,api,async()=>{},()=>{}
  );
  await edit(form);
  assert.equal(requests.length,1);
  assert.equal(requests[0].path,'/api/marketing');
  assert.equal(requests[0].options.method,'PATCH');
  const body=JSON.parse(requests[0].options.body);
  assert.equal(body.action,'edit');
  assert.equal(body.generation_id,'fixture-draft');
  return body.output;
 }finally{dom.window.close();}
}

test('editing a saved draft keeps space-separated hashtags as distinct entries',async()=>{
 assert.deepEqual((await save('#FictionalTest #ColzoQA #Edited')).hashtags,['#FictionalTest','#ColzoQA','#Edited']);
});
test('edited hashtags split on tabs and newlines, trim blanks and add missing hash prefixes',async()=>{
 assert.deepEqual((await save('  FictionalTest\t#ColzoQA\nEdited  ')).hashtags,['#FictionalTest','#ColzoQA','#Edited']);
});
test('clearing edited hashtags sends an empty list while preserving draft text',async()=>{
 const output=await save(' \n\t ');
 assert.deepEqual(output.hashtags,[]);
 assert.equal(output.main_copy,'Fictional draft only.');
});
