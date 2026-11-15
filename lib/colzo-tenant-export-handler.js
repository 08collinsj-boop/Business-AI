import {requireBusinessMember, requireAal2, sendAuthError} from './auth.js';
import {recordAuditEvent} from './audit.js';
import {collectDraftTenantExport, PREVIEW_DATASETS, TENANT_EXPORT_PRIMARY_KEYS, TENANT_EXPORT_LIMITS} from './colzo-tenant-export-engine.js';
import {isApprovedSupabaseTarget} from './public-config-handler.js';
import {buildFictionalDraftPackage} from './colzo-tenant-export-package.js';

const DEV_TARGET = 'https://mvwseobgkexzpmmkgcxe.supabase.co';
const PREVIEW_BRANCH = 'feature/colzo-connected-workspace-20261112';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isFictionalTenantExportEnabled(env = process.env) {
  return env.COLZO_TENANT_EXPORT_PREVIEW_ENABLED === 'true'
    && env.COLZO_SCOPED_PILOT_ACCESS === 'true'
    && env.TENANCY_AUTH_ENABLED === 'true'
    && env.VERCEL_ENV === 'preview'
    && env.VERCEL_GIT_COMMIT_REF === PREVIEW_BRANCH
    && env.SUPABASE_URL === DEV_TARGET
    && UUID.test(env.COLZO_TENANT_EXPORT_FIXTURE_BUSINESS_ID || '');
}

export async function readDraftExportPage({table,businessId,fields,order,offset,limit}, env = process.env) {
  // Defense in depth: this callable reader verifies every query component,
  // not only the owner-only endpoint which normally invokes it.
  const expectedOrder = (TENANT_EXPORT_PRIMARY_KEYS[table] || ['id']).map(column => column + '.asc').join(',');
  if (!isFictionalTenantExportEnabled(env) || !env.SUPABASE_SERVICE_ROLE_KEY
    || businessId !== env.COLZO_TENANT_EXPORT_FIXTURE_BUSINESS_ID
    || !Object.hasOwn(PREVIEW_DATASETS,table) || PREVIEW_DATASETS[table] !== fields
    || order !== expectedOrder
    || !Number.isSafeInteger(offset) || offset < 0 || offset > TENANT_EXPORT_LIMITS.maxRowsPerTable
    || !Number.isSafeInteger(limit) || limit < 1 || limit > TENANT_EXPORT_LIMITS.pageSize) throw Error('Export unavailable');
  const url = new URL(`${DEV_TARGET}/rest/v1/${table}`);
  url.searchParams.set('select', fields);
  url.searchParams.set('business_id', `eq.${businessId}`);
  url.searchParams.set('order', expectedOrder);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  const response=await fetch(url,{
    method:'GET',
    headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,Accept:'application/json'},
    cache:'no-store',
    signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)throw Error('Export unavailable');
  const announced=Number(response.headers?.get?.('content-length'));
  if(Number.isFinite(announced)&&announced>1_000_000)throw Error('Export unavailable');
  const raw=await response.text();
  if(Buffer.byteLength(raw,'utf8')>1_000_000)throw Error('Export unavailable');
  let rows;try{rows=JSON.parse(raw);}catch{throw Error('Export unavailable');}
  if(!Array.isArray(rows))throw Error('Export unavailable');
  return rows;
}

export function makeTenantExportHandler({
  env=process.env, authMember=requireBusinessMember, authAal2=requireAal2,
  audit=recordAuditEvent, readPage=readDraftExportPage, approvedTarget=isApprovedSupabaseTarget
}={}) {
  return async function tenantExportHandler(req,res) {
    res.setHeader('Cache-Control','private, no-store');
    res.setHeader('Pragma','no-cache');
    res.setHeader('Vary','Authorization');
    res.setHeader('X-Robots-Tag','noindex, noarchive, nosnippet');
    res.setHeader('X-Content-Type-Options','nosniff');
    if (req.method !== 'GET') return res.status(405).json({error:'Method not allowed'});
    // Absolutely no real or unapproved tenant exports until explicitly configured.
    if (!isFictionalTenantExportEnabled(env) || !approvedTarget()) return res.status(503).json({error:'Tenant export remains disabled'});
    if (Object.hasOwn(req.query || {},'business_id')) return res.status(400).json({error:'Business selection is not permitted'});
    const params=req.query||{};
    if(Object.keys(params).some(key=>!['operation','download'].includes(key))
    ||(params.operation!==undefined&&params.operation!=='tenant-draft-export')
    ||(params.download!==undefined&&params.download!=='1'))
      return res.status(400).json({error:'Unsupported export options'});
    let auth;
    try {
      auth=await authMember(req,['owner']);
      const verified=await authAal2(req);
      if (!auth?.enforced || !verified?.enforced || verified.userId !== auth.userId
        || auth.businessId !== env.COLZO_TENANT_EXPORT_FIXTURE_BUSINESS_ID) {
        return res.status(403).json({error:'Not authorised for fictional tenant export'});
      }
    } catch(error) {return sendAuthError(res,error);}
    try {
      const result=await collectDraftTenantExport({businessId:auth.businessId,reconcile:true,
        readPage:(args)=>readPage(args,env)});
      const pkg=params.download==='1'?buildFictionalDraftPackage(result):null;
      if (!(await audit({businessId:auth.businessId,actorUserId:auth.userId,
        action:'data_exit.draft_export',resourceType:'business',resourceId:auth.businessId,
        metadata:{classes:result.exported_classes.length,complete:false,delivery:pkg?'gzip':'json'}})))
        throw Error('Export unavailable');
      if(pkg){
        res.setHeader('Content-Type',pkg.contentType);
        res.setHeader('Content-Disposition','attachment; filename="'+pkg.filename+'"');
        res.setHeader('X-Colzo-Transport-SHA256',pkg.sha256);
        res.setHeader('X-Colzo-Content-SHA256',pkg.dataSha256);
        res.setHeader('Content-Length',String(pkg.compressedBytes));
        res.setHeader('Content-Security-Policy','sandbox');
        return res.status(200).send(pkg.buffer);
      }
      return res.status(200).json(result);
    } catch {
      return res.status(503).json({error:'Tenant export could not be completed safely'});
    }
  };
}

export default makeTenantExportHandler();
