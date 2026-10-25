import test from 'node:test';
import assert from 'node:assert/strict';
import {isVoiceReceptionistEnabled} from '../lib/voice.js';
import voiceCallsHandler from '../lib/voice-calls-handler.js';
import {createVoiceWebhookHandler} from '../lib/voice-webhook-handler.js';
const saved={...process.env},savedFetch=globalThis.fetch;
const result=()=>({statusCode:null,status(v){this.statusCode=v;return this;},json(v){this.body=v;return this;}});
test('scoped pilot keeps Voice disabled even if an old deployment left the Voice feature flag on',async()=>{
 try{
  process.env.VOICE_RECEPTIONIST_ENABLED='true';
  process.env.COLZO_SCOPED_PILOT_ACCESS='false';
  assert.equal(isVoiceReceptionistEnabled(),true,'existing paid/legacy opt-in remains available');
  process.env.COLZO_SCOPED_PILOT_ACCESS='true';
  assert.equal(isVoiceReceptionistEnabled(),false,'pilot may never activate paid Voice functionality');
  globalThis.fetch=()=>{throw Error('Voice must not reach backend or provider');};
  const calls=result();
  await voiceCallsHandler({method:'GET',query:{}},calls);
  assert.equal(calls.statusCode,503);
  let providerCalls=0;
  const webhook=createVoiceWebhookHandler({enabled:isVoiceReceptionistEnabled,registry:{get(){providerCalls++;return null;}}});
  const out=result();
  await webhook({method:'POST',headers:{},query:{provider:'synthetic'}},out);
  assert.equal(out.statusCode,404);
  assert.equal(providerCalls,0);
 }finally{
  globalThis.fetch=savedFetch;
  for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];
  Object.assign(process.env,saved);
 }
});
