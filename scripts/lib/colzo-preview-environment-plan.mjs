// Offline policy check only. Call with privately resolved values/hosting metadata.
// Never writes env vars, contacts a provider, deploys or echoes a credential.
import {isBrowserSafeSupabaseKey} from '../../lib/public-config-handler.js';
const REF='mvwseobgkexzpmmkgcxe',BRANCH='fix/colzo-pilot-release-gates-20261026';
const PROVIDERS=['OPENAI_API_KEY','OPENROUTER_API_KEY','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','CLOUDFLARE_API_TOKEN','META_APP_SECRET','META_TOKEN_ENCRYPTION_KEY','CRON_SECRET','MARKETING_SCHEDULER_SECRET'];
export function checkPreviewEnvironment({env={},trustedDevKeys,expectedSha,metadata={}}={}){
 const checks=[];const mark=(name,ok)=>checks.push({name,status:ok?'PASSED':'BLOCKED'});
 const trusted=trustedDevKeys?.projectRef===REF&&typeof trustedDevKeys.service==='string'&&trustedDevKeys.service.length>10&&typeof trustedDevKeys.public==='string'&&isBrowserSafeSupabaseKey(trustedDevKeys.public);
 mark('Development key provenance',Boolean(trusted));
 mark('Exact Development credentials',Boolean(trusted&&env.SUPABASE_URL==='https://'+REF+'.supabase.co'&&env.SUPABASE_SERVICE_ROLE_KEY===trustedDevKeys.service&&env.SUPABASE_PUBLISHABLE_KEY===trustedDevKeys.public));
 mark('Server credential not aliased',Boolean(trusted&&!Object.entries(env).some(([key,value])=>key!=='SUPABASE_SERVICE_ROLE_KEY'&&typeof value==='string'&&value.includes(trustedDevKeys.service))));
 const required={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:BRANCH,COLZO_EXPECTED_SUPABASE_PROJECT_REF:REF,TENANCY_AUTH_ENABLED:'true',FRONTEND_AUTH_ENABLED:'true',COLZO_SCOPED_PILOT_ACCESS:'true',BILLING_ENABLED:'false',PILOT_FREE_STARTER_MARKETING:'false',VOICE_RECEPTIONIST_ENABLED:'false',META_PUBLISH_ENABLED:'false',MARKETING_AUTOPUBLISH_ENABLED:'false',PUBLIC_ENQUIRY_RATE_LIMIT_MODE:'database'};
 mark('Explicit pilot feature and auth settings',Object.entries(required).every(([key,value])=>env[key]===value));
 mark('No inherited provider or scheduler secrets',PROVIDERS.every(key=>!env[key]));
 mark('Durable enquiry quota secret present',typeof env.RATE_LIMIT_SALT==='string'&&env.RATE_LIMIT_SALT.length>=32);
 mark('Exact protected Preview',typeof expectedSha==='string'&&/^[a-f0-9]{40}$/.test(expectedSha)&&metadata.sha===expectedSha&&metadata.projectId==='prj_d5DuC65u4hSITFRC54ygswiMW9ST'&&metadata.branch===BRANCH&&metadata.environment==='preview'&&metadata.ssoProtection==='all_except_custom_domains'&&Array.isArray(metadata.crons)&&metadata.crons.length===0);
 return {status:checks.every(x=>x.status==='PASSED')?'PASSED':'BLOCKED',checks,launchApproved:false,limits:'Input policy check only. Requires values from the authorised Development key source and current hosting metadata; not deployment, managed Auth, runtime acceptance or release approval.'};
}
