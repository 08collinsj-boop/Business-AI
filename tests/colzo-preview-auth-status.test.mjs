import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import handler,{safeSupabaseHost,checkColzoPreviewAuth} from '../lib/colzo-preview-auth-status.js';
const env={SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test-publishable',FRONTEND_AUTH_ENABLED:'true'};
const response=data=>({ok:true,json:async()=>data});
const res=()=>({code:null,data:null,setHeader(){},status(n){this.code=n;return this;},json(data){this.data=data;return this;}});
test('environment diagnostics safely reject invalid, forged and non-https Supabase projects',()=>{
 assert.equal(safeSupabaseHost('https://mvwseobgkexzpmmkgcxe.supabase.co'),'mvwseobgkexzpmmkgcxe.supabase.co');
 for(const unsafe of ['http://mvwseobgkexzpmmkgcxe.supabase.co','https://mvwseobgkexzpmmkgcxe.supabase.co.evil.com','https://user:secret@mvwseobgkexzpmmkgcxe.supabase.co','file:///etc/passwd','https://mvwseobgkexzpmmkgcxe.supabase.co/private',''])assert.equal(safeSupabaseHost(unsafe),null);
});
test('preview detects matching live authentication project without returning refs or keys',async()=>{
 let target='';const result=await checkColzoPreviewAuth({env,fetchImpl:async(url,options)=>{target=url;assert.equal(options.redirect,'error');return response({supabaseUrl:env.SUPABASE_URL,supabaseAnonKey:'public-but-not-returned'});}});
 assert.equal(target,'https://app.getbusiness-ai.com/api/public-config');
 assert.deepEqual(result,{status:'same_project',authReady:true});
 assert.doesNotMatch(JSON.stringify(result),/supabase|publishable|api_key|secret|mvwseobgkexzpmmkgcxe/i);
});
test('different projects are flagged without disclosing their identity',async()=>{
 const out=await checkColzoPreviewAuth({env,fetchImpl:async()=>response({supabaseUrl:'https://different.supabase.co'})});
 assert.deepEqual(out,{status:'different_project',authReady:true});
});
test('missing frontend configuration fails closed and cannot fetch network',async()=>{
 const out=await checkColzoPreviewAuth({env:{...env,SUPABASE_PUBLISHABLE_KEY:'',SUPABASE_ANON_KEY:''},fetchImpl:()=>{throw Error('should not fetch');}});
 assert.deepEqual(out,{status:'unconfigured',authReady:false});
});
test('unexpected live failures report unknown instead of a false mismatch',async()=>{
 assert.deepEqual(await checkColzoPreviewAuth({env,fetchImpl:async()=>{throw Error('network');}}),{status:'unknown',authReady:true});
 assert.deepEqual(await checkColzoPreviewAuth({env,fetchImpl:async()=>({ok:false})}),{status:'unknown',authReady:true});
 assert.deepEqual(await checkColzoPreviewAuth({env,fetchImpl:async()=>response({supabaseUrl:'https://evil.invalid'})}),{status:'unknown',authReady:true});
});
test('diagnostics is read-only and disabled for production',async()=>{
 const old=process.env.VERCEL_ENV;
 try{process.env.VERCEL_ENV='production';const r=res();await handler({method:'GET'},r);assert.equal(r.code,404);
    const r2=res();await handler({method:'POST'},r2);assert.equal(r2.code,405);
 }finally{if(old===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=old;}
});
test('preview UI reports status and safe sign-in codes without modifying existing accounts',async()=>{
 const [html,client,api,vercel]=await Promise.all(['index.html','assets/colzo-workspace.js','api/operations.js','vercel.json'].map(file=>readFile(new URL('../'+file,import.meta.url),'utf8')));
 assert.match(client,/fetch\('\/api\/colzo-preview-auth'/);
 assert.match(client,/window\.colzoPreviewAuthStatus=status/);
 assert.match(client,/different_project/);
 assert.match(html,/code==='email_not_confirmed'/);
 assert.match(html,/code==='invalid_credentials'/);
 assert.match(api,/"colzo-preview-auth": colzoPreviewAuthStatus/);
 assert.match(vercel,/"source": "\/api\/colzo-preview-auth"/);
 assert.doesNotMatch(client,/resetPasswordForEmail|admin\.deleteUser/);
});
