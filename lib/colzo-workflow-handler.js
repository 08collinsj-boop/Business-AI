import {requireBusinessMember,sendAuthError} from './auth.js';
import {addonStorage} from './addons.js';
import {recordAuditEvent} from './audit.js';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LIMIT=100;
export const PROJECT_STATUSES=Object.freeze(['planned','active','paused','completed']);
export const QUOTE_STATUSES=Object.freeze(['draft','sent','accepted','declined']);
const parse=data=>{try{const value=typeof data==='string'?JSON.parse(data):data;return value&&typeof value==='object'&&!Array.isArray(value)?value:null;}catch{return null;}};
const text=(v,max,min=0)=>typeof v==='string'&&v.trim().length>=min&&v.trim().length<=max?v.trim():null;
export function validateColzoWork(kind,body,patch=false){
 const project=kind==='projects';if(!project&&kind!=='quotes')return null;
 const allowed=new Set(project?['id','title','lead_id','client_name','status','progress','notes']:['id','title','lead_id','amount_gbp','notes','status']);
 if(!body||Object.keys(body).some(key=>!allowed.has(key))||!Object.keys(body).length)return null;
 if(patch&&(!UUID.test(String(body.id||''))||Object.keys(body).length<2))return null;
 if(!patch&&body.id!==undefined)return null;
 const item={};
 if(body.title!==undefined){const val=text(body.title,160,3);if(!val)return null;item.title=val;}
 if(!patch&&!item.title)return null;
 if(body.lead_id!==undefined){
  if(body.lead_id===null&&project){item.lead_id=null;}
  else if(!/^[1-9]\d*$/.test(String(body.lead_id))||!Number.isSafeInteger(Number(body.lead_id)))return null;
  else item.lead_id=Number(body.lead_id);
 }
 if(!patch&&!project&&!item.lead_id)return null;
 if(body.notes!==undefined){const val=text(body.notes,4000);if(val===null)return null;item.notes=val;}
 if(project){
  if(body.client_name!==undefined){const val=text(body.client_name,160);if(val===null)return null;item.client_name=val;}
  if(body.status!==undefined){if(!PROJECT_STATUSES.includes(body.status))return null;item.status=body.status;}
  if(body.progress!==undefined){if(!Number.isInteger(body.progress)||body.progress<0||body.progress>100)return null;item.progress=body.progress;}
  if(item.status==='completed')item.progress=100;
  if(item.progress===100&&item.status&&item.status!=='completed')return null;
 }else{
  if(body.amount_gbp!==undefined){if(typeof body.amount_gbp!=='number'||!Number.isFinite(body.amount_gbp)||body.amount_gbp<0||body.amount_gbp>999999999.99||Math.abs(Math.round(body.amount_gbp*100)-body.amount_gbp*100)>0.000001)return null;item.amount_gbp=body.amount_gbp;}
  if(!patch&&item.amount_gbp===undefined)return null;
  if(body.status!==undefined){if(!QUOTE_STATUSES.includes(body.status))return null;item.status=body.status;}
 }
 return item;
}
export async function validateTenantLead(leadId,businessId){
 if(leadId===null||leadId===undefined)return true;
 const rows=await addonStorage(`leads?id=eq.${leadId}&business_id=eq.${encodeURIComponent(businessId)}&select=id&limit=1`);
 return Array.isArray(rows)&&rows.length===1;
}
export default async function colzoWorkHandler(req,res){
 res.setHeader?.('Cache-Control','no-store');
 const kind=req.query?.kind;
 if(!['projects','quotes'].includes(kind))return res.status(404).json({error:'Not found'});
 if(!['GET','POST','PATCH'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
 let auth;try{auth=await requireBusinessMember(req);}catch(e){return sendAuthError(res,e);}
 if(!auth.enforced||!auth.businessId)return res.status(403).json({error:'Business sign-in required'});
 const resource=kind==='projects'?'colzo_projects':'colzo_quotes';
 const tenant=`business_id=eq.${encodeURIComponent(auth.businessId)}`;
 try{
  if(req.method==='GET'){
   const lead=req.query?.lead_id;
   if(lead!==undefined&&(!/^[1-9]\d*$/.test(String(lead))||!Number.isSafeInteger(Number(lead))))return res.status(400).json({error:'Invalid enquiry'});
   const rows=await addonStorage(`${resource}?${tenant}${lead?`&lead_id=eq.${lead}`:''}&select=*&order=created_at.desc&limit=${LIMIT}`);
   return res.status(200).json({items:Array.isArray(rows)?rows:[]});
  }
  if(!['owner','admin','member'].includes(auth.role))return res.status(403).json({error:'Not authorised'});
  const body=parse(req.body),item=validateColzoWork(kind,body,req.method==='PATCH');
  if(!item)return res.status(400).json({error:'Invalid fields'});
  if('lead_id'in item&&!(await validateTenantLead(item.lead_id,auth.businessId)))return res.status(404).json({error:'Enquiry not found'});
  if(req.method==='POST'){
   const rows=await addonStorage(resource,{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({...item,business_id:auth.businessId})});
   const created=Array.isArray(rows)?rows[0]:null;
   if(!created)return res.status(503).json({error:'Unable to create record'});
   await recordAuditEvent({businessId:auth.businessId,actorUserId:auth.userId,action:`colzo.${kind}.created`,resourceType:resource,resourceId:created.id,metadata:{status:created.status}});
   return res.status(201).json({item:created});
  }
  const id=encodeURIComponent(body.id);
  const previous=await addonStorage(`${resource}?${tenant}&id=eq.${id}&select=*&limit=1`);
  const old=Array.isArray(previous)?previous[0]:null;
  if(!old)return res.status(404).json({error:'Record not found'});
  if(kind==='quotes'&&old.status!=='draft'&&('amount_gbp'in item||'lead_id'in item||'title'in item))return res.status(409).json({error:'Reopen as draft before editing a quoted amount'});
  if(kind==='quotes'&&'status'in item){const transitions={draft:['sent'],sent:['accepted','declined'],accepted:[],declined:['draft']};if(!transitions[old.status]?.includes(item.status))return res.status(400).json({error:'Invalid quote transition'});}
  if(kind==='projects'&&item.progress===100&&item.status===undefined)item.status='completed';
  if(kind==='projects'&&item.status==='completed')item.progress=100;
  const rows=await addonStorage(`${resource}?${tenant}&id=eq.${id}&updated_at=eq.${encodeURIComponent(old.updated_at)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({...item,updated_at:new Date().toISOString()})});
  const saved=Array.isArray(rows)?rows[0]:null;
  if(!saved)return res.status(409).json({error:'Record changed. Refresh and try again.'});
  await recordAuditEvent({businessId:auth.businessId,actorUserId:auth.userId,action:`colzo.${kind}.updated`,resourceType:resource,resourceId:saved.id,metadata:{status:saved.status}});
  return res.status(200).json({item:saved});
 }catch{return res.status(503).json({error:'This feature is currently unavailable. No changes were confirmed.'});}
}
