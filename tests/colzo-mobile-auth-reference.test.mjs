import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('Colzo welcome is a real accessible screen with reference actions',async()=>{
 const [html,ui]=await Promise.all([read('index.html'),read('assets/colzo-workspace.js')]);
 for(const id of ['colzoWelcome','colzoWelcomeStart','colzoWelcomeSignIn','colzoWelcomeTitle','colzoWelcomeMessage'])assert.match(html,new RegExp(`id="${id}"`));
 assert.match(html,/Business made <strong>smarter\.<\/strong>/);
 assert.match(html,/Get started<\/button>/);assert.match(html,/Sign in<\/button>/);
 assert.match(ui,/colzo-welcome-active/);
 assert.match(ui,/\$\('colzoWelcomeStart'\)\?\.addEventListener\('click',\(\)=>dismissWelcome\('signup'\)\)/);
 assert.match(ui,/\$\('colzoWelcomeSignIn'\)\?\.addEventListener\('click',\(\)=>dismissWelcome\('login'\)\)/);
 assert.match(ui,/sessionStorage\.setItem\('colzo-welcome-dismissed-v1'/);
 assert.match(html,/href="\/customer\/account"/);
});
test('mobile authentication uses dark native autofill fields, safe-area and readable iPhone fonts',async()=>{
 const css=await read('assets/colzo-interface.css');
 assert.match(css,/body\.colzo-interface\.auth-required #authScreen\.auth-screen/);
 assert.match(css,/min-height:100svh!important/);
 assert.match(css,/padding:max\(15px,env\(safe-area-inset-top\)\)/);
 assert.match(css,/#authScreen \.auth-input input:-webkit-autofill/);
 assert.match(css,/-webkit-text-fill-color:#f7faf9!important/);
 assert.match(css,/font-size:16px!important/);
 assert.match(css,/body\.colzo-interface\.auth-required\.colzo-welcome-active #colzoWelcome/);
});
test('preview explicitly warns about authentication configuration without resetting accounts',async()=>{
 const [html,ui]=await Promise.all([read('index.html'),read('assets/colzo-workspace.js')]);
 assert.match(html,/id="colzoPreviewAuthNotice"/);
 assert.match(ui,/preview authentication configuration|preview.*authentication/i);
 assert.match(html,/window\.location\.hostname\.endsWith\('\.vercel\.app'\)/);
 assert.match(html,/Your existing Business AI account has not been changed/);
 assert.match(html,/signInWithPassword\(\{email:\$\('loginEmail'\)\.value\.trim\(\),password:\$\('loginPassword'\)\.value\}\)/);
 assert.doesNotMatch(ui,/resetPasswordForEmail|deleteUser|auth\.admin/);
});
