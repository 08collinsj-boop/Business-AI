import {PREVIEW_DATASETS} from './colzo-tenant-export-engine.js';
import {PUBLIC_DATA_EXIT_SCOPE} from './colzo-data-exit-coverage.js';

// Excluded from generic customer export pending separate owner and legal review.
// The table count is not proof of data-return completeness.
export const DEFERRED_PUBLIC_DATA_CLASSES=Object.freeze({
 businesses:'Tenant primary identity must be exported through separate owner-verified access.',
 business_audit_events:'Audit actor identities and metadata require statutory retention and redaction review.',
 public_enquiry_rate_limit_buckets:'Anti-abuse fingerprints are security records not customer content.',
 stripe_webhook_events:'Provider webhook events include billing secrets or internal errors requiring retention review.',
 marketing_meta_oauth_states:'OAuth replay-protection hashes must never be exposed in customer exports.',
 customer_enquiry_access:'Shared Auth customer identity and cross-tenant ownership needs special treatment.',
 colzo_whatsapp_demo_threads:'Unstructured conversation content must be explicitly verified fictional and classified.',
 colzo_pilot_access:'Operator-granted pilot status is a privileged platform record.',
 user_legal_acceptances:'User-scoped legal history may apply to multiple businesses.',
 customer_profiles:'Shared Auth customer profile may concern several businesses.',
 business_referrals:'Cross-business relationship cannot be erased/exported for one tenant without review.',
 platform_incident_controls:'Global protection controls are not one business’s records.',
 pilot_free_access_config:'Global platform-wide pilot access configuration is not tenant data.'
});
export function classifyTenantExit() {
 const scope=PUBLIC_DATA_EXIT_SCOPE.map(t=>t.name);
 const allowed=scope.filter(t=>Object.hasOwn(PREVIEW_DATASETS,t)).map(table=>({table,classification:'redacted_draft_only'}));
 const deferred=scope.filter(t=>Object.hasOwn(DEFERRED_PUBLIC_DATA_CLASSES,t)).map(table=>({table,reason:DEFERRED_PUBLIC_DATA_CLASSES[table]}));
 const unaccounted=[...scope.filter(t=>!Object.hasOwn(PREVIEW_DATASETS,t)&&!Object.hasOwn(DEFERRED_PUBLIC_DATA_CLASSES,t)),
  ...Object.keys({...PREVIEW_DATASETS,...DEFERRED_PUBLIC_DATA_CLASSES}).filter(t=>!scope.includes(t))];
 return Object.freeze({totalPublic:scope.length,allowed,deferred,unaccounted,fullBusinessExportAvailable:false});
}
const RELATIVE=/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\/\/)[a-zA-Z0-9_.+@\-\/]{1,512}$/;
const BUCKET=/^[a-zA-Z0-9][a-zA-Z0-9_.\-]{0,127}$/;
export function buildStorageAttachmentManifest({businessId,data}={}) {
 if(typeof businessId!=='string'|| !data||typeof data!=='object'||Array.isArray(data))throw Error('Invalid manifest');
 const refs=[['business_knowledge_sources','storage_path',null],['marketing_images','storage_path','storage_bucket'],
  ['marketing_automation_media','storage_path','storage_bucket'],['business_settings','profile_image_path',null],
  ['business_settings','profile_banner_path',null]];
 const items=[];
 for(const [table,pathField,bucketField] of refs){
  const rows=data[table]??[];
  if(!Array.isArray(rows))throw Error('Invalid manifest');
  for(const row of rows){
   if(!row||typeof row!=='object'||Array.isArray(row)||row.business_id!==businessId)throw Error('Invalid manifest tenant');
   const path=row[pathField];
   if(path==null||path==='')continue;
   const bucket=bucketField?row[bucketField]:null;
   if(typeof path!=='string'||!RELATIVE.test(path)|| (bucket!=null&&(typeof bucket!=='string'||!BUCKET.test(bucket))))
    throw Error('Invalid storage reference — export unavailable');
   items.push({table,source_record_id:row.id??null,attribute:pathField,storage_path:path,bucket:bucket??null,
    storage_bytes_included:false,independently_verified:false,safe_to_download:false});
  }
 }
 return Object.freeze({items,storage_bytes_included:false,independently_verified:false,
  unresolved_buckets:items.filter(item=>!item.bucket).length,
  note:'Metadata and references only; real object bytes not accessed or verified.'});
}
