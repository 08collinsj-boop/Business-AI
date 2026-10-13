/* Read-only, no-cost cutover preflight. Never displays public API keys or sends mutations. */
const HOST_PATTERN=/^(?:app\.getbusiness-ai\.com|[a-z0-9-]+\.vercel\.app)$/i;
const pathUrl=(origin,path)=>new URL(path,origin).href;
export function allowlistedOrigin(value){
 try { const url=new URL(value);
  if(url.protocol!=='https:'||!HOST_PATTERN.test(url.hostname)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)return null;
  return url.origin;
 }catch{return null;}
}
export function supabaseHost(value){
 try{const url=new URL(value);if(url.protocol!=='https:'||!/^[-a-z0-9]+\.supabase\.co$/i.test(url.hostname)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)return null;return url.hostname.toLowerCase()}catch{return null;}
}
export async function checkCutover({live,candidate,fetchImpl=fetch}={}){
 const liveOrigin=allowlistedOrigin(live),candidateOrigin=allowlistedOrigin(candidate);
 if(!liveOrigin||!candidateOrigin||liveOrigin===candidateOrigin||new URL(liveOrigin).hostname!=='app.getbusiness-ai.com'||!new URL(candidateOrigin).hostname.startsWith('business-ai-pilot-'))throw Error('Expected the live Business AI domain and a distinct existing-project Pilot preview URL');
 const checks=[];
 async function get(base,route,type){
  try{
   const response=await fetchImpl(pathUrl(base,route),{method:'GET',redirect:'error',cache:'no-store',headers:{Accept:type==='html'?'text/html':'application/json'},signal:AbortSignal.timeout(6500)});
   const content=await response.text();
   return {status:response.status,body:content.slice(0,24000)};
  }catch{return {status:null,body:''};}
 }
 let liveConfigHost=null,candidateConfigHost=null;
 for(const [label,origin] of [['live',liveOrigin],['candidate',candidateOrigin]]){
  const [page,health,config,protectedApi]=await Promise.all([
   get(origin,'/','html'),get(origin,'/api/health','json'),get(origin,'/api/public-config','json'),get(origin,'/api/colzo/projects','json')
  ]);
  const pagePass=page.status===200&&/<!doctype html/i.test(page.body);
  checks.push({name:`${label}: app responds with HTML`,pass:pagePass,http:page.status});
  const healthPass=health.status===200&&(()=>{try{return JSON.parse(health.body).status==='ok'}catch{return false}})();
  checks.push({name:`${label}: app health returns OK`,pass:healthPass,http:health.status});
  let safeConfig=null;
  if(config.status===200){try{safeConfig=JSON.parse(config.body)}catch{}}
  const host=supabaseHost(safeConfig?.supabaseUrl);
  const authPass=config.status===200&&safeConfig?.frontendAuthEnabled===true&&!!host&&typeof safeConfig.supabaseAnonKey==='string'&&safeConfig.supabaseAnonKey.length>20;
  checks.push({name:`${label}: frontend auth configured`,pass:Boolean(authPass),http:config.status});
  if(label==='live')liveConfigHost=host;else candidateConfigHost=host;
  // The old live deployment legitimately has no Colzo Projects route (404).
  // The candidate must expose it but reject an unauthenticated request.
  const apiPass=label==='live'?[401,403,404].includes(protectedApi.status):[401,403].includes(protectedApi.status);
  checks.push({name:`${label}: unauthenticated project data is protected`,pass:apiPass,http:protectedApi.status});
  if(label==='candidate')checks.push({name:'candidate: Colzo interface present',pass:pagePass&&page.body.includes('Colzo'),http:page.status});
 }
 checks.push({name:'candidate: same existing Supabase Auth project',pass:Boolean(liveConfigHost&&candidateConfigHost&&liveConfigHost===candidateConfigHost),http:null});
 return {pass:checks.every(c=>c.pass),checks,blockers:checks.filter(c=>!c.pass).map(c=>c.name)};
}
