import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encryptClickupToken, decryptClickupToken, clickupConfig,
  normalizeClickupTask, summarizeClickupTasks,
  listClickupTasks, updateClickupTask, createClickupTask
} from '../lib/clickup-provider.js';

const businessId = '10000000-0000-4000-8000-000000000001';
const another = '10000000-0000-4000-8000-000000000002';
const key = 'a'.repeat(64);
const t = (date, status = 'to do') => ({
  id: 'abc', name: ' Inspect panel ', status: { status },
  due_date: String(Date.parse(date)), url: 'https://app.clickup.com/t/abc',
  list: { id: '234', name: 'Jobs' }, assignees: [{ username: 'Alex' }]
});
test('tokens are encrypted and bound to the originating tenant', () => {
  const sealed = encryptClickupToken('test-only-token', businessId, key);
  assert.equal(JSON.stringify(sealed).includes('test-only-token'), false);
  assert.equal(decryptClickupToken(sealed, businessId, key), 'test-only-token');
  assert.throws(() => decryptClickupToken(sealed, another, key));
  assert.throws(() => encryptClickupToken('test-only-token', businessId, 'bad'));
});
test('configuration fails closed until all server secrets are present', () => {
  assert.equal(clickupConfig({}).configured, false);
  assert.equal(clickupConfig({CLICKUP_CLIENT_ID:'x',CLICKUP_CLIENT_SECRET:'y',CLICKUP_REDIRECT_URI:'http://localhost/x',CLICKUP_TOKEN_ENCRYPTION_KEY:key,CLICKUP_INTEGRATION_ENABLED:'true'}).configured, false);
});
test('task normalization omits untrusted fields and does not invent dates', () => {
  assert.deepEqual(normalizeClickupTask(t('2026-11-10T10:00:00Z')), {
    id:'abc',title:'Inspect panel',status:'to do',dueAt:'2026-11-10T10:00:00.000Z',
    listId:'234',listName:'Jobs',assignees:['Alex'],url:'https://app.clickup.com/t/abc'
  });
  assert.equal(normalizeClickupTask({...t('2026-11-10T10:00:00Z'),url:'javascript:alert(1)'}).url,null);
});
test('grounded task briefing counts only received tasks', () => {
  const summary = summarizeClickupTasks([
    normalizeClickupTask(t('2026-11-10T10:00:00Z')),
    normalizeClickupTask({...t('2026-11-13T10:00:00Z'),id:'b',status:{status:'in progress'}}),
    normalizeClickupTask({...t('2026-11-08T10:00:00Z'),id:'c',status:{status:'complete'}})
  ], new Date('2026-11-12T12:00:00Z'));
  assert.equal(summary.total,3);
  assert.equal(summary.overdue,1);
  assert.equal(summary.dueSoon,1);
  assert.equal(summary.completed,1);
});
test('list tasks uses ClickUp API server-side and never returns the token', async () => {
  let called;
  const fetchImpl=async (url,options)=>{called={url,options};return new Response(JSON.stringify({tasks:[t('2026-11-10T10:00:00Z')]}),{status:200});};
  const data=await listClickupTasks('private-token','123',{fetchImpl});
  assert.match(called.url,/\/api\/v2\/team\/123\/task\?page=0/);
  assert.equal(called.options.headers.Authorization,'private-token');
  assert.equal(data.tasks.length,1);
  assert.equal(JSON.stringify(data).includes('private-token'),false);
});
test('task updates require an explicit, limited change and confirmed provider response', async () => {
  await assert.rejects(updateClickupTask('private-token','abc',{}, {fetchImpl:async()=>{throw Error('should not execute')}}));
  await assert.rejects(updateClickupTask('private-token','abc',{description:'inject'}, {fetchImpl:async()=>{throw Error('should not execute')}}));
  let method='',body={};
  const result=await updateClickupTask('private-token','abc',{status:'in progress'},{fetchImpl:async (_url,options)=>{method=options.method;body=JSON.parse(options.body);return new Response(JSON.stringify(t('2026-11-13T10:00:00Z','in progress')),{status:200});}});
  assert.equal(method,'PUT');assert.deepEqual(body,{status:'in progress'});assert.equal(result.status,'in progress');
});
test('create task only accepts a known list id and nonempty title', async () => {
  await assert.rejects(createClickupTask('private-token','not-a-list',{title:'Hello'},{fetchImpl:async()=>{throw Error('should not execute')}}));
  let sent;
  const created=await createClickupTask('private-token','123',{title:' Prepare quote '},{fetchImpl:async (_url,options)=>{sent=JSON.parse(options.body);return new Response(JSON.stringify({...t('2026-11-13T10:00:00Z'),name:'Prepare quote'}),{status:200});}});
  assert.equal(sent.name,'Prepare quote');assert.equal(created.title,'Prepare quote');
});
test('provider errors are sanitized and rate limits are surfaced',async()=>{
  await assert.rejects(listClickupTasks('private-token','123',{fetchImpl:async()=>new Response(JSON.stringify({err:'token private-token'}),{status:429})}), /rate limit/i);
});
