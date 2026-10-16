/* Development-only Colzo WhatsApp persistence. NO live WhatsApp webhook,
 * outbound send path, phone numbers or real customer messages.
 * All stored records are immutable synthetic seed data except staff handover.
 */
import {requireBusinessAdmin, requireAal2, sendAuthError} from './auth.js';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FIXTURE_KEYS=new Set(['demo-a','demo-b','demo-c']);
const FIXTURES=Object.freeze([
 {fixture_key:'demo-a',customer_label:'Sample customer A',tag:'Booking request',
  messages:['Hi, could I book a visit for Friday?','Do you have availability in the afternoon?'],
  draft:'Thanks for reaching out. A team member can confirm available appointment times.'},
 {fixture_key:'demo-b',customer_label:'Sample customer B',tag:'Human handover',
  messages:['Could somebody call me back about my enquiry?'],draft:null,state:'human'},
 {fixture_key:'demo-c',customer_label:'Sample customer C',tag:'Opening hours',
  messages:['Are you open on Saturdays?'],
  draft:'I will check the approved opening hours before answering.'}
]);
// Fail closed even if a shared Vercel environment accidentally enables the flag.
const DEV_DB_HOST='mvwseobgkexzpmmkgcxe.supabase.co';
const ENABLED=()=>{
 try{return process.env.COLZO_WHATSAPP_PERSISTENCE_ENABLED==='true'&&
  new URL(process.env.SUPABASE_URL).host===DEV_DB_HOST;}
 catch{return false;}
};
const noCache=res=>{res.setHeader?.('Cache-Control','no-store');res.setHeader?.('X-Content-Type-Options','nosniff');};
const payload=req=>{
 try{
  const v=typeof req.body==='string'?JSON.parse(req.body):req.body??{};
  return v&&typeof v==='object'&&!Array.isArray(v)?v:null;
 }catch{return null;}
};
const safeError=(res)=>res.status(503).json({error:'Development inbox storage unavailable'});
async function db(path,opts={}){
 const url=process.env.SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error('Development inbox storage is not configured');
 const response=await fetch(url.replace(/\/+$/,'')+'/rest/v1/'+path,{
  ...opts,headers:{'Content-Type':'application/json',apikey:key,
  Authorization:'Bearer '+key,...(opts.headers||{})}
 });
 const raw=await response.text();let data=null;
 try{data=raw?JSON.parse(raw):null;}catch{throw Error('Invalid storage response');}
 if(!response.ok)throw Error('Development inbox storage request failed');
 return data;
}
export function createColzoWhatsAppInboxHandler({
 enabled=ENABLED,requireAdmin=requireBusinessAdmin,
 requireMfa=requireAal2,request=db
}={}){
 return async function handler(req,res){
  noCache(res);
  if(!enabled())return res.status(404).json({error:'Not found'});
  if(!['GET','POST','PATCH'].includes(req.method))
   return res.status(405).json({error:'Method not allowed'});
  // Explicit strict opt-in: never fall through into legacy auth-disabled mode.
  if(process.env.TENANCY_AUTH_ENABLED!=='true' && requireAdmin===requireBusinessAdmin)
   return res.status(503).json({error:'Secure business authentication required'});
  let auth;
  try{
   auth=await requireAdmin(req);
   if(!auth?.enforced||!UUID.test(auth.businessId||'')||!['owner','admin'].includes(auth.role))
    return res.status(403).json({error:'Authorised business administrator required'});
   if(req.method!=='GET')await requireMfa(req);
  }catch(error){return sendAuthError(res,error);}
  const businessId=auth.businessId;
  const businessFilter='business_id=eq.'+encodeURIComponent(businessId);
  try{
   if(req.method==='GET'){
    const records=await request('colzo_whatsapp_demo_threads?'+businessFilter+
     '&select=fixture_key,customer_label,tag,messages,draft,state,updated_at,received_at'+
     '&order=received_at.asc&limit=50');
    if(!Array.isArray(records))return safeError(res);
    return res.status(200).json({mode:'synthetic_persistent',connected:false,canSend:false,items:records});
   }
   const body=payload(req);
   if(!body)return res.status(400).json({error:'Invalid request body'});
   if(req.method==='POST'){
    // Only these fixed fictional messages may ever enter this table.
    // No caller-controlled content, customer address or provider identifiers.
    if(Object.keys(body).length)return res.status(400).json({error:'Demo seed does not accept custom fields'});
    const fixtures=FIXTURES.map(f=>({
     business_id:businessId,fixture_key:f.fixture_key,
     customer_label:f.customer_label,tag:f.tag,messages:f.messages,
     state:f.state||'review',draft:f.draft,synthetic:true
    }));
    const result=await request('colzo_whatsapp_demo_threads?on_conflict=business_id,fixture_key',
     {method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},
      body:JSON.stringify(fixtures)});
    if(!Array.isArray(result))return safeError(res);
    return res.status(200).json({mode:'synthetic_persistent',inserted:result.length,canSend:false});
   }
   const {fixture_key:fixtureKey,state,expected_updated_at:expected}=body;
   if(Object.keys(body).sort().join(',')!=='expected_updated_at,fixture_key,state'||
      !FIXTURE_KEYS.has(fixtureKey)||state!=='human'||
      typeof expected!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(expected)||
      !Number.isFinite(Date.parse(expected))||new Date(expected).toISOString()!==expected)
    return res.status(400).json({error:'Invalid handover request'});
   // Atomic optimistic guard, tenant and original review state in one PATCH.
   const next=new Date(Math.max(Date.now(),Date.parse(expected)+1)).toISOString();
   const path='colzo_whatsapp_demo_threads?'+businessFilter+
     '&fixture_key=eq.'+encodeURIComponent(fixtureKey)+
     '&state=eq.review&updated_at=eq.'+encodeURIComponent(expected)+
     '&select=fixture_key,customer_label,tag,messages,draft,state,updated_at,received_at';
   const changed=await request(path,{method:'PATCH',headers:{Prefer:'return=representation'},
    body:JSON.stringify({state:'human',draft:null,updated_at:next})});
   if(!Array.isArray(changed))return safeError(res);
   if(changed.length!==1)return res.status(409).json({error:'Conversation changed. Refresh before trying again.'});
   return res.status(200).json({mode:'synthetic_persistent',item:changed[0],canSend:false});
  }catch{return safeError(res);}
 };
}
export default createColzoWhatsAppInboxHandler();
