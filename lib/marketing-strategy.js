import { addonError, addonStorage, requireAddon } from './addons.js';
import { buildMarketingWeekPlan, defaultMarketingStrategy, validateMarketingStrategyInput } from './marketing-strategy-model.js';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const strategyError=(status,message,code='MARKETING_STRATEGY_ERROR')=>Object.assign(addonError(status,message),{code});

function publicStrategy(row) {
  const defaults=defaultMarketingStrategy();
  return {
    goals:Array.isArray(row?.goals)?row.goals:defaults.goals,
    pillars:Array.isArray(row?.pillars)?row.pillars:defaults.pillars,
    weekly_posts:Number.isInteger(Number(row?.weekly_posts))?Number(row.weekly_posts):defaults.weekly_posts,
    preferred_time:/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(row?.preferred_time||''))?String(row.preferred_time):defaults.preferred_time,
    weekly_plan:Array.isArray(row?.weekly_plan)?row.weekly_plan:[],
    updated_at:row?.updated_at||null
  };
}

async function strategyRow(businessId) {
  const rows=await addonStorage(`marketing_strategy_settings?business_id=eq.${encodeURIComponent(businessId)}&select=business_id,goals,pillars,weekly_posts,preferred_time,weekly_plan,updated_at&limit=1`);
  return rows?.[0]||null;
}

async function persistStrategy({ businessId, actorUserId, strategy }) {
  const now=new Date().toISOString();
  const rows=await addonStorage('marketing_strategy_settings?on_conflict=business_id',{
    method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},
    body:JSON.stringify({business_id:businessId,goals:strategy.goals,pillars:strategy.pillars,weekly_posts:strategy.weekly_posts,preferred_time:strategy.preferred_time,weekly_plan:strategy.weekly_plan||[],updated_by:actorUserId||null,updated_at:now})
  });
  if(!rows?.[0])throw strategyError(503,'Marketing strategy could not be saved','MARKETING_STRATEGY_STORAGE_ERROR');
  return publicStrategy(rows[0]);
}

export async function getMarketingStrategy(businessId) {
  await requireAddon(businessId,'ai_marketing');
  return publicStrategy(await strategyRow(businessId));
}

export async function saveMarketingStrategy({businessId,actorUserId,input}) {
  await requireAddon(businessId,'ai_marketing');
  let validated;
  try{validated=validateMarketingStrategyInput(input);}catch(error){throw strategyError(400,error.message);}
  const existing=publicStrategy(await strategyRow(businessId));
  return persistStrategy({businessId,actorUserId,strategy:{...validated,weekly_plan:existing.weekly_plan}});
}

export async function planMarketingWeek({businessId,actorUserId,startDate}) {
  await requireAddon(businessId,'ai_marketing');
  const existing=publicStrategy(await strategyRow(businessId));
  let weeklyPlan;
  try{weeklyPlan=buildMarketingWeekPlan({strategy:existing,start_date:startDate,existing_plan:existing.weekly_plan});}
  catch(error){throw strategyError(400,error.message);}
  return persistStrategy({businessId,actorUserId,strategy:{...existing,weekly_plan:weeklyPlan}});
}

export async function linkMarketingPlanGeneration({businessId,actorUserId,planItemId,generationId}) {
  await requireAddon(businessId,'ai_marketing');
  if(!UUID.test(String(planItemId||''))||!UUID.test(String(generationId||'')))throw strategyError(400,'Invalid Marketing plan item');
  const generationRows=await addonStorage(`marketing_generations?business_id=eq.${encodeURIComponent(businessId)}&id=eq.${encodeURIComponent(generationId)}&deleted_at=is.null&select=id&limit=1`);
  if(!generationRows?.[0])throw strategyError(404,'Marketing draft not found');
  const existing=publicStrategy(await strategyRow(businessId));
  const index=existing.weekly_plan.findIndex(item=>item?.id===planItemId);
  if(index<0)throw strategyError(404,'Marketing plan item not found');
  const weeklyPlan=existing.weekly_plan.map((item,itemIndex)=>itemIndex===index?{...item,generation_id:generationId,linked_at:new Date().toISOString()}:item);
  return persistStrategy({businessId,actorUserId,strategy:{...existing,weekly_plan:weeklyPlan}});
}
