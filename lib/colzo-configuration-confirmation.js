import {isDeepStrictEqual} from 'node:util';

// In isolated Colzo Preview, do not advance onboarding or audit success based
// on a database HTTP 2xx unless the stored tenant and requested fields match.
export function confirmConfigurationSave(data,businessId,updates){
  if(Array.isArray(data)&&data.length===0)return {status:404,error:'Business configuration not found'};
  const invalid={status:503,error:'Business configuration save could not be confirmed. Reload and retry.'};
  if(!Array.isArray(data)||data.length!==1)return invalid;
  const row=data[0];
  if(!row||typeof row!=='object'||Array.isArray(row)||row.business_id!==businessId)return invalid;
  for(const [key,value] of Object.entries(updates)){
    if(key==='updated_at')continue;
    if(!Object.hasOwn(row,key))return invalid;
    if(key==='onboarding_started_at'||key==='onboarding_completed_at'){
      if(value===null){if(row[key]!==null)return invalid;}
      else if(typeof row[key]!=='string'||!Number.isFinite(Date.parse(row[key]))||Date.parse(row[key])!==Date.parse(value))return invalid;
    }else if(!isDeepStrictEqual(row[key],value))return invalid;
  }
  return {status:200,configuration:row};
}
