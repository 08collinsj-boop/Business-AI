export function connectionError(status=503, code='CLICKUP_STORAGE_ERROR') {
  const error=new Error('Connected workspace storage is unavailable');
  error.status=status;error.code=code;return error;
}
export async function clickupStorage(path,{method='GET',body,prefer}={}) {
  const base=process.env.SUPABASE_URL||'';
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base)||!key||!String(path).startsWith('colzo_clickup_')&&!String(path).startsWith('business_memberships?'))
    throw connectionError();
  const headers={apikey:key,Authorization:'Bearer '+key,Accept:'application/json'};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(prefer)headers.Prefer=prefer;
  let response;
  try{response=await fetch(base+'/rest/v1/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000)});}
  catch{throw connectionError();}
  if(!response.ok)throw connectionError();
  let data;
  try{const text=await response.text();data=text?JSON.parse(text):null;}catch{throw connectionError();}
  return data;
}
export async function getClickupConnection(businessId) {
  const rows=await clickupStorage('colzo_clickup_connections?business_id=eq.'+encodeURIComponent(businessId)+'&select=*&limit=1');
  return Array.isArray(rows)?rows[0]||null:null;
}

