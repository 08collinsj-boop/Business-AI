import { requireAuthenticatedUser, requireBusinessMember, sendAuthError } from './auth.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function id(value) {
  if(!/^[1-9]\d{0,17}$/.test(String(value))) return null;
  const n=Number(value);return Number.isSafeInteger(n)?n:null;
}
async function db(path,options={}) {
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw Error('Storage configuration missing');
  const response=await fetch(url.replace(/\/+$/,'')+'/rest/v1/'+path,{
    ...options,headers:{Accept:'application/json','Content-Type':'application/json',apikey:key,Authorization:'Bearer '+key,...(options.headers||{})}
  });
  const raw=await response.text();let data;
  try{data=raw?JSON.parse(raw):null}catch{data=null}
  if(!response.ok)throw Error('Reply storage unavailable');
  return data;
}
function toPublic(row) {
  return { id:row.id,message:row.body,created_at:row.created_at };
}
export default async function handler(req,res) {
  if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
  let auth;
  try {
    auth=req.method==='POST' ? await requireBusinessMember(req,['owner','admin','member']) : await requireAuthenticatedUser(req);
  } catch(error){return sendAuthError(res,error)}
  if(!auth.enforced||!auth.userId)return res.status(403).json({error:'Authenticated tenancy is required'});
  try {
    if(req.method==='POST'){
      let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body}catch{return res.status(400).json({error:'Invalid request body'})}
      if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['lead_id','message','request_id'].includes(k)))return res.status(400).json({error:'Unsupported reply fields'});
      const lead=id(body.lead_id),message=typeof body.message==='string'?body.message.trim():'';
      if(!lead||!message||message.length>2000||!uuid.test(String(body.request_id||'')))return res.status(400).json({error:'Enter a reply and valid request ID'});
      // Service-role access bypasses RLS. Never trust a client-supplied tenant ID.
      const matching=await db('leads?id=eq.'+lead+'&business_id=eq.'+encodeURIComponent(auth.businessId)+'&select=id,business_id&limit=1');
      if(!Array.isArray(matching)||matching.length!==1||matching[0].business_id!==auth.businessId||id(matching[0].id)!==lead)return res.status(404).json({error:'Enquiry not found'});
      // Idempotency: retries use same request_id; do not overwrite previously saved text.
      const existing=await db('customer_visible_replies?business_id=eq.'+encodeURIComponent(auth.businessId)+'&request_id=eq.'+encodeURIComponent(body.request_id)+'&select=id,lead_id,business_id,body,created_at&limit=1');
      if(Array.isArray(existing)&&existing.length){
        const prior=existing[0];
        if(prior.business_id!==auth.businessId||id(prior.lead_id)!==lead||prior.body!==message)return res.status(409).json({error:'Request ID was already used'});
        return res.status(200).json({reply:toPublic(prior)});
      }
      const saved=await db('customer_visible_replies',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({business_id:auth.businessId,lead_id:lead,body:message,request_id:body.request_id,created_by:auth.userId})});
      const row=Array.isArray(saved)&&saved.length===1?saved[0]:null;
      if(!row||row.business_id!==auth.businessId||id(row.lead_id)!==lead||row.body!==message||!uuid.test(row.id))return res.status(503).json({error:'Reply save could not be confirmed'});
      return res.status(201).json({reply:toPublic(row)});
    }
    const lead=id(req.query?.lead_id);
    if(!lead)return res.status(400).json({error:'Invalid enquiry ID'});
    const grants=await db('customer_enquiry_access?customer_user_id=eq.'+encodeURIComponent(auth.userId)+'&lead_id=eq.'+lead+'&select=lead_id,business_id&limit=2');
    if(!Array.isArray(grants)||grants.length!==1||id(grants[0].lead_id)!==lead||!uuid.test(grants[0].business_id))return res.status(404).json({error:'Enquiry not found'});
    const tenant=grants[0].business_id;
    const matching=await db('leads?id=eq.'+lead+'&business_id=eq.'+encodeURIComponent(tenant)+'&select=id,business_id&limit=1');
    if(!Array.isArray(matching)||matching.length!==1||matching[0].business_id!==tenant)return res.status(404).json({error:'Enquiry not found'});
    const rows=await db('customer_visible_replies?business_id=eq.'+encodeURIComponent(tenant)+'&lead_id=eq.'+lead+'&select=id,business_id,lead_id,body,created_at&order=created_at.asc&limit=100');
    return res.status(200).json({replies:(Array.isArray(rows)?rows:[]).filter(x=>x.business_id===tenant&&id(x.lead_id)===lead).map(toPublic)});
  }catch{return res.status(503).json({error:'Reply service unavailable'})}
}
