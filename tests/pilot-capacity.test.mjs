import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parsePilotCapacity, default as handler } from '../api/pilot-capacity.js';

function run(method, host) {
  const res = { code: 200, headers: {}, setHeader(k,v){ this.headers[k]=v; }, status(code){ this.code=code; return this; }, json(body){ this.body=body; return this; } };
  handler({method, headers: {host}}, res);
  return res;
}

test('unverified goal values fail closed instead of inventing places', () => {
  for (const [total, confirmed] of [[null,null],['20',''],['20','21'],['0','0'],['twenty','5'],['20','-1'],['20','1.5']]) {
    assert.equal(parsePilotCapacity(total, confirmed), null);
  }
  assert.deepEqual(parsePilotCapacity('20','5'),{ total:20, confirmed:5 });
  assert.deepEqual(parsePilotCapacity('20','0'),{ total:20, confirmed:0 });
});

test('rejects unexpected methods and does not leak Pilot data on other domains', () => {
  assert.equal(run('POST','business-ai-pilot.vercel.app').code,405);
  assert.deepEqual(run('GET','app.getbusiness-ai.com').body,{ status:'unverified' });
});

test('unconfigured API does not pretend places are filled', () => {
  const prevTotal=process.env.PILOT_GOAL_TOTAL, prevConfirmed=process.env.PILOT_CONFIRMED_SIGNUPS;
  delete process.env.PILOT_GOAL_TOTAL;
  delete process.env.PILOT_CONFIRMED_SIGNUPS;
  try { assert.deepEqual(run('GET','business-ai-pilot.vercel.app').body,{ status:'unverified' }); }
  finally { if(prevTotal===undefined)delete process.env.PILOT_GOAL_TOTAL;else process.env.PILOT_GOAL_TOTAL=prevTotal; if(prevConfirmed===undefined)delete process.env.PILOT_CONFIRMED_SIGNUPS;else process.env.PILOT_CONFIRMED_SIGNUPS=prevConfirmed; }
});

test('Pilot sign-up copy is gated to Pilot hosts and includes a disclosure', () => {
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const js=fs.readFileSync(new URL('../assets/pilot-signup.js',import.meta.url),'utf8');
  assert.match(html,/id="pilotJoinBanner"[^>]*hidden/);
  assert.match(html,/Pilot participation figures are being verified/);
  assert.match(js,/business-ai-pilot/);
  assert.match(js,/status !== 'verified'/);
});
