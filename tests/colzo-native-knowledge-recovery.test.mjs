import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const js=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/colzo-native.css',import.meta.url),'utf8');
const handler=readFileSync(new URL('../lib/knowledge-handler.js',import.meta.url),'utf8');

test('knowledge approval uses the actual server contract, without rejected confirmation properties',()=>{
  assert.match(js,/async function approveKnowledge\(\)/);
  assert.match(js,/JSON\.stringify\(\{action:'approve',source_id:source\.id,items\}\)/);
  assert.match(handler,/Object\.keys\(parsed\)\.some\(key => !\['action', 'source_id', 'items'\]\.includes\(key\)\)/);
  assert.doesNotMatch(js,/confirmation_version:'knowledge_accuracy_v1'/);
  assert.match(js,/window\.confirm\('Approve the selected facts/);
});

test('native review can edit item text, type and approval choice before any write',()=>{
  for(const field of ['type','title','content','include'])assert.match(js,new RegExp('data-k-field="'+field+'"'));
  assert.match(js,/id="cnKnowledgeReviewForm"/);
  assert.match(js,/type="submit"[^>]*>Confirm reviewed facts/);
  assert.match(js,/items\.length!==\(detail\.items\|\|\[\]\)\.length/);
  assert.match(js,/item\.title\.length>300\|\|item\.content\.length>3000/);
  assert.match(js,/if\(!items\.some\(item=>item\.include\)\)/);
  assert.match(js,/#cnKnowledgeReviewForm\[data-cn-dirty="true"\]/);
});

test('file preparation uses private signed upload and never automatically starts paid extraction',()=>{
  const first=js.indexOf('async function uploadNativeKnowledgeFile');
  const end=js.indexOf('async function extractNativeKnowledge',first);
  const flow=js.slice(first,end);
  assert.match(flow,/action:'create_upload'/);
  assert.match(flow,/uploadToSignedUrl\(/);
  assert.doesNotMatch(flow,/action:'finalize'/);
  assert.match(flow,/if\(result\?\.error\)throw/);
  assert.match(js,/data-knowledge-extract/);
  assert.match(js,/Extraction may use a paid AI provider/);
  assert.match(js,/action:'finalize',source_id:id/);
  assert.match(js,/max_file_bytes\|\|10485760/);
});

test('native knowledge respects owner-only manual entry, owner/admin file management and readonly member view',()=>{
  assert.match(handler,/can_manage: \['owner', 'admin'\]\.includes\(auth\.role\), can_add_manual: auth\.role === 'owner'/);
  assert.match(js,/state\.knowledgeCanManage=result\.can_manage===true;state\.knowledgeCanAddManual=result\.can_add_manual===true/);
  assert.match(js,/if\(!state\.knowledgeCanAddManual\)return/);
  assert.match(js,/const editable=canManage&&\['active','needs_review'\]\.includes\(source\.status\)/);
  assert.match(js,/if\(state\.knowledgeBusy\|\|!state\.knowledgeCanManage\|\|!id\)/);
});

test('knowledge overview and editor retain accessibility, mobile width, and no auth selectors',()=>{
  assert.match(js,/class="cn-knowledge-stats"/);
  assert.match(js,/aria-label="Filter knowledge sources"/);
  assert.match(js,/aria-pressed="/);
  assert.match(js,/role="alert"/);
  assert.match(js,/id="cnKnowledgeFileInput"/);
  assert.match(css,/#colzoOwner \.cn-knowledge-stats/);
  assert.match(css,/#colzoOwner \.cn-knowledge-fact/);
  assert.doesNotMatch(css,/body#colzoApp\.auth|#authScreen/);
});
