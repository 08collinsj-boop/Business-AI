#!/usr/bin/env node
/**
 * Development Preview metadata preflight.
 * GET requests only; never registers users, invokes AI or modifies data.
 * This report is NOT a go/no-go certificate and deliberately omits secrets.
 */
import {pathToFileURL} from 'node:url';
import {isApprovedSupabaseTarget,isBrowserSafeSupabaseKey} from '../lib/public-config-handler.js';

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

export async function checkPreview({previewUrl,businessSlug='colzo',fetchFn=fetch}){
  const origin=normalisePreviewUrl(previewUrl);
  if(typeof businessSlug!=='string'||!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(businessSlug))throw new Error('Use a valid approved business slug.');
  const checks=[];
  const request=async (path,parseJSON=true)=>{
    try{
      const res=await fetchFn(origin+path,{method:'GET',headers:{Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(10000)});
      if(!res.ok)return {ok:false,status:res.status};
      const data=parseJSON?await res.json():undefined;
      return {ok:true,data,headers:res.headers};
    }catch{return {ok:false,status:null}}
  };
  const health=await request('/api/health');
  checks.push(result('API health',health.ok&&health.data?.status==='ok','Health endpoint is not healthy or requires Preview authentication.'));
  const conf=await request('/api/public-config');
  const configured=conf.ok&&conf.data?.frontendAuthEnabled===true&&
    isApprovedSupabaseTarget({expectedRef:EXPECTED_DEV,supabaseUrl:conf.data?.supabaseUrl})&&
    isBrowserSafeSupabaseKey(conf.data?.supabaseAnonKey);
  checks.push(result('Dev authentication target',configured,'Auth unavailable, key missing or Supabase project does not match the approved Dev project.'));
  const legal=await request('/api/legal-public');
  const identity=legal.ok&&bool(legal.data?.legal?.identity_configured)&&legal.data.legal.trading_name==='Colzo'&&typeof legal.data.legal.operator_type==='string'&&legal.data.legal.operator_type.trim().length>0;
  checks.push(result('Configured legal identity metadata',identity,'Operator identity not configured in this exact Preview; this check is not legal approval.'));
  const business=await request('/api/public-business?business='+encodeURIComponent(businessSlug));
  checks.push(result('Selected public business',business.ok&&!!business.data?.business,'Selected fictional business profile missing or unreachable.'));
  checks.push(result('Assistant availability flag',business.ok&&business.data?.business?.assistant_available===true,
    'Public assistant is unavailable; verify owner DPA, entitlement and service configuration.'));
  const privateResults=await Promise.all(['/api/audit-log','/api/team'].map(path=>request(path,false)));
  checks.push(result('Anonymous private API denial',health.ok&&configured&&privateResults.every(r=>!r.ok&&[401,403].includes(r.status)),
    'Application metadata was not reached or private routes did not explicitly deny anonymous access. Private response bodies were not read.'));
  const headers=health.headers;
  const secure=health.ok&&headers?.get?.('x-content-type-options')==='nosniff'&&
    headers?.get?.('referrer-policy')==='strict-origin-when-cross-origin';
  checks.push(result('HTTP hardening headers',secure,'Expected Dev response headers are absent or unverified.'));
  return {
    kind:'read-only Development metadata check',
    preview:origin,
    expectedSupabaseProject:EXPECTED_DEV,
    businessSlug,
    checks,
    passed:checks.filter(c=>c.status==='PASS').length,
    blocked:checks.filter(c=>c.status==='BLOCKED').length,
    launchApproved:false,
    limits:'Anonymous private-route denial alone does not distinguish a selective gateway denial from application enforcement; no managed authentication, tenant writes, customer registration, billing, storage, mobile Safari or recovery was tested.'
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const url=process.argv[2]||process.env.COLZO_PREFLIGHT_URL;
  try{
    const report=await checkPreview({previewUrl:url,businessSlug:process.argv[3]||process.env.COLZO_PREFLIGHT_BUSINESS_SLUG||'colzo'});
    process.stdout.write(JSON.stringify(report,null,2)+'\n');
    if(report.blocked)process.exitCode=2;
  }catch{
    process.stderr.write('Preflight could not run: use an explicit, valid Development Preview URL.\n');
    process.exitCode=1;
  }
}
