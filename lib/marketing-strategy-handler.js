import { requireBusinessMember, sendAuthError } from './auth.js';
import { recordAuditEvent } from './audit.js';
import { getMarketingStrategy, linkMarketingPlanGeneration, planMarketingWeek, saveMarketingStrategy } from './marketing-strategy.js';

function parse(value){try{const body=typeof value==='string'?JSON.parse(value):value;return body&&typeof body==='object'&&!Array.isArray(body)?body:null;}catch{return null;}}

export default async function handler(req,res){
  res.setHeader?.('Cache-Control','no-store');
  if(!['GET','PATCH','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
  let auth;
  try{auth=await requireBusinessMember(req,req.method==='GET'?null:['owner','admin']);}catch(error){return sendAuthError(res,error);}
  if(!auth.enforced)return res.status(503).json({error:'Authenticated business access is required'});
  if(Object.keys(req.query||{}).some(key=>key!=='operation'))return res.status(400).json({error:'Invalid Marketing strategy query'});
  try{
    if(req.method==='GET')return res.status(200).json({strategy:await getMarketingStrategy(auth.businessId)});
    const body=parse(req.body);if(!body)return res.status(400).json({error:'Invalid Marketing strategy request'});
    if(req.method==='PATCH'){
      const strategy=await saveMarketingStrategy({businessId:auth.businessId,actorUserId:auth.userId,input:body});
      await recordAuditEvent({businessId:auth.businessId,actorUserId:auth.userId,action:'marketing.strategy_updated',resourceType:'marketing_strategy',resourceId:auth.businessId,metadata:{weekly_posts:strategy.weekly_posts}});
      return res.status(200).json({strategy});
    }
    if(body.action==='plan_week'&&Object.keys(body).every(key=>['action','start_date'].includes(key))){
      const strategy=await planMarketingWeek({businessId:auth.businessId,actorUserId:auth.userId,startDate:String(body.start_date||'')});
      await recordAuditEvent({businessId:auth.businessId,actorUserId:auth.userId,action:'marketing.week_planned',resourceType:'marketing_strategy',resourceId:auth.businessId,metadata:{items:strategy.weekly_plan.length}});
      return res.status(200).json({strategy});
    }
    if(body.action==='link_generation'&&Object.keys(body).every(key=>['action','plan_item_id','generation_id'].includes(key))){
      const strategy=await linkMarketingPlanGeneration({businessId:auth.businessId,actorUserId:auth.userId,planItemId:body.plan_item_id,generationId:body.generation_id});
      await recordAuditEvent({businessId:auth.businessId,actorUserId:auth.userId,action:'marketing.plan_draft_linked',resourceType:'marketing_generation',resourceId:body.generation_id,metadata:{plan_item_id:body.plan_item_id}});
      return res.status(200).json({strategy});
    }
    return res.status(400).json({error:'Invalid Marketing strategy request'});
  }catch(error){
    const status=[400,403,404,409,422,429,502,503].includes(error?.status)?error.status:503;
    return res.status(status).json({error:status===503?'Marketing strategy is temporarily unavailable':error.message,code:error?.code||'MARKETING_STRATEGY_ERROR'});
  }
}
