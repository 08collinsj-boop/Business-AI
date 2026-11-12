import crypto from 'node:crypto';

const API_ORIGIN='https://api.clickup.com';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POSITIVE_ID=/^[1-9][0-9]{0,19}$/;
const TASK_ID=/^[a-zA-Z0-9_-]{1,64}$/;
function fail(message,status=400,code='CLICKUP_INVALID_REQUEST'){const error=new Error(message);error.status=status;error.code=code;return error;}
function secretKey(input){
  if(typeof input!=='string'||!/^[0-9a-f]{64}$/i.test(input))throw fail('ClickUp credentials are unavailable',503,'CLICKUP_NOT_CONFIGURED');
  return Buffer.from(input,'hex');
}
export function clickupConfig(env=process.env){
  let uri=null;
  try{const parsed=new URL(env.CLICKUP_REDIRECT_URI||'');if(parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&!parsed.hash&&!parsed.search)uri=parsed.toString();}catch{}
  const key=/^[0-9a-f]{64}$/i.test(env.CLICKUP_TOKEN_ENCRYPTION_KEY||'')?env.CLICKUP_TOKEN_ENCRYPTION_KEY:null;
  const configured=env.CLICKUP_INTEGRATION_ENABLED==='true'&&!!env.CLICKUP_CLIENT_ID&&!!env.CLICKUP_CLIENT_SECRET&&!!uri&&!!key;
  return {configured,clientId:configured?env.CLICKUP_CLIENT_ID:null,clientSecret:configured?env.CLICKUP_CLIENT_SECRET:null,redirectUri:configured?uri:null,key:configured?key:null};
}
export function encryptClickupToken(token,businessId,key) {
  if(typeof token!=='string'||token.length<8||token.length>12000||!UUID.test(businessId))throw fail('Invalid ClickUp credentials');
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',secretKey(key),iv);
  cipher.setAAD(Buffer.from('colzo:clickup:'+businessId));
  const ciphertext=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);
  return {token_ciphertext:ciphertext.toString('base64'),token_iv:iv.toString('base64'),token_tag:cipher.getAuthTag().toString('base64')};
}
export function decryptClickupToken(row,businessId,key) {
  if(!UUID.test(businessId))throw fail('Invalid workspace');
  try{
    const decipher=crypto.createDecipheriv('aes-256-gcm',secretKey(key),Buffer.from(row.token_iv,'base64'));
    decipher.setAAD(Buffer.from('colzo:clickup:'+businessId));
    decipher.setAuthTag(Buffer.from(row.token_tag,'base64'));
    return Buffer.concat([decipher.update(Buffer.from(row.token_ciphertext,'base64')),decipher.final()]).toString('utf8');
  }catch{throw fail('ClickUp must be reconnected',503,'CLICKUP_TOKEN_UNREADABLE');}
}
export function createClickupState(){
  const state=crypto.randomBytes(32).toString('base64url');
  return {state,hash:hashClickupState(state)};
}
export function hashClickupState(state){
  if(typeof state!=='string'||!(/^[A-Za-z0-9_-]{32,128}$/).test(state))throw fail('Invalid connection state');
  return crypto.createHash('sha256').update(state).digest('hex');
}
export function clickupAuthUrl(state,config=clickupConfig()) {
  if(!config.configured)throw fail('ClickUp is not configured',503,'CLICKUP_NOT_CONFIGURED');
  hashClickupState(state);
  const url=new URL('https://app.clickup.com/api');
  url.searchParams.set('client_id',config.clientId);
  url.searchParams.set('redirect_uri',config.redirectUri);
  url.searchParams.set('state',state);
  return url.toString();
}
function safeTaskUrl(value){
  try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='app.clickup.com'&&!url.username&&!url.password?url.toString():null;}catch{return null;}
}
function dateFromClickup(value){
  if(value===null||value===undefined||value==='')return null;
  const n=Number(value);
  return Number.isFinite(n)&&n>0&&n<8640000000000000?new Date(n).toISOString():null;
}
export function normalizeClickupTask(task){
  if(!task||typeof task!=='object'||!TASK_ID.test(String(task.id||'')))return null;
  const assignees=Array.isArray(task.assignees)?task.assignees.slice(0,10).map(person=>String(person?.username||person?.email||'').slice(0,100)).filter(Boolean):[];
  return {id:String(task.id),title:String(task.name||'Untitled task').trim().slice(0,240),
    status:String(task.status?.status||'Unknown').slice(0,80),
    dueAt:dateFromClickup(task.due_date),listId:String(task.list?.id||'').slice(0,40)||null,
    listName:String(task.list?.name||'').slice(0,100)||null,assignees,url:safeTaskUrl(task.url)};
}
export function summarizeClickupTasks(tasks,now=new Date()){
  const time=now.getTime();
  const summary={total:0,overdue:0,dueSoon:0,completed:0};
  for(const task of Array.isArray(tasks)?tasks:[]){
    if(!task)continue;
    summary.total++;
    if(/^(complete|completed|closed|done)$/i.test(task.status||'')){summary.completed++;continue;}
    const due=task.dueAt?Date.parse(task.dueAt):NaN;
    if(Number.isFinite(due)){if(due<time)summary.overdue++;else if(due<=time+48*3600000)summary.dueSoon++;}
  }
  return summary;
}
async function request(path,{token,method='GET',body=null,fetchImpl=fetch}={}){
  if(typeof token!=='string'||token.length<8)throw fail('ClickUp is not connected',401,'CLICKUP_NO_TOKEN');
  const options={method,headers:{Authorization:token,Accept:'application/json'},signal:AbortSignal.timeout(12000)};
  if(body!==null){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body);}
  let response;
  try{response=await fetchImpl(API_ORIGIN+'/api/v2/'+path,options);}catch{throw fail('ClickUp could not be reached',502,'CLICKUP_UNAVAILABLE');}
  if(response.status===429)throw fail('ClickUp rate limit reached. Please retry shortly.',429,'CLICKUP_RATE_LIMIT');
  if(response.status===401||response.status===403)throw fail('ClickUp access has expired or was revoked. Reconnect your workspace.',401,'CLICKUP_RECONNECT');
  if(!response.ok)throw fail('ClickUp could not complete that request',502,'CLICKUP_PROVIDER_ERROR');
  let data;
  try{data=await response.json();}catch{throw fail('ClickUp returned an invalid response',502,'CLICKUP_INVALID_RESPONSE');}
  return data;
}
export async function exchangeClickupCode(code,config=clickupConfig(),fetchImpl=fetch){
  if(!config.configured)throw fail('ClickUp is not configured',503,'CLICKUP_NOT_CONFIGURED');
  if(typeof code!=='string'||code.length<5||code.length>1500)throw fail('Invalid ClickUp authorisation code');
  const response=await fetchImpl(API_ORIGIN+'/api/v2/oauth/token',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({client_id:config.clientId,client_secret:config.clientSecret,code}),signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw fail('ClickUp authorisation could not be completed',502,'CLICKUP_OAUTH_FAILED');
  const json=await response.json();
  if(typeof json?.access_token!=='string'||json.access_token.length<8)throw fail('ClickUp did not return access',502,'CLICKUP_OAUTH_FAILED');
  return json.access_token;
}
export async function getClickupWorkspaces(token,options={}){
  const data=await request('team',{token,...options});
  return (Array.isArray(data.teams)?data.teams:[]).filter(x=>POSITIVE_ID.test(String(x?.id||''))).slice(0,50).map(x=>({id:String(x.id),name:String(x.name||'ClickUp workspace').slice(0,120)}));
}
export async function listClickupTasks(token,workspaceId,{page=0,fetchImpl=fetch}={}){
  if(!POSITIVE_ID.test(String(workspaceId)))throw fail('Invalid ClickUp workspace');
  if(!Number.isInteger(page)||page<0||page>20)throw fail('Invalid task page');
  const data=await request('team/'+workspaceId+'/task?page='+page+'&include_closed=false&subtasks=true',{token,fetchImpl});
  if(!Array.isArray(data?.tasks))throw fail('ClickUp returned invalid tasks',502,'CLICKUP_INVALID_RESPONSE');
  const tasks=data.tasks.map(normalizeClickupTask).filter(Boolean);
  return {tasks,hasMore:data.tasks.length>=100,summary:summarizeClickupTasks(tasks)};
}
export async function updateClickupTask(token,id,change,{fetchImpl=fetch}={}){
  if(!TASK_ID.test(String(id||'')))throw fail('Invalid task');
  if(!change||typeof change!=='object'||Array.isArray(change))throw fail('Invalid task change');
  const fields=Object.keys(change);
  if(!fields.length||fields.some(x=>!['name','status'].includes(x)))throw fail('Unsupported task change');
  const body={};
  for(const field of fields){
    if(typeof change[field]!=='string'||!change[field].trim()||change[field].length>(field==='name'?240:80))throw fail('Invalid task change');
    body[field]=change[field].trim();
  }
  const result=await request('task/'+encodeURIComponent(id),{token,method:'PUT',body,fetchImpl});
  const task=normalizeClickupTask(result);
  if(!task||fields.some(field=>field==='name'?task.title!==body.name:task.status.toLowerCase()!==body.status.toLowerCase()))throw fail('ClickUp did not confirm the task update',502,'CLICKUP_UNCONFIRMED');
  return task;
}
export async function createClickupTask(token,listId,change,{fetchImpl=fetch}={}){
  if(!POSITIVE_ID.test(String(listId)))throw fail('Invalid ClickUp list');
  if(!change||typeof change.title!=='string'||!change.title.trim()||change.title.length>240||Object.keys(change).some(k=>k!=='title'))throw fail('Invalid task');
  const result=await request('list/'+listId+'/task',{token,method:'POST',body:{name:change.title.trim()},fetchImpl});
  const task=normalizeClickupTask(result);
  if(!task||task.title!==change.title.trim())throw fail('ClickUp did not confirm the task creation',502,'CLICKUP_UNCONFIRMED');
  return task;
}

