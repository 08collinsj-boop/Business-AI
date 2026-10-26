// Disabled by default. No accounts, payment state, grants or database rows are created here.
export const SCOPED_PILOT_DURATION_MS = 14 * 24 * 60 * 60 * 1000;
const DEV_URL='https://mvwseobgkexzpmmkgcxe.supabase.co';
const FEATURES=Object.freeze(['leads','history','actions','bookings','basic_knowledge','basic_analytics']);
export function isScopedPilotRequested(env=process.env){
 return env.COLZO_SCOPED_PILOT_ACCESS==='true';
}
export function isScopedPilotEligibleTarget(env=process.env){
 return isScopedPilotRequested(env) && env.VERCEL_ENV==='preview'
  && env.SUPABASE_URL===DEV_URL && env.PILOT_FREE_STARTER_MARKETING!=='true';
}
export function scopedPilotEntitlement(row,usage=0,now=new Date(),businessId=null){
 const denied=(status,expiry=null)=>({
  enforced:true,active:false,plan:'none',status,
  enquiryAllowance:250,enquiriesUsed:0,enquiriesRemaining:0,
  staffAllowance:0,features:[],trialExpiresAt:expiry,
  currentPeriodStartedAt:null,currentPeriodEndsAt:null,
  cancelAtPeriodEnd:false,pilotFreeAccess:false
 });
 if(!row || row.status!=='active' || typeof row.business_id!=='string'
  || (businessId && businessId!==row.business_id))
  return denied(row?.status==='revoked'?'pilot_revoked':'pilot_required');
 const start=typeof row.activated_at==='string'?Date.parse(row.activated_at):NaN;
 const end=typeof row.expires_at==='string'?Date.parse(row.expires_at):NaN;
 const current=now instanceof Date?now.getTime():new Date(now).getTime();
 if(![start,end,current].every(Number.isFinite) || end-start!==SCOPED_PILOT_DURATION_MS) return denied('pilot_invalid');
 if(current<start)return denied('pilot_pending',row.expires_at);
 if(current>=end)return denied('pilot_expired',row.expires_at);
 const numeric=Number(usage);
 const used=Number.isFinite(numeric)?Math.max(0,Math.trunc(numeric)):250;
 return {enforced:true,active:true,plan:'starter',status:'pilot',
  enquiryAllowance:250,enquiriesUsed:used,enquiriesRemaining:Math.max(0,250-used),
  staffAllowance:2,features:FEATURES,trialExpiresAt:row.expires_at,
  currentPeriodStartedAt:row.activated_at,currentPeriodEndsAt:row.expires_at,
  cancelAtPeriodEnd:false,pilotFreeAccess:true};
}

// Deterministic no-provider handling is restricted to the isolated scoped Preview.
export function isScopedPilotNoProviderDemo(env=process.env){
 return isScopedPilotEligibleTarget(env) && env.TENANCY_AUTH_ENABLED==='true'
  && env.FRONTEND_AUTH_ENABLED==='true' && env.BILLING_ENABLED==='false'
  && !env.OPENAI_API_KEY && !env.OPENROUTER_API_KEY;
}
