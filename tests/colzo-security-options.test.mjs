import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');

test('Passkeys are disabled by default in browser-safe project configuration',async()=>{
 const config=await import('../lib/public-config-handler.js');
 const old=process.env.COLZO_PASSKEYS_ENABLED, oldAuth=process.env.FRONTEND_AUTH_ENABLED,oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_PUBLISHABLE_KEY;
 const run=()=>{let status=0;let body=null;const res={setHeader(){},status(s){status=s;return this},json(v){body=v;return this}};config.default({},res);return{status,body}};
 try{
  process.env.FRONTEND_AUTH_ENABLED='true';process.env.SUPABASE_URL='https://mock.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_fixture_only';delete process.env.COLZO_PASSKEYS_ENABLED;
  assert.equal(run().body.colzoPasskeysEnabled,false);
  process.env.COLZO_PASSKEYS_ENABLED='true';assert.equal(run().body.colzoPasskeysEnabled,true);
  process.env.COLZO_PASSKEYS_ENABLED='false';assert.equal(run().body.colzoPasskeysEnabled,false);
 }finally{
  const restore=(k,v)=>v===undefined?delete process.env[k]:process.env[k]=v;
  restore('COLZO_PASSKEYS_ENABLED',old);restore('FRONTEND_AUTH_ENABLED',oldAuth);restore('SUPABASE_URL',oldUrl);restore('SUPABASE_PUBLISHABLE_KEY',oldKey);
 }
});

test('Passkey sign-in is opt-in only; existing password/auth flows, onboarding and AAL2 stay intact',async()=>{
 const [html,security,native]=await Promise.all(['index.html','assets/security-center.js','assets/colzo-native.js'].map(read));
 assert.match(html,/config\.colzoPasskeysEnabled===true/);
 assert.match(html,/window\.colzoPasskeysEnabled\?\{auth:\{experimental:\{passkey:true\}\}\}:\{\}/);
 assert.match(html,/passkeyLogin\.hidden=!window\.colzoPasskeysEnabled\|\|!window\.PublicKeyCredential\|\|!window\.isSecureContext\|\|typeof supabaseClient\?\.auth\?\.signInWithPasskey!=='function'/);
 assert.match(html,/supabaseClient\.auth\.signInWithPassword/);
 assert.match(html,/supabaseClient\.auth\.signInWithPasskey/);
 assert.match(html,/window\.colzoOfferSecuritySetup\?\.\(\)/);
 assert.match(native,/openLegacy:original/);
 assert.match(native,/Security','Password and two-factor authentication','security'/);
 assert.match(native,/window\.colzoOpenSecurityCenter/);
 assert.match(security,/window\.colzoOpenSecurityCenter/);
 assert.match(security,/await challengeForAal2\(\{blocking:true/);
 assert.match(security,/await client\(\)\.auth\.registerPasskey\(\)/);
 assert.match(security,/account\.verified\.length&&account\.aal\?\.currentLevel!=='aal2'/);
 assert.match(security,/passkeysReady\(\)/);
 assert.match(security,/if\(app\)app\.inert=true/);
 assert.match(security,/if\(colzoOwner\)colzoOwner\.inert=true/);
 assert.match(security,/if\(colzoOwner\)colzoOwner\.inert=false/);
 assert.match(security,/if\(!account\|\|account\.verified\.length/);
 assert.match(security,/colzoSetupAuthenticator/);
 assert.match(security,/colzoSetupPasskey/);
 assert.match(security,/colzoSetupLater/);
 assert.match(security,/mfa\.challenge/);
 assert.match(security,/mfa\.verify/);
});

test('Face ID and Touch ID are presented as device passkeys, not claimed as a replacement for existing MFA',async()=>{
 const [html,js,css]=await Promise.all(['index.html','assets/security-center.js','assets/colzo-security-choice.css'].map(read));
 assert.match(js,/Face ID, Touch ID or fingerprint/);
 assert.match(js,/Authenticator app/);
 assert.match(js,/not enabled, so no message charges/);
 assert.match(js,/Authenticator codes may still be required/);
 assert.match(css,/#colzoSecurityMethods/);
 assert.match(css,/#colzoSetupLater/);
 assert.match(html,/colzoPasskeyLogin/);
 assert.match(css,/#colzoPasskeyLogin\[hidden\]\{display:none!important\}/);
 assert.doesNotMatch(js,/mfa\.unenroll\(\{factorId.*passkey/);
});
