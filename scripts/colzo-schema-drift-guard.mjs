/* Dev-only schema drift analysis from a metadata snapshot. NO database access/writes. */
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const DEV_REF='mvwseobgkexzpmmkgcxe';
const COLUMNS=Object.freeze({
 colzo_clients:[
  ['id','uuid','NO'],['business_id','uuid','NO'],['full_name','text','NO'],
  ['email','text','NO'],['phone','text','NO'],['notes','text','NO'],
  ['created_at','timestamp with time zone','NO'],['updated_at','timestamp with time zone','NO']],
 colzo_projects:[
  ['id','uuid','NO'],['business_id','uuid','NO'],['lead_id','bigint','YES'],
  ['title','text','NO'],['client_name','text','NO'],['status','text','NO'],
  ['progress','integer','NO'],['notes','text','NO'],
  ['created_at','timestamp with time zone','NO'],['updated_at','timestamp with time zone','NO']],
 colzo_quotes:[
  ['id','uuid','NO'],['business_id','uuid','NO'],['lead_id','bigint','NO'],
  ['title','text','NO'],['amount_gbp','numeric','NO'],['notes','text','NO'],
  ['status','text','NO'],['created_at','timestamp with time zone','NO'],
  ['updated_at','timestamp with time zone','NO']],
 colzo_whatsapp_demo_threads:[
  ['business_id','uuid','NO'],['fixture_key','text','NO'],
  ['customer_label','text','NO'],['tag','text','NO'],
  ['messages','jsonb','NO'],['draft','text','YES'],
  ['state','text','NO'],['synthetic','boolean','NO'],
  ['received_at','timestamp with time zone','NO'],
  ['updated_at','timestamp with time zone','NO']]
});
const INDEXES=Object.freeze({
 'clients-business-index':['colzo_clients_business_idx','(business_id, full_name)'],
 'projects-tenant-index':['colzo_projects_tenant_status_idx','(business_id, status, created_at DESC)'],
 'quotes-tenant-index':['colzo_quotes_tenant_lead_idx','(business_id, lead_id, created_at DESC)'],
 'whatsapp-tenant-index':['colzo_wa_demo_tenant_recent_idx','(business_id, received_at DESC)']
});

function validate(evidence) {
 if(!evidence||evidence.projectRef!==DEV_REF)throw Error('Snapshot is not for expected Dev project');
 if(!['columns','roles','constraints','indexes','policies'].every(k=>Array.isArray(evidence[k])))throw TypeError('Missing required read-only catalogue evidence');
 if(evidence.containsCustomerRows!==false||evidence.evidenceType!=='read-only-postgres-catalog')throw Error('Untrusted or unsafe catalogue source');
}
function hasValue(text,needle){return typeof text==='string'&&text.includes(needle)}
function shortName(table){return table.replace(/^colzo_/,'').replace(/_demo_threads$/,'');}

export function assessColzoCatalog(evidence){
 validate(evidence);
 const checks=[];
 const add=(id,pass)=>checks.push({id,status:pass===true?'PASS':'FAIL'});
 for(const [table,cols] of Object.entries(COLUMNS)){
  const key=shortName(table);
  const role=evidence.roles.find(x=>x.table_name===table);
  add(key+'-rls',role?.rls_enabled===true);
  const expectedRole=table==='colzo_whatsapp_demo_threads';
  add(key+'-role-deny',!!role&&role.anon_select===false&&role.anon_insert===false&&role.anon_update===false
    &&role.authenticated_select===expectedRole&&role.authenticated_insert===false&&role.authenticated_update===false);
  for(const [name,type,nullable] of cols){
   const column=evidence.columns.find(x=>x.table_name===table&&x.column_name===name);
   add(key+'-column-'+name,!!column&&column.data_type===type&&column.is_nullable===nullable);
  }
 }
 const money=evidence.columns.find(x=>x.table_name==='colzo_quotes'&&x.column_name==='amount_gbp');
 add('quotes-gbp-precision',!!money&&Number(money.numeric_precision)===12&&Number(money.numeric_scale)===2);
 for(const [id,[name,fragment]] of Object.entries(INDEXES)){
  const index=evidence.indexes.find(x=>x.name===name);
  add(id,!!index&&hasValue(index.definition,fragment));
 }
 for(const [key,table] of [['projects','colzo_projects'],['quotes','colzo_quotes']]){
  const fk=evidence.constraints.find(x=>x.name===table+'_lead_tenant_fkey'&&x.kind==='f');
  add(key+'-tenant-foreign-key',!!fk
    &&hasValue(fk.definition,'FOREIGN KEY (lead_id, business_id) REFERENCES leads(id, business_id) ON DELETE RESTRICT'));
 }
 const synthetic=evidence.constraints.find(x=>x.name==='colzo_whatsapp_demo_threads_synthetic_check'&&x.kind==='c');
 add('whatsapp-synthetic-only-check',!!synthetic&&hasValue(synthetic.definition,'synthetic'));
 const handover=evidence.constraints.find(x=>x.name==='colzo_whatsapp_human_has_no_draft'&&x.kind==='c');
 add('whatsapp-human-no-draft-check',!!handover&&hasValue(handover.definition,"'human'")&&hasValue(handover.definition,'draft IS NULL'));
 const policies=evidence.policies.filter(x=>x.table_name==='colzo_whatsapp_demo_threads');
 add('whatsapp-owner-admin-policy',policies.length===1&&policies[0].name==='colzo whatsapp admin read synthetic demo'
  &&policies[0].cmd==='SELECT'&&hasValue(policies[0].roles,'authenticated')
  &&hasValue(policies[0].qual,'business_memberships')&&hasValue(policies[0].qual,'auth.uid()')
  &&hasValue(policies[0].qual,"'owner'")&&hasValue(policies[0].qual,"'admin'"));
 add('no-public-colzo-record-policies',evidence.policies.every(x=>x.table_name==='colzo_whatsapp_demo_threads'));
 const failed=checks.filter(x=>x.status==='FAIL');
 return {projectRef:DEV_REF,evidenceAtUTC:evidence.observedAtUTC,status:failed.length?'SCHEMA_MISMATCH':'SNAPSHOT_MATCH',
  liveVerified:false,checked:checks.length,failed:failed.length,checks,
  notice:'Historical read-only metadata snapshot, not a currently authenticated tenant access test or release approval.'};
}

export function assessBackupInventory(evidence){
 if(!evidence||evidence.projectRef!==DEV_REF)throw Error('Backup status is not for expected Dev project');
 const b=evidence.backupInventory;
 if(!b||typeof b!=='object')throw TypeError('Missing backup metadata');
 const count=Number.isSafeInteger(b.backups_count)&&b.backups_count>=0?b.backups_count:null;
 const blockers=[];
 if(count===0)blockers.push('No listed provider-managed database backup');
 else if(count===null)blockers.push('Provider-managed backup inventory could not be verified');
 if(b.pitr_enabled!==true)blockers.push('Point-in-time recovery disabled');
 // A listing is never the same as a verified restorable backup.
 blockers.push('No isolated database and Storage restore drill verified');
 return {projectRef:DEV_REF,evidenceAtUTC:evidence.observedAtUTC,
  status:count===0?'NO_RESTORABLE_BACKUP_VERIFIED':'RESTORE_NOT_VERIFIED',
  listedBackups:count,pitrEnabled:b.pitr_enabled===true,
  walgEnabledIsBackupProof:false,blockers,
  notice:'A WAL-G internal flag, or even a listed backup, never proves Storage object recovery or restoration.'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const input=process.argv[2];
 if(!input)throw Error('Pass a local metadata snapshot JSON path');
 const data=JSON.parse(readFileSync(path.resolve(input),'utf8'));
 const catalog=assessColzoCatalog(data),backup=assessBackupInventory(data);
 console.log(JSON.stringify({catalog,backup},null,2));
 if(catalog.status!=='SNAPSHOT_MATCH'||backup.status!=='RESTORE_VERIFIED')process.exitCode=1;
}
