#!/usr/bin/env node
/**
 * Development Preview metadata preflight.
 * GET requests only; never registers users, invokes AI or modifies data.
 * This report is NOT a go/no-go certificate and deliberately omits secrets.
 */
import {pathToFileURL} from 'node:url';

const EXPECTED_DEV='mvwseobgkexzpmmkgcxe';
const PROJECT_PATTERN=/^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

export function normalisePreviewUrl(input){
  const raw=String(input||'').trim();
  const url=new URL(raw);
  if(!PROJECT_PATTERN.test(url.origin)||url.username||url.password||url.pathname!=='/'||url.search||url.hash||
    url.hostname.includes('pilot')||url.hostname.includes('production')){
    throw new Error('Use an explicit Development Vercel Preview origin, not a public or Pilot domain.');
  }
  return url.origin;
}
function bool(v){return v===true;}
function result(name,ok,reason){return {name,status:ok?'PASS':'BLOCKED',reason:ok?'':reason};}

export async function checkPreview({previewUrl,fetchFn=fetch}){
  const origin=normalisePreviewUrl(previewUrl);
  const checks=[];
  const request=async path=>{
    try{
      const res=await fetchFn(origin+path,{method:'GET',headers:{Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(10000)});
      if(!res.ok)return {ok:false,status:res.status};
      const data=await res.json();
      return {ok:true,data,headers:res.headers};
    }catch{return {ok:false,status:null}}
  };
  const health=await request('/api/health');
  checks.push(result('API health',health.ok&&health.data?.status==='ok','Health endpoint is not healthy or requires Preview authentication.'));
  const conf=await request('/api/public-config');
  const configured=conf.ok&&conf.data?.frontendAuthEnabled===true&&
    String(conf.data?.supabaseUrl||'').includes(EXPECTED_DEV)&&
    typeof conf.data?.supabaseAnonKey==='string'&&conf.data.supabaseAnonKey.length>10;
  checks.push(result('Dev authentication target',configured,'Auth unavailable, key missing or Supabase project does not match the approved Dev project.'));
  const legal=await request('/api/legal-public');
  const identity=legal.ok&&bool(legal.data?.legal?.identity_configured)&&legal.data.legal.trading_name==='Colzo'&&legal.data.legal.operator_type==='sole_trader';
  checks.push(result('Approved legal identity metadata',identity,'Sole-trader legal identity not complete in this exact Preview.'));
  const business=await request('/api/public-business?business=colzo');
  checks.push(result('Public Colzo business',business.ok&&!!business.data?.business,'Public Colzo profile missing or unreachable.'));
  checks.push(result('Assistant availability flag',business.ok&&business.data?.business?.assistant_available===true,
    'Public assistant is unavailable; verify owner DPA, entitlement and service configuration.'));
  const headers=health.headers;
  const secure=health.ok&&headers?.get?.('x-content-type-options')==='nosniff'&&
    headers?.get?.('referrer-policy')==='strict-origin-when-cross-origin';
  checks.push(result('HTTP hardening headers',secure,'Expected Dev response headers are absent or unverified.'));
  return {
    kind:'read-only Development metadata check',
    preview:origin,
    expectedSupabaseProject:EXPECTED_DEV,
    checks,
    passed:checks.filter(c=>c.status==='PASS').length,
    blocked:checks.filter(c=>c.status==='BLOCKED').length,
    launchApproved:false,
    limits:'No authentication, tenant writes, customer registration, billing, storage, mobile Safari or recovery was tested.'
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const url=process.argv[2]||process.env.COLZO_PREFLIGHT_URL;
  try{
    const report=await checkPreview({previewUrl:url});
    process.stdout.write(JSON.stringify(report,null,2)+'\n');
    if(report.blocked)process.exitCode=2;
  }catch{
    process.stderr.write('Preflight could not run: use an explicit, valid Development Preview URL.\n');
    process.exitCode=1;
  }
}
