import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('approval-only signup submits no registration request even if its form is opened directly',async()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const start=html.indexOf("$('signUpForm').addEventListener('submit',async event=>{");
 const end=html.indexOf("$('legalAcceptanceForm').addEventListener",start);
 let submit,calls=0;const message={textContent:'',classList:{remove(){},add(){}}};
 const fields={signUpForm:{addEventListener(_name,fn){submit=fn;}},signUpMessage:message,signUpEmail:{value:'synthetic@example.invalid'},signUpPassword:{value:'synthetic'},signUpPasswordConfirm:{value:'synthetic'},signUpSubmit:{},signUpReferralCode:{value:''},signUpLegalAccept:{checked:true}};
 vm.runInNewContext(html.slice(start,end),{URL,$:id=>fields[id],window:{colzoPilotApprovalRequired:true,location:{origin:'https://example.invalid'}},supabaseClient:{auth:{signUp:async()=>{calls++;return {data:{}};}}},passwordPolicyIssue:()=>null,rememberReferralCode(){},normaliseReferralInput:()=>null});
 await submit({preventDefault(){}});
 assert.equal(calls,0,'approval-only UI must not create an account');
 assert.match(message.textContent,/approval/i);
});
