import test from 'node:test';
import assert from 'node:assert/strict';
import {checkCutover,allowlistedOrigin,supabaseHost} from '../lib/colzo-release-gate.js';
const LIVE='https://app.getbusiness-ai.com';
const CAN='https://business-ai-pilot-ibbljrs4k-buisness-ai1.vercel.app';
const ok={frontendAuthEnabled:true,supabaseUrl:'https://mvwseobgkexzpmmkgcxe.supabase.co',supabaseAnonKey:'public-publishable-key-not-secret-test-only'};
const mock=(params={})=>async url=>{
 const origin=new URL(url).origin,pathname=new URL(url).pathname;
 const isLive=origin===LIVE;
 const config=isLive?ok:{...ok,...params.candidateConfig};
 let code=200,data='';
 if(pathname==='/')data='<!doctype html><title>Colzo</title>';
 else if(pathname==='/api/health'){code=isLive?200:params.healthStatus||200;data=JSON.stringify({status:code===200?'ok':'unavailable'})}
 else if(pathname==='/api/public-config'){code=isLive?200:params.configStatus||200;data=JSON.stringify(config)}
 else if(pathname==='/api/colzo/projects'){code=isLive?404:params.protectedStatus||403;data=JSON.stringify({error:'Sign in required'})}
 else throw Error('Unexpected URL');
 return {status:code,text:async()=>data};
};
test('release gate passes only matching auth, healthy root and correctly protected API',async()=>{
 const result=await checkCutover({live:LIVE,candidate:CAN,fetchImpl:mock()});
 assert.equal(result.pass,true,JSON.stringify(result.blockers));
 assert.ok(result.checks.find(x=>x.name.includes('live: unauthenticated')&&x.http===404&&x.pass));
});
test('release gate blocks missing preview auth and health without changing live status',async()=>{
 const result=await checkCutover({live:LIVE,candidate:CAN,fetchImpl:mock({healthStatus:503,configStatus:404})});
 assert.equal(result.pass,false);
 assert.ok(result.blockers.some(x=>x.includes('candidate: app health')));
 assert.ok(result.blockers.some(x=>x.includes('candidate: frontend auth')));
 assert.ok(result.blockers.some(x=>x.includes('candidate: same existing Supabase Auth')));
 assert.equal(result.blockers.some(x=>x.startsWith('live:')),false);
});
test('release gate blocks another authentication database and accidental public data access',async()=>{
 const result=await checkCutover({live:LIVE,candidate:CAN,fetchImpl:mock({candidateConfig:{supabaseUrl:'https://different-project.supabase.co'},protectedStatus:200})});
 assert.equal(result.pass,false);
 assert.ok(result.blockers.includes('candidate: same existing Supabase Auth project'));
 assert.ok(result.blockers.includes('candidate: unauthenticated project data is protected'));
});
test('release gate rejects URLs outside the existing Pilot Vercel project and invalid Supabase hosts',async()=>{
 assert.equal(allowlistedOrigin('http://app.getbusiness-ai.com'),null);
 assert.equal(allowlistedOrigin('https://app.getbusiness-ai.com:443/example'),null);
 assert.equal(supabaseHost('http://mvwseobgkexzpmmkgcxe.supabase.co'),null);
 assert.equal(supabaseHost('https://evil.example'),null);
 await assert.rejects(()=>checkCutover({live:LIVE,candidate:'https://evil.example',fetchImpl:mock()}));
 await assert.rejects(()=>checkCutover({live:LIVE,candidate:'https://other-buisness-ai1.vercel.app',fetchImpl:mock()}));
 await assert.rejects(()=>checkCutover({live:CAN,candidate:LIVE,fetchImpl:mock()}));
});
