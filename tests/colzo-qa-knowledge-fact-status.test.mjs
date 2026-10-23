import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const code = await readFile(new URL('../assets/colzo-native.js', import.meta.url),'utf8');
const start = code.indexOf(' function knowledge(){');
const end = code.indexOf(' async function loadBilling(',start);
assert.ok(start > 0 && end > start, 'find native knowledge renderer');
const section = code.slice(start,end);

function renderKnowledge(sources, extra = {}) {
  const state = {
    knowledgeSources: sources,
    knowledgeDetail: null,
    knowledgeCanManage: false,
    knowledgeCanAddManual: false,
    knowledgeError: '',
    knowledgeFeedback: '',
    knowledgeFilter: 'all',
    knowledgeLimits: null,
    knowledgeLoading: false,
    knowledgeForm: false,
    knowledgeBusy: false,
    ...extra
  };
  return runInNewContext(section+'; knowledge()',{
    state,safe: x => String(x??''),
    day:()=> '23 Oct',empty: x => '<div>'+x+'</div>'
  });
}

test('QA F08: approved facts never appear awaiting review solely due to stale source status',()=>{
  const html=renderKnowledge([{id:'synthetic-approved',file_name:'Verified FAQ',
    status:'needs_review',item_counts:{total:2,active:2,needs_review:0,rejected:0}}]);
  assert.match(html,/2 approved facts/i);
  assert.match(html,/0 awaiting review/i);
  assert.match(html,/Facts approved/);
  assert.doesNotMatch(html,/<span class="cn-pill progress">needs review<\/span>/i);
});

test('QA F08: unreviewed facts and failed extraction remain visibly unapproved',()=>{
  const html=renderKnowledge([
    {id:'synthetic-unreviewed',file_name:'Unverified FAQ',
      status:'needs_review',item_counts:{total:2,active:0,needs_review:2,rejected:0}},
    {id:'synthetic-failed',file_name:'Failed document',
      status:'failed',item_counts:{total:0,active:0,needs_review:0,rejected:0}}
  ]);
  assert.match(html,/2 awaiting review/i);
  assert.match(html,/Review needed/);
  assert.match(html,/Failed document/);
  assert.match(html,/<span class="cn-pill attention">failed<\/span>/i);
  assert.doesNotMatch(html,/Facts approved/);
});
