import {PUBLIC_DATA_EXIT_SCOPE, NON_PUBLIC_EXIT_DOMAINS} from './colzo-data-exit-coverage.js';

// Deliberately limited, reviewed fields: never export raw OAuth tokens,
// provider credentials, billing events, shared Auth users or platform data.
// Exports are draft snapshots, NOT a full customer data-exit or erasure.
export const PREVIEW_DATASETS = Object.freeze({
  leads: 'id,business_id,name,phone,email,location,job_type,description,urgency,qualified,created_at,estimated_value,notes,priority,follow_up_date,status,updated_at',
  lead_history: 'id,business_id,lead_id,action,old_value,new_value,created_at',
  bookings: 'id,business_id,lead_id,title,customer_name,customer_phone,customer_email,starts_at,ends_at,location,status,notes,source,created_at,updated_at',
  actions: 'id,business_id,lead_id,booking_id,title,description,action_type,due_at,priority,status,completed_at,created_at,updated_at',
  colzo_clients: 'id,business_id,full_name,email,phone,notes,created_at,updated_at',
  colzo_projects: 'id,business_id,lead_id,title,client_name,status,progress,notes,created_at,updated_at',
  colzo_quotes: 'id,business_id,lead_id,title,amount_gbp,notes,status,created_at,updated_at',
  business_settings: 'id,business_id,business_name,business_type,phone,email,address,opening_hours,services,ai_instructions,created_at,updated_at',
  business_knowledge_sources: 'id,business_id,file_name,storage_path,mime_type,size_bytes,sha256,status,extracted_summary,created_at,updated_at',
  business_knowledge_items: 'id,business_id,source_id,item_type,title,content,keywords,status,created_at,updated_at',
  marketing_generations: 'id,business_id,content_type,platform,tone,request_text,extra_instructions,status,output,edited_output,approval_status,created_at,updated_at',
  marketing_publications: 'id,business_id,generation_id,platform,status,scheduled_for,published_at,created_at,updated_at',
  marketing_schedules: 'id,business_id,marketing_generation_id,platform,scheduled_for,status,created_at,updated_at',
  marketing_images: 'id,business_id,generation_id,status,provider,prompt,storage_bucket,storage_path,mime_type,width,height,created_at,updated_at',
});

export const TENANT_EXPORT_LIMITS = Object.freeze({pageSize: 200, maxRowsPerTable: 5000, maxTotalRows: 9000, maxJsonBytes: 2_000_000});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const check = (ok) => {if (!ok) throw new Error('Tenant export is unavailable or incomplete');};

export async function collectDraftTenantExport({businessId, readPage}) {
  check(UUID.test(String(businessId || '')) && typeof readPage === 'function');
  const data = Object.create(null);
  const counts = Object.create(null);
  let totalRows = 0;
  let jsonBytes = 0;
  for (const [table, fields] of Object.entries(PREVIEW_DATASETS)) {
    const allowed = new Set(fields.split(','));
    const seen = new Set();
    const rows = [];
    let offset = 0;
    for (;;) {
      check(offset < TENANT_EXPORT_LIMITS.maxRowsPerTable + TENANT_EXPORT_LIMITS.pageSize);
      const page = await readPage({table, businessId, fields, offset, limit:TENANT_EXPORT_LIMITS.pageSize});
      check(Array.isArray(page) && page.length <= TENANT_EXPORT_LIMITS.pageSize);
      for (const original of page) {
        check(original && typeof original === 'object' && !Array.isArray(original) && original.business_id === businessId);
        const id = original.id;
        check((typeof id === 'number' && Number.isSafeInteger(id) && id > 0) || (typeof id === 'string' && id.length > 0 && id.length <= 80));
        check(!seen.has(String(id)));
        seen.add(String(id));
        // Reject unexpected server projection instead of silently including secrets.
        check(Object.keys(original).every(key => allowed.has(key)) && allowed.has('business_id'));
        const safe = Object.fromEntries(Object.entries(original).filter(([key]) => allowed.has(key)));
        jsonBytes += Buffer.byteLength(JSON.stringify(safe), 'utf8');
        check(jsonBytes <= TENANT_EXPORT_LIMITS.maxJsonBytes);
        rows.push(safe);
        totalRows++;
        check(rows.length <= TENANT_EXPORT_LIMITS.maxRowsPerTable && totalRows <= TENANT_EXPORT_LIMITS.maxTotalRows);
      }
      if (page.length < TENANT_EXPORT_LIMITS.pageSize) break;
      offset += page.length;
    }
    data[table] = rows;
    counts[table] = rows.length;
  }
  // Never label this a complete export: no Storage bytes, Auth, legal holds,
  // private audit, shared identities, credentials or independently stable snapshot.
  return {
    format:'colzo-fictional-tenant-draft-v1', business_id:businessId,
    export_complete:false, snapshot_consistent:false, deletion_authorised:false,
    exported_classes:Object.keys(PREVIEW_DATASETS), counts, data,
    omitted_public_tables:PUBLIC_DATA_EXIT_SCOPE.map(x=>x.name).filter(name => !Object.hasOwn(PREVIEW_DATASETS,name)),
    missing_nonpublic_domains:[...NON_PUBLIC_EXIT_DOMAINS],
    requires_independent_recovery:true, note:'PARTIAL DEVELOPMENT REVIEW ONLY — NOT A FULL DATA EXIT'
  };
}

// An intentionally inert deletion gate. No rows can be deleted by this module.
export function planTenantDeletion({businessId, restoreVerified=false, approved=false}={}) {
  check(UUID.test(String(businessId || '')));
  return Object.freeze({business_id:businessId, executable:false, deletion_performed:false,
    blockers:[...(!restoreVerified?['independent_backup_restore_unverified']:[]),...(!approved?['explicit_destructive_approval_missing']:[]),
      'transactional_tenant_erasure_unimplemented','auth_storage_shared_users_unverified','legal_holds_unresolved']});
}
