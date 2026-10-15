import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const load=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('Colzo MFA stylesheet is loaded, scoped, lime coloured and mobile scrollable',async()=>{
 const [html,css]=await Promise.all([load('index.html'),load('assets/colzo-mfa-theme.css')]);
 assert.match(html,/\/assets\/colzo-mfa-theme\.css\?v=/);
 assert.ok(html.indexOf('/assets/colzo-mfa-theme.css')>html.indexOf('/assets/colzo-legacy-theme.css'));
 assert.match(css,/body\.colzo-interface #securityMfaGate/);
 assert.match(css,/#securityMfaGateVerify/);
 assert.match(css,/#securityMfaGateLogout/);
 assert.match(css,/background:#c8ff2e!important/);
 assert.match(css,/max-height:calc\(100dvh/);
 assert.match(css,/overflow-y:auto/);
 assert.doesNotMatch(css,/body\.auth-ready\s*\{\s*overflow/);
 assert.doesNotMatch(css,/(display:none|visibility:hidden|pointer-events:none)\s*!important/);
});
test('Colzo label updates retain original MFA authentication enforcement and factor identity',async()=>{
 const js=await load('assets/security-center.js');
 assert.match(js,/Enter your authenticator code to open Colzo\./);
 assert.doesNotMatch(js,/Enter your authenticator code to open Business AI\./);
 assert.match(js,/Once enabled, Colzo requires the second factor on future sign-ins/);
 assert.match(js,/friendlyName:'Business AI'/); // Existing authenticator factors remain recognisable; no re-enrolment
 assert.match(js,/await challengeForAal2\(\{blocking:true,reason:/);
 assert.match(js,/byId\('securityMfaGateCancel'\)\.hidden=blocking/);
 assert.match(js,/authClient\.auth\.mfa\.challenge\(/);
 assert.match(js,/authClient\.auth\.mfa\.verify\(/);
 assert.match(js,/aal\.data\?\.currentLevel!=='aal2'/);
});
