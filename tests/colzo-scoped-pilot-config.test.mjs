import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../lib/public-config-handler.js';
test('scoped mode advertises approval-only access without enabling the legacy all-features offer',()=>{
 const before={...process.env};
 try{
 Object.assign(process.env,{FRONTEND_AUTH_ENABLED:'true',SUPABASE_URL:'https://mvwseobgkexzpmmkgcxe.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',COLZO_SCOPED_PILOT_ACCESS:'true',PILOT_FREE_STARTER_MARKETING:'true'});
 const res={setHeader(){},status(c){this.code=c;return this;},json(b){this.body=b;return this;}};
 handler({},res);
 assert.equal(res.body.pilotFreeAccess,false,'scoped approval must not advertise legacy Marketing entitlement');
 assert.deepEqual(res.body.pilotAccess,{approvalRequired:true,durationDays:14,cardRequired:false,automaticConversion:false});
 assert.equal(res.body.frontendAuthEnabled,true,'existing sign-in remains available');
 }finally{for(const k of Object.keys(process.env))if(!(k in before))delete process.env[k];Object.assign(process.env,before);}
});
