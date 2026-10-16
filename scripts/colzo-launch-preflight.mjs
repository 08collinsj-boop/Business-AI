/* Colzo public launch preflight: read-only, no sign-in, tokens or API writes. */
import {pathToFileURL} from 'node:url';

const LEGAL = [
  '/legal/index.html','/legal/terms.html','/legal/privacy.html','/legal/dpa.html',
  '/legal/acceptable-use.html','/legal/storage.html','/legal/subprocessors.html','/legal/data-deletion.html'
];
function validate(origin, expectedRef){
 const url=new URL(origin);
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('Provide a deployment origin without credentials or query');
 const local=['localhost','127.0.0.1'].includes(url.hostname);
 if(url.protocol!=='https:' && !(local&&url.protocol==='http:'))throw Error('Public preview must use HTTPS');
 if(!/^[a-z0-9]{20}$/.test(expectedRef||''))throw Error('Specify the expected Supabase project ID');
 return url.origin;
}
export async function checkLaunch({origin,expectedRef,fetcher=fetch}){
 const base=validate(origin,expectedRef),checks=[];
 const mark=(name,condition)=>checks.push({name,status:condition===null?'UNVERIFIED':condition?'PASS':'BLOCKED'});
 async function get(path){
  try{
   const response=await fetcher(base+path,{method:'GET',redirect:'error',cache:'no-store',
    headers:{Accept:path==='/'||path.startsWith('/legal/')?'text/html':'application/json'},
    signal:AbortSignal.timeout(9000)});
   return response.ok?response:null;
  }catch{return null}
 }
 async function json(path){const response=await get(path);try{return await response?.json()}catch{return null}}
 // Public anonymous checks: a missing route, unexpected success, redirect, or
 // network error must never be treated as proof of tenant isolation.
 async function protectedStatus(path){
  try{
   const response=await fetcher(base+path,{method:'GET',redirect:'error',cache:'no-store',
    headers:{Accept:'application/json'},signal:AbortSignal.timeout(9000)});
   if(response.status===401||response.status===403)return true;
   if(response.status===429||response.status>=500)return null;
   return false;
  }catch{return null;}
 }
 const shellResponse=await get('/');
 const shellHtml=shellResponse?await shellResponse.text():'';
 mark('Colzo owner shell deployed',shellResponse?
  /<title[^>]*>[^<]*\bColzo\b/i.test(shellHtml)&&/id=[\"']colzoOwner[\"']/.test(shellHtml):null);
 mark('Protected business onboarding',await protectedStatus('/api/business-onboarding'));
 mark('Protected Colzo records',await protectedStatus('/api/colzo-records?resource=clients'));
 mark('Protected records dispatcher',await protectedStatus('/api/operations?operation=colzo-records&resource=clients'));
 const health=await json('/api/health');
 mark('Health endpoint',health?health.status==='ok':null);
 const config=await json('/api/public-config');
 mark('Owner authentication enabled',config?config.frontendAuthEnabled===true:null);
 mark('Correct Supabase project',config?config.supabaseUrl==='https://'+expectedRef+'.supabase.co':null);
 const identity=(await json('/api/legal-public'))?.legal;
 mark('Approved public operator identity',identity?identity.identity_configured===true:null);
 mark('Operator is a sole trader',identity?identity.operator_type==='sole_trader':null);
 mark('No limited-company number',identity?!identity.company_number:null);
 for(const path of LEGAL){
  const response=await get(path);
  const html=response?await response.text():'';
  const title=html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]||'';
  mark('Colzo legal page '+path,response?Boolean(/\bColzo\b/i.test(title)&&!/\bBusiness\s+AI\b/i.test(html)):null);
 }
 return {status:checks.every(c=>c.status==='PASS')?'PASS':checks.some(c=>c.status==='BLOCKED')?'BLOCKED':'UNVERIFIED',
  checks,note:'Public read-only checks. This is not legal signoff, secure-backup verification or authenticated customer acceptance.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{
  const n=x.indexOf('=');return[x.slice(2,n),x.slice(n+1)];
 }));
 checkLaunch({origin:args.url,expectedRef:args['expected-project']})
  .then(result=>{console.log(JSON.stringify(result,null,2));if(result.status!=='PASS')process.exitCode=1})
  .catch(err=>{console.error('Preflight blocked: '+err.message);process.exitCode=2});
}