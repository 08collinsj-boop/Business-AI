import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/colzo-connected-workspace.css',import.meta.url),'utf8');
const api=readFileSync(new URL('../lib/clickup-handler.js',import.meta.url),'utf8');
const callback=readFileSync(new URL('../lib/clickup-callback-handler.js',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/20261112013500_add_clickup_connections.sql',import.meta.url),'utf8');

test('desktop navigation includes ClickUp while five-tab mobile navigation remains unchanged',()=>{
 assert.match(html,/class="cn-desktop-nav-extra"[\s\S]*?data-cn-screen="clickup"/);
 const base=html.match(/<nav class="cn-nav"[^>]*>([\s\S]*?)<div class="cn-desktop-nav-extra"/);
 assert.ok(base);
 assert.equal((base[1].match(/data-cn-screen=/g)||[]).length,5);
 assert.match(source,/ClickUp tasks.*screen:'clickup'/);
});
test('native task list is grounded in returned workspace data',()=>{
 assert.match(source,/clickupTasks\?\.tasks/);
 assert.match(source,/ClickUp remains the system of record/);
 assert.match(source,/ClickUp did not confirm the change/);
 assert.match(source,/root\.isConnected.*state\.screen==='clickup'/);
 assert.match(source,/if\(target\.hasAttribute\('data-clickup-connect'\)\)/);
 assert.match(source,/if\(e\.target\.id==='cnClickupForm'\)/);
});
test('write actions require explicit approval and API rejects unauthenticated tenants',()=>{
 assert.match(api,/requireBusinessAdmin\(req\)/);
 assert.match(api,/if\(body\.approved!==true\)/);
 assert.match(api,/requireTenant\(await requireBusinessMember\(req\)\)/);
 assert.match(api,/listClickupTasks\(token,row\.workspace_id/);
});
test('OAuth callback consumes one-time state and checks authorisation',()=>{
 assert.match(callback,/timingSafeEqual/);
 assert.match(callback,/used_at=is\.null/);
 assert.match(callback,/business_memberships/);
 assert.match(callback,/assertScopedPilotWorkspace/);
});
test('token storage is strictly server-side with no browser role access',()=>{
 assert.match(migration,/enable row level security/g);
 assert.match(migration,/revoke all on public\.colzo_clickup_connections from anon,authenticated/);
 assert.match(migration,/grant all on public\.colzo_clickup_connections to service_role/);
});
test('new layout prioritises desktop and adapts for business-on-the-go',()=>{
 assert.match(css,/grid-template-columns: minmax\(0, 1\.35fr\)/);
 assert.match(css,/@media \(max-width: 700px\)/);
 assert.match(html,/colzo-connected-workspace\.css/);
});

test('desktop command centre has a direct connected-workspace entry',()=>{
 assert.match(source,/cn-dash-connected/);
 assert.ok(source.includes('data-cn-screen="clickup"'));
});
