import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Exercise the actual inline policy helper against a tiny DOM, without an
// interactive browser or real Supabase credentials.
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
function policy(){
 const match=/function applySelfServiceReferralPolicy\(enabled\)\{([\s\S]*?)\n\}/.exec(html);
 assert.ok(match,'a dedicated referral-field policy must exist on the signup page');
 const fields=new Map([
  ['signUpReferralCode',{value:'BAI-1234567890',wrapper:{hidden:false}}],
  ['newBusinessReferralCode',{value:'BAI-1234567890',wrapper:{hidden:false}}]
 ]);
 const dom={};
 for(const [key,v] of fields)dom[key]={get value(){return v.value;},set value(x){v.value=x;},closest(selector){assert.equal(selector,'.auth-field');return v.wrapper;}};
 let cleared=0;
 const ctx={window:{}, $:id=>dom[id],clearPendingReferralCode:()=>{cleared++;}};
 const invoke=new Function('window','$','clearPendingReferralCode',`return function applySelfServiceReferralPolicy(enabled){${match[1]}\n};`)(ctx.window,ctx.$,ctx.clearPendingReferralCode);
 return {invoke,ctx,fields,cleared:()=>cleared};
}

test('free self-service signup hides unsupported referral fields, clears prefilled referral, and does not preserve URL code',()=>{
 const p=policy();
 p.invoke(true);
 assert.equal(p.ctx.window.colzoPilotSelfService,true);
 for(const item of p.fields.values()){assert.equal(item.wrapper.hidden,true);assert.equal(item.value,'');}
 assert.equal(p.cleared(),1,'clear pending referral including a URL ?ref= value');
});

test('existing non-self-service account creation still displays referral inputs',()=>{
 const p=policy();
 p.invoke(false);
 assert.equal(p.ctx.window.colzoPilotSelfService,false);
 for(const item of p.fields.values()){assert.equal(item.wrapper.hidden,false);assert.equal(item.value,'BAI-1234567890');}
 assert.equal(p.cleared(),0);
});

test('both signup and workspace creation suppress client referral submission when self-service is active',()=>{
 assert.match(html,/const referralRaw=window\.colzoPilotSelfService\?'':\$\('signUpReferralCode'\)/);
 assert.match(html,/const referralRaw=window\.colzoPilotSelfService\?'':\$\('newBusinessReferralCode'\)/);
 assert.match(html,/applySelfServiceReferralPolicy\(selfService\)/);
});
