import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import verifiedKnowledgeHandler from '../lib/knowledge-verified-handler.js';

const previousEnv = {...process.env};
const previousFetch = globalThis.fetch;
const businessId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const userId = '11111111-1111-4111-8111-111111111111';
const now = Date.now();
const activatedAt = new Date(now - 60_000).toISOString();
const expiresAt = new Date(now - 60_000 + 14 * 24 * 60 * 60_000).toISOString();
function response() {
  return {statusCode:0, headers:{}, setHeader(k,v){this.headers[k]=v;},
    status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;}};
}
async function request(action, body={}) {
  const res=response();
  await verifiedKnowledgeHandler({method:action==='GET'?'GET':'POST',headers:{authorization:'Bearer test-owner'},query:{},
    body:action==='GET'?undefined:{action,...body}},res);
  return res;
}
test('scoped pilot does not create upload tokens but retains manual facts and review', async() => {
  Object.assign(process.env,{
    TENANCY_AUTH_ENABLED:'true', COLZO_SCOPED_PILOT_ACCESS:'true',
    VERCEL_ENV:'preview', PILOT_FREE_STARTER_MARKETING:'false',
    SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY:'synthetic-test-key'
  });
  const sources=[],items=[],calls=[];
  globalThis.fetch=async(url,opts={})=>{
    const address=new URL(url),path=address.pathname,method=opts.method||'GET';
    calls.push({path,method});
    const json=(data,status=200)=>({ok:status<400,status,text:async()=>JSON.stringify(data),json:async()=>data});
    if(path==='/auth/v1/user')return json({id:userId});
    if(path.endsWith('/business_memberships'))return json([{business_id:businessId,role:'owner'}]);
    if(path.endsWith('/colzo_pilot_access'))return json([{business_id:businessId,status:'active',activated_at:activatedAt,expires_at:expiresAt}]);
    if(path.endsWith('/business_billing_usage'))return json([]);
    if(path.endsWith('/business_audit_events'))return json([],201);
    if(path.endsWith('/business_knowledge_sources') || path.endsWith('/business_knowledge_items')){
      const coll=path.endsWith('/business_knowledge_sources')?sources:items;
      if(method==='GET')return json(coll.filter(x=>!address.searchParams.has('id')||address.searchParams.get('id')==='eq.'+x.id));
      if(method==='POST'){const input=JSON.parse(opts.body);for(const row of Array.isArray(input)?input:[input])coll.push({...row,id:row.id||'22222222-2222-4222-8222-222222222222'});return json(coll.slice(-1),201);}
    }
    throw new Error('Unexpected service call: '+method+' '+path);
  };
  try{
    const initial=await request('GET');
    assert.equal(initial.statusCode,200);
    assert.equal(initial.body.can_add_manual,true);
    assert.equal(initial.body.can_upload,false);
    const upload=await request('create_upload',{file_name:'services.pdf',mime_type:'application/pdf',size_bytes:12});
    assert.equal(upload.statusCode,403);
    assert.match(upload.body.error,/pilot|unavailable/i);
    const finalize=await request('finalize',{source_id:'22222222-2222-4222-8222-222222222222'});
    assert.equal(finalize.statusCode,403);
    assert.ok(calls.every(x=>!x.path.includes('/storage/v1/')), 'no upload or extraction calls');
    assert.equal(sources.length,0,'no pending upload metadata');
    const manual=await request('create_manual',{item_type:'service',title:'Repairs',content:'We repair home appliances in Hartlepool.'});
    assert.equal(manual.statusCode,201);
    assert.equal(manual.body.source.status,'needs_review');
    assert.equal(items.length,1);
    assert.equal(items[0].status,'needs_review');
    process.env.COLZO_SCOPED_PILOT_ACCESS='false';
    const paid=await request('GET');
    assert.equal(paid.statusCode,200);
    assert.equal(paid.body.can_upload,true,'existing owner file uploads stay available outside scoped pilot');
  }finally{
    globalThis.fetch=previousFetch;
    for(const key of Object.keys(process.env))if(!(key in previousEnv))delete process.env[key];
    Object.assign(process.env,previousEnv);
  }
});

test('pilot knowledge UI hides upload actions while leaving manual entry available', async()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const start=html.indexOf('const knowledgeTypeLabels=');
  const end=html.indexOf('async function addManualKnowledge(',start);
  assert.ok(start>0 && end>start);
  assert.ok(html.includes('knowledgeUploadAction'));
  assert.ok(html.includes('knowledgeUploadAction" hidden'), 'upload control is hidden until capability has loaded');
  assert.ok(html.includes('knowledgeUploadLimits'), 'upload limits can be hidden during pilot');
  assert.ok(html.includes('if(!knowledgeCanUpload)'), 'client must fail closed on file upload');
  const elements={
    knowledgeList:{innerHTML:''},
    knowledgeStatus:{textContent:''},
    knowledgeUploadAction:{hidden:false,style:{display:''}},knowledgeUploadLimits:{hidden:false,style:{display:''}}
  };
  let allowed=false;
  const context={
    $:id=>elements[id],api:async()=>({sources:[],can_manage:true,can_add_manual:true,can_upload:allowed}),
    renderPilotProgress(){},esc:x=>x,knowledgeSources:[],knowledgeCanManage:false,knowledgeCanUpload:false
  };
  vm.runInNewContext(html.slice(start,end)+'globalThis.loadKnowledgeUI=loadKnowledge;',context);
  await context.loadKnowledgeUI();
  assert.equal(elements.knowledgeUploadAction.hidden,true);
  assert.equal(elements.knowledgeUploadLimits.hidden,true);
  assert.match(elements.knowledgeList.innerHTML,/manually|fact/i);
  allowed=true;
  await context.loadKnowledgeUI();
  assert.equal(elements.knowledgeUploadAction.hidden,false);
  assert.equal(elements.knowledgeUploadLimits.hidden,false);
  assert.ok(html.includes('manualKnowledgeForm'));
});
