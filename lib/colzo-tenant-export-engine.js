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
  business_settings: 'id,business_id,business_name,business_type,phone,email,address,opening_hours,services,ai_instructions,profile_image_path,profile_banner_path,created_at,updated_at',
  business_knowledge_sources: 'id,business_id,file_name,storage_path,mime_type,size_bytes,sha256,status,extracted_summary,created_at,updated_at',
  business_knowledge_items: 'id,business_id,source_id,item_type,title,content,keywords,status,created_at,updated_at',
  marketing_generations: 'id,business_id,content_type,platform,tone,request_text,extra_instructions,status,output,edited_output,approval_status,created_at,updated_at',
  marketing_publications: 'id,business_id,generation_id,platform,status,scheduled_for,published_at,created_at,updated_at',
  marketing_schedules: 'id,business_id,marketing_generation_id,platform,scheduled_for,status,created_at,updated_at',
  marketing_images: 'id,business_id,generation_id,status,provider,prompt,storage_bucket,storage_path,mime_type,width,height,created_at,updated_at',
  business_configurations: 'business_id,industry_template_id,description,website,service_areas,customer_enquiry_instructions,faqs,booking_preferences,handover_instructions,enabled_modules,onboarding_completed_at,created_at,updated_at,onboarding_step,onboarding_started_at,service_delivery_mode,ai_handling_mode',
  business_public_routes: 'id,business_id,route_type,route_value,active,created_at,updated_at',
  business_data_lifecycle_policies: 'business_id,lead_retention_days,audit_retention_days,updated_at',
  business_team_invitations: 'id,business_id,invited_email,role,status,invited_by,accepted_by,expires_at,accepted_at,created_at,updated_at',
  lead_handovers: 'id,business_id,lead_id,action_id,reason,summary,status,acknowledged_by,acknowledged_at,resolved_by,resolved_at,created_at,updated_at',
  business_legal_acceptances: 'id,business_id,actor_user_id,document_key,document_version,source,accepted_at',
  marketing_image_usage_events: 'id,business_id,generation_id,created_at',
  marketing_automation_media: 'id,business_id,role,file_name,storage_bucket,storage_path,mime_type,visual_context,last_used_at,created_by,created_at',
  marketing_automation_settings: 'business_id,enabled,mode,platform,tone,image_enabled,cadence,last_run_at,last_status,last_error_code,last_generation_id,created_at,updated_at,strategy,weekly_plan,posts_per_day,last_content_angle',
  marketing_strategy_settings: 'business_id,goals,pillars,weekly_posts,preferred_time,weekly_plan,created_at,updated_at',
  business_incident_controls: 'business_id,ai_receptionist_paused,marketing_generation_paused,marketing_publishing_paused,automatic_followups_paused,customer_submissions_paused,reason,created_at,updated_at',
  business_referral_profiles: 'business_id,referral_code,created_at,updated_at',
  business_feature_entitlements: 'business_id,feature_key,status,source,expires_at,created_at,updated_at',
  customer_complaints: 'id,business_id,lead_id,subject,description,status,response_note,responded_at,resolved_at,created_at,updated_at',
  pilot_feedback: 'id,business_id,category,page,message,app_version,status,created_at,updated_at,title',
  review_email_outbox: 'id,business_id,booking_id,customer_email,business_name,review_url,review_platform,send_after,status,attempted_at,sent_at,created_at,updated_at',
  voice_calls: 'id,business_id,direction,status,caller_number,called_number,lead_id,booking_id,action_id,handover_status,escalation_reason,transcript_summary,duration_seconds,started_at,ended_at,created_at,updated_at',
  voice_call_events: 'id,business_id,call_id,event_type,speaker,content,occurred_at,created_at',
  business_memberships: 'business_id,user_id,role,created_at',
  voice_provider_connections: 'id,business_id,provider,status,created_at,updated_at',
  voice_phone_numbers: 'id,business_id,e164_number,location_label,active,created_at,updated_at',
  business_billing_accounts: 'business_id,plan,status,trial_started_at,trial_expires_at,current_period_started_at,current_period_ends_at,cancel_at_period_end,cancelled_at,created_at,updated_at',
  business_billing_usage: 'business_id,period_started_at,metric,quantity,updated_at',
  marketing_meta_connections: 'id,business_id,provider,status,connected_at,updated_at',
  marketing_social_accounts: 'id,business_id,platform,display_name,selected,status,created_at,updated_at',
  business_referral_rewards: 'id,business_id,sequence_number,referral_threshold,status,earned_at,scheduled_at,redeemed_at',
});

// Some legitimate tenant settings tables use business_id (not id) as PK.
// One entitlement table uses (business_id, feature_key). Without the real PK,
// a pagination export could omit rows or miss duplicates; never use row order
// or a synthetic index as an identity substitute.
export const TENANT_EXPORT_PRIMARY_KEYS = Object.freeze({
  business_configurations: ['business_id'],
  business_data_lifecycle_policies: ['business_id'],
  marketing_automation_settings: ['business_id'],
  marketing_strategy_settings: ['business_id'],
  business_incident_controls: ['business_id'],
  business_referral_profiles: ['business_id'],
  business_feature_entitlements: ['business_id', 'feature_key'],
  business_memberships: ['business_id','user_id'],
  business_billing_accounts: ['business_id'],
  business_billing_usage: ['business_id','period_started_at','metric']
});

function rowKey(table, row) {
  const columns = TENANT_EXPORT_PRIMARY_KEYS[table] || ['id'];
  const key = columns.map(column => {
    const value = row[column];
    check((typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
      || (typeof value === 'string' && value.length > 0 && value.length <= 128));
    return value;
  });
  return JSON.stringify(key);
}

function sortOrderFor(table) {
  return (TENANT_EXPORT_PRIMARY_KEYS[table] || ['id']).map(column => column + '.asc').join(',');
}

export const TENANT_EXPORT_LIMITS = Object.freeze({pageSize: 200, maxRowsPerTable: 5000, maxTotalRows: 9000, maxJsonBytes: 2_000_000});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const check = (ok) => {if (!ok) throw new Error('Tenant export is unavailable or incomplete');};

export async function collectDraftTenantExport({businessId, readPage, reconcile=false}) {
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
      const page = await readPage({table, businessId, fields, order:sortOrderFor(table), offset, limit:TENANT_EXPORT_LIMITS.pageSize});
      check(Array.isArray(page) && page.length <= TENANT_EXPORT_LIMITS.pageSize);
      for (const original of page) {
        check(original && typeof original === 'object' && !Array.isArray(original) && original.business_id === businessId);
        const key = rowKey(table, original);
        check(!seen.has(key));
        seen.add(key);
        // Reject unexpected server projection instead of silently including secrets.
        check(Object.keys(original).every(key => allowed.has(key)) && allowed.has('business_id'));
        const safe = Object.fromEntries(fields.split(',').filter(field=>Object.hasOwn(original,field)).map(field=>[field,original[field]]));
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
  // Double read catches many concurrent changes, never a transactional snapshot.
  if(reconcile){
    const second=await collectDraftTenantExport({businessId,readPage,reconcile:false});
    check(JSON.stringify(data)===JSON.stringify(second.data) && JSON.stringify(counts)===JSON.stringify(second.counts));
  }
  // Never label this a complete export: no Storage bytes, Auth, legal holds,
  // private audit, shared identities, credentials or independently stable snapshot.
  return {
    format:'colzo-fictional-tenant-draft-v1', business_id:businessId,
    export_complete:false, snapshot_consistent:false, deletion_authorised:false,
    reconciliation_passed:reconcile===true,reconciliation_method:reconcile?'two_sequential_reads_not_transactional':'not_performed',
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
