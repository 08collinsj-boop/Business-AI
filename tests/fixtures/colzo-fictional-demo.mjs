// Local PGlite-only fixtures. No Supabase client, network host, JWT or Auth session.
// This module cannot seed a managed project. It owns a new private temporary path.
import {PGlite} from '@electric-sql/pglite';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
const root=new URL('../../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
const ids={a:'10000000-0000-4000-8000-000000000001',b:'10000000-0000-4000-8000-000000000002'};
const users={a:'20000000-0000-4000-8000-000000000001',b:'20000000-0000-4000-8000-000000000002'};
const tables=['business_settings','business_configurations','leads','actions','bookings','colzo_clients','colzo_projects','colzo_quotes','business_knowledge_items'];
export async function createFictionalDemo(){
 const dir=await mkdtemp('/tmp/colzo-demo-');let db=new PGlite(dir);let closed=false;
 const fixture={ids, get db(){return db;},async reopen(){await db.close();db=new PGlite(dir);},async close(){if(!closed){closed=true;await db.close();await rm(dir,{recursive:true,force:true});}},async snapshot(){const result={};for(const t of tables)result[t]=(await db.query('SELECT * FROM public.'+t+' ORDER BY '+(t==='business_configurations'?'business_id':'id'))).rows;return result;},async readAs(alias,table){
  if(!users[alias]||!tables.includes(table))throw Error('Invalid fictional fixture selector');
  await db.exec('BEGIN');try{await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[users[alias]]);await db.exec('SET LOCAL ROLE authenticated');return(await db.query('SELECT * FROM public.'+table+' ORDER BY '+(table==='business_configurations'?'business_id':'id'))).rows;}finally{await db.exec('ROLLBACK');}
 }};
 try{
  await db.exec(await read('tests/fixtures/colzo-pilot-postgres-bootstrap.sql'));
  // These three minimal tables belong solely to this new disposable fixture.
  // Replace them with the actual source definitions before adding any demo data.
  await db.exec('DROP TABLE public.bookings,public.actions,public.business_knowledge_items;CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);');
  const ledger=JSON.parse(await read('docs/colzo-pilot-review/observed-dev-migrations-20261024.json'));
  for(const name of ['add_bookings_actions','add_business_knowledge_uploads','post_pilot_colzo_projects_quotes_clients']){
   const entry=ledger.find(x=>x.name===name);if(!entry)throw Error('Missing recorded schema dependency '+name);
   await db.exec(entry.statements.join('\n;\n')+';');
  }
  await db.exec(await read('supabase/migrations/20260916180000_add_business_creation_and_public_routes.sql'));
  await db.exec(`ALTER TABLE leads ADD COLUMN name text,ADD COLUMN email text,ADD COLUMN location text,ADD COLUMN job_type text,ADD COLUMN description text,ADD COLUMN status text DEFAULT 'New';
  CREATE SEQUENCE demo_history_id START 3;ALTER TABLE lead_history ALTER COLUMN id SET DEFAULT nextval('demo_history_id');
  ALTER TABLE lead_history ADD COLUMN lead_id bigint,ADD COLUMN action text,ADD COLUMN old_value text,ADD COLUMN new_value text;
  ALTER TABLE business_settings ADD COLUMN services text,ADD COLUMN opening_hours text,ADD COLUMN email text,ADD COLUMN phone text,ADD COLUMN address text;
  ALTER TABLE business_configurations ADD COLUMN ai_handling_mode text DEFAULT 'balanced' CHECK(ai_handling_mode IN ('human_first','balanced','ai_first')),ADD COLUMN service_areas text;
  CREATE TABLE business_audit_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,business_id uuid,action text,resource_type text,resource_id text,metadata jsonb);`);
  const payload=JSON.parse(await read('docs/colzo-pilot-review/pilot-release-management.PROPOSED.json'));
  await db.exec(payload.query);
  const manifest=JSON.parse(await read('docs/colzo-pilot-review/FICTIONAL_DEMO_RECORDS_20261026.json'));
  if(manifest.synthetic_only!==true||manifest.shared_seed_approved!==false)throw Error('Fictional fixture provenance required');
  for(const [i,alias]of ['a','b'].entries()){
   const row=manifest[alias],business=ids[alias],user=users[alias],lead=i+1;
   if(!row.customer_email.endsWith('@example.invalid'))throw Error('Only fictional example.invalid contacts supported');
   await db.query('UPDATE businesses SET name=$1 WHERE id=$2',[row.business_name,business]);
   await db.query('UPDATE business_settings SET business_name=$1,business_type=$2,services=$2,opening_hours=$3,email=$4,phone=$5,address=$6 WHERE business_id=$7',[row.business_name,row.services,row.hours,'qa-'+alias+'@example.invalid','',row.area,business]);
   await db.query("INSERT INTO business_configurations(business_id,ai_handling_mode,service_areas) VALUES($1,'balanced',$2)",[business,row.area]);
   await db.query('UPDATE leads SET name=$1,email=$2,location=$3,job_type=$4,description=$5 WHERE id=$6 AND business_id=$7',[row.customer_name,row.customer_email,row.area,row.services,'Fictional example enquiry',lead,business]);
   await db.query("SELECT colzo_pilot_private.grant_access($1,$2,$3,'Fictional fixture ownership only')",[business,user,'demo-grant-'+alias]);
   await db.query("INSERT INTO actions(business_id,lead_id,title,description,action_type) VALUES($1,$2,'Review fictional enquiry','Fictional owner action','review_enquiry')",[business,lead]);
   await db.query("SELECT public.request_colzo_pilot_booking($1,$2,'Fictional appointment request',$3,'',$4,$5,'Example only; confirmation required')",[business,lead,row.customer_name,row.customer_email,row.area]);
   await db.query('INSERT INTO colzo_clients(business_id,full_name,email,notes) VALUES($1,$2,$3,$4)',[business,row.customer_name,row.customer_email,'Fictional customer tracking']);
   await db.query('INSERT INTO colzo_projects(business_id,lead_id,title,client_name,notes) VALUES($1,$2,$3,$4,$5)',[business,lead,row.project,row.customer_name,'Fictional internal planning']);
   await db.query('INSERT INTO colzo_quotes(business_id,lead_id,title,amount_gbp,notes) VALUES($1,$2,$3,0,$4)',[business,lead,row.quote,manifest.quote_note]);
   const content=row.services+'. Hours: '+row.hours+'. '+manifest.knowledge_note;
   const source=(await db.query("INSERT INTO business_knowledge_sources(business_id,created_by,file_name,storage_path,mime_type,size_bytes,status) VALUES($1,$2,'Manual fictional fact.txt',$3,'text/plain',$4,'active') RETURNING id",[business,user,'manual/fictional-demo-'+alias,Buffer.byteLength(content)])).rows[0].id;
   await db.query("INSERT INTO business_knowledge_items(source_id,business_id,item_type,title,content,status) VALUES($1,$2,'faq','Fictional services and hours',$3,'active')",[source,business,content]);
  }
  return fixture;
 }catch(error){await fixture.close();throw error;}
}
