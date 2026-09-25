import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const saved = { ...process.env };
const originalFetch = globalThis.fetch;
const businessId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const feedbackId = '33333333-3333-4333-8333-333333333333';
const reply = (body, ok = true, status = ok ? 200 : 500) => ({ ok, status, text: async () => typeof body === 'string' ? body : JSON.stringify(body), json: async () => body });
const res = () => ({ statusCode: 0, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, setHeader() {} });
function env() { process.env.TENANCY_AUTH_ENABLED='true'; process.env.SUPABASE_URL='https://example.supabase.co'; process.env.SUPABASE_SERVICE_ROLE_KEY='server-key'; }
function mock(role, seen) { return async (url, options={}) => { const href=String(url); if (href.endsWith('/auth/v1/user')) return reply({id:userId}); if (href.includes('business_memberships')) return reply([{business_id:businessId,role}]); if (href.endsWith('/rest/v1/pilot_feedback') && options.method==='POST') { seen.push(JSON.parse(options.body)); return reply([{id:feedbackId}],true,201); } if (href.includes('pilot_feedback?business_id=')) { seen.push(href); return reply([]); } if (href.includes('business_audit_events')) return reply({},true,201); return reply({},false); }; }

test('any authenticated business member can submit scoped Pilot feedback without conversation contents', async () => {
  env(); const seen=[]; globalThis.fetch=mock('member',seen);
  const handler=(await import(new URL(`../lib/feedback-handler.js?member=${Math.random()}`,import.meta.url))).default;
  let out=res(); await handler({method:'POST',headers:{authorization:'Bearer valid'},query:{},body:{category:'bug',page:'marketing',message:'The save button was confusing',app_version:'0.2.0-pilot'}},out);
  assert.equal(out.statusCode,201); assert.equal(seen[0].business_id,businessId); assert.equal(seen[0].actor_user_id,userId); assert.deepEqual(Object.keys(seen[0]).sort(),['actor_user_id','app_version','business_id','category','message','page','title'].sort());
  out=res(); await handler({method:'POST',headers:{authorization:'Bearer valid'},query:{},body:{category:'bug',page:'marketing',message:'Issue',conversation:'private transcript'}},out); assert.equal(out.statusCode,400);
});

test('feedback review is owner/admin only and reads are tenant scoped', async () => {
  env(); let seen=[]; globalThis.fetch=mock('member',seen);
  let handler=(await import(new URL(`../lib/feedback-handler.js?deny=${Math.random()}`,import.meta.url))).default; let out=res(); await handler({method:'GET',headers:{authorization:'Bearer valid'},query:{}},out); assert.equal(out.statusCode,403);
  seen=[]; globalThis.fetch=mock('owner',seen); handler=(await import(new URL(`../lib/feedback-handler.js?owner=${Math.random()}`,import.meta.url))).default; out=res(); await handler({method:'GET',headers:{authorization:'Bearer valid'},query:{}},out); assert.equal(out.statusCode,200); assert.ok(seen.some(value=>typeof value==='string'&&value.includes(`business_id=eq.${encodeURIComponent(businessId)}`)));
});

test('tester feedback accepts title, area and the other category', async () => {
  env(); const seen=[]; globalThis.fetch=mock('member',seen);
  const handler=(await import(new URL(`../lib/feedback-handler.js?full=${Math.random()}`,import.meta.url))).default;
  const out=res(); await handler({method:'POST',headers:{authorization:'Bearer valid'},query:{},body:{category:'other',title:'Schedule tab confusing',page:'marketing',message:'I could not find my scheduled posts',app_version:'0.2.0-pilot'}},out);
  assert.equal(out.statusCode,201); assert.equal(out.body.submitted,true);
  assert.equal(seen[0].title,'Schedule tab confusing'); assert.equal(seen[0].page,'marketing'); assert.equal(seen[0].category,'other');
});

test('unauthenticated feedback submissions are rejected', async () => {
  env(); const seen=[]; globalThis.fetch=mock('member',seen);
  const handler=(await import(new URL(`../lib/feedback-handler.js?unauth=${Math.random()}`,import.meta.url))).default;
  const out=res(); await handler({method:'POST',headers:{},query:{},body:{category:'bug',page:'home',message:'Something broke'}},out);
  assert.equal(out.statusCode,401);
});

test('client business_id cannot bypass feedback tenancy', async () => {
  env(); const seen=[]; globalThis.fetch=mock('owner',seen);
  const handler=(await import(new URL(`../lib/feedback-handler.js?tenant=${Math.random()}`,import.meta.url))).default;
  const out=res(); await handler({method:'POST',headers:{authorization:'Bearer valid'},query:{},body:{category:'bug',page:'home',message:'Something broke',business_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}},out);
  assert.equal(out.statusCode,400);
  assert.ok(seen.every(value=>typeof value!=='string'||!value.includes('bbbbbbbb')));
});

test('feedback validation rejects empty, oversized and unknown values', async () => {
  env(); const seen=[]; globalThis.fetch=mock('member',seen);
  const handler=(await import(new URL(`../lib/feedback-handler.js?validation=${Math.random()}`,import.meta.url))).default;
  for (const body of [
    {category:'bug',page:'home',message:'  '},
    {category:'bug',page:'home',message:'x'.repeat(3001)},
    {category:'nope',page:'home',message:'Something broke'},
    {category:'bug',page:'elsewhere',message:'Something broke'},
    {category:'bug',page:'home',message:'Something broke',title:'x'.repeat(121)}
  ]) {
    const out=res(); await handler({method:'POST',headers:{authorization:'Bearer valid'},query:{},body},out);
    assert.equal(out.statusCode,400);
  }
});

test('tester feedback form is mobile-friendly, escaped and has a success state', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /Send feedback/);
  assert.match(html, /pilotFeedbackCategory/);
  assert.match(html, /pilotFeedbackTitle/);
  assert.match(html, /pilotFeedbackArea/);
  assert.match(html, /pilotFeedbackMessage/);
  assert.match(html, /pilotFeedbackStatus/);
  assert.match(html, /Thanks — your feedback has been sent\./);
  assert.match(html, /pilotFeedbackList/);
  assert.ok(html.includes('esc(item.title'));
  assert.ok(html.includes('esc(item.message'));
  assert.match(html, /value="receptionist">AI Receptionist/);
  assert.match(html, /value="knowledge">Business Knowledge/);
  assert.match(html, /value="other">Other/);
});

test('feedback has exactly one submission path', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const bindings = html.match(/pilotFeedbackForm'\)\?\.addEventListener\('submit',submitPilotFeedback/g) || [];
  assert.equal(bindings.length, 1);
  assert.doesNotMatch(html, /assets\/pilot\.js/);
  await assert.rejects(readFile(new URL('../assets/pilot.js', import.meta.url), 'utf8'), /ENOENT/);
});

test('privacy copy no longer promises unavailable UI controls', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /lead-data API/);
  assert.match(html, /contact your Pilot support contact/i);
});

test.after(()=>{ for(const key of Object.keys(process.env)) if(!(key in saved)) delete process.env[key]; Object.assign(process.env,saved); globalThis.fetch=originalFetch; });
