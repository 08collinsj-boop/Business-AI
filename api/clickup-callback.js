import crypto from 'node:crypto';
import {isApprovedSupabaseTarget} from '../lib/public-config-handler.js';
import {
  clickupConfig,hashClickupState,exchangeClickupCode,
  getClickupWorkspaces,encryptClickupToken
} from '../lib/clickup-provider.js';
import {clickupStorage} from '../lib/clickup-storage.js';
import {recordAuditEvent} from '../lib/audit.js';

function single(value){return typeof value==='string'?value:null;}
function cookieState(req){
  const entries=String(req.headers?.cookie||'').split(';').map(v=>v.trim());
  const cookie=entries.find(v=>v.startsWith('colzo_clickup_state='));
  return cookie?.slice('colzo_clickup_state='.length)||'';
}
function matchedState(req,state){
  const cookie=cookieState(req);
  if(typeof state!=='string'||!cookie||state.length!==cookie.length||state.length>128)return false;
  return crypto.timingSafeEqual(Buffer.from(state),Buffer.from(cookie));
}
function clearCookie(res){
  res.setHeader('Set-Cookie','colzo_clickup_state=; Path=/api/clickup-callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, private');
  clearCookie(res);
  if(req.method!=='GET')return res.status(405).end('Method not allowed');
  if(!isApprovedSupabaseTarget())return res.status(503).end('Development environment unavailable');
  const config=clickupConfig();
  if(!config.configured)return res.status(503).end('ClickUp integration is not configured');
  const state=single(req.query?.state),code=single(req.query?.code);
  if(req.query?.error&&matchedState(req,state)){
    res.setHeader('Location','/?clickup=cancelled');
    return res.status(303).end();
  }
  if(!matchedState(req,state)||!code)return res.status(400).end('ClickUp connection could not be verified');
  try{
    const hash=hashClickupState(state);
    const states=await clickupStorage('colzo_clickup_oauth_states?state_hash=eq.'+hash+'&select=id,business_id,actor_user_id,expires_at,used_at&limit=1');
    const pending=Array.isArray(states)?states[0]:null;
    if(!pending||pending.used_at||Date.parse(pending.expires_at)<=Date.now())return res.status(400).end('ClickUp connection request expired');
    // One-time consumption is atomic. Never retry after a lost commit response.
    const consumed=await clickupStorage('colzo_clickup_oauth_states?id=eq.'+encodeURIComponent(pending.id)+'&used_at=is.null&expires_at=gt.'+encodeURIComponent(new Date().toISOString()),{
      method:'PATCH',body:{used_at:new Date().toISOString()},prefer:'return=representation'
    });
    if(!Array.isArray(consumed)||consumed.length!==1)return res.status(400).end('ClickUp connection request already used');
    const members=await clickupStorage('business_memberships?business_id=eq.'+encodeURIComponent(pending.business_id)+'&user_id=eq.'+encodeURIComponent(pending.actor_user_id)+'&role=in.(owner,admin)&select=role&limit=1');
    if(!Array.isArray(members)||members.length!==1)return res.status(403).end('ClickUp connection no longer authorised');
    if(process.env.COLZO_SCOPED_PILOT_ACCESS==='true'){
      const {assertScopedPilotWorkspace}=await import('../lib/colzo-pilot-workspace.js');
      await assertScopedPilotWorkspace(pending.business_id);
    }
    const token=await exchangeClickupCode(code,config);
    const workspaces=await getClickupWorkspaces(token);
    if(!workspaces.length)return res.status(400).end('No authorised ClickUp workspace was returned');
    const selected=workspaces[0];
    const sealed=encryptClickupToken(token,pending.business_id,config.key);
    const saved=await clickupStorage('colzo_clickup_connections?on_conflict=business_id',{
      method:'POST',prefer:'resolution=merge-duplicates,return=representation',body:{
        business_id:pending.business_id,connected_by:pending.actor_user_id,
        status:'connected',workspace_id:selected.id,workspace_name:selected.name,
        available_workspaces:workspaces,...sealed,connected_at:new Date().toISOString(),updated_at:new Date().toISOString()
      }
    });
    if(!Array.isArray(saved)||saved.length!==1||saved[0].business_id!==pending.business_id)
      return res.status(503).end('ClickUp connection could not be confirmed');
    await recordAuditEvent({businessId:pending.business_id,actorUserId:pending.actor_user_id,action:'clickup.connected',resourceType:'clickup_workspace',resourceId:selected.id});
    res.setHeader('Location','/?clickup=connected');
    return res.status(303).end();
  }catch{
    // No token, provider body, connection state or database details in the response.
    return res.status(503).end('ClickUp connection could not be completed. Please retry from Colzo.');
  }
}

