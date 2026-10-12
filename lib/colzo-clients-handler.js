import {requireBusinessMember,sendAuthError} from './auth.js';
import {addonStorage} from './addons.js';
import {recordAuditEvent} from './audit.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const parse=value=>{try{const x=typeof value==='string'?JSON.parse(value):value;return x&&typeof x==='object'&&!Array.isArray(x)?x:null;}catch{return null;}};
export function validateColzoClient(body,editing=false){
 if(!body||Object.keys(body).some(key=>!['id','full_name','email','phone','notes'].includes(key)))return null;
 if(editing&&!UUID.test(String(body.id||'')))return null;
 if(!editing&&('id'in body||!body.full_name))return null;
 const fields={};
 for(const [key,max] of [['full_name',160],['email',320],['phone',80],['notes',4000]])if(body[key]!==undefined){if(typeof body[key]!=='string'||body[key].trim().length>max)return null;const value=body[key].trim();if(key==='full_name'&&value.length<2)return null;if(key==='email'&&value&&!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value))return null;fields[key]=value;}
 return Object.keys(fields).length?fields:null;
}
export default async function handler(req,res){
 res.setHeader?.('Cache-Control','no-store');
 if(!['GET','POST','PATCH'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
 let auth;try{auth=await requireBusinessMember(req);}catch(e){return sendAuthError(res,e);}
 if(!auth.enforced||!auth.businessId)return res.status(403).json({error:'Business sign-in required'});
 const scope=`business_id=eq.${encodeURIComponent(auth.businessId)}`;
 try{
  if(req.method==='GET'){
   const rows=await addonStorage(`colzo_clients?${scope}&select=id,full_name,email,phone,notes,created_at,updated_at&order=full_name.asc&limit=200`);
   return res.status(200).json({clients:Array.isArray(rows)?rows:[]});
  }
  const body=parse(req.body),fields=validateColzoClient(body,req.method==='PATCH');if(!fields)return res.status(400).json({error:'Invalid client details'});
  let record;
  if(req.method==='POST'){
   const rows=await addonStorage('colzo_clients',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({...fields,business_id:auth.businessId})});
   record=Array.isArray(rows)?rows[0]:null;
  }else{
   const id=encodeURIComponent(body.id);
   const rows=await addonStorage(`colzo_clients?${scope}&id=eq.${id}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({...fields,updated_at:new Date().toISOString()})});
   record=Array.isArray(rows)?rows[0]:null;
   if(!record)return res.status(404).json({error:'Client not found'});
  }
  if(!record?.id)return res.status(503).json({error:'Could not save client'});
  await recordAuditEvent({businessId:auth.businessId,actorUserId:auth.userId,action:`colzo.client.${req.method==='POST'?'created':'updated'}`,resourceType:'colzo_clients',resourceId:record.id,metadata:{}});
  return res.status(req.method==='POST'?201:200).json({client:record});
 }catch{return res.status(503).json({error:'Client records are temporarily unavailable'});}
}
