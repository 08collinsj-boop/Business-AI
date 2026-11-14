import {isApprovedSupabaseTarget,restorePreviewAuthToken} from './public-config-handler.js';
import {requireBusinessMember,requireBusinessAdmin,sendAuthError} from './auth.js';
import {
  clickupConfig,createClickupState,clickupAuthUrl,decryptClickupToken,
  listClickupTasks,getClickupLists,assertClickupTaskSnapshot,updateClickupTask,createClickupTask,selectClickupWorkspace
} from './clickup-provider.js';
import {clickupStorage,getClickupConnection} from './clickup-storage.js';
import {recordAuditEvent} from './audit.js';

const NO_STORE='no-store, private';
const UNCONFIGURED={configured:false,connected:false,provider:'clickup',workspace:null};
function sendError(res,error){
  const status=[400,401,403,409,429,502,503].includes(error?.status)?error.status:503;
  return res.status(status).json({error:status===503?'ClickUp integration is unavailable':status===502?'ClickUp could not complete that request':status===409?'The ClickUp task changed. Refresh and try again.':status===403?'Action is not authorised':status===401?'Reconnect ClickUp to continue':status===429?'ClickUp is rate-limiting requests':status===400?'Invalid ClickUp request':'ClickUp is unavailable',code:String(error?.code||'CLICKUP_ERROR')});
}
function requireTenant(auth){
  if(!auth?.enforced||!auth.businessId){const e=new Error('Authentication required');e.status=403;throw e;}
  return auth;
}
function payload(body){
  try{const obj=typeof body==='string'?JSON.parse(body):body;return obj&&typeof obj==='object'&&!Array.isArray(obj)?obj:null;}catch{return null;}
}
function canUseClickupOwnerToken(row,auth){
  return !!row&&row.status==='connected'&&row.connected_by===auth.userId&&['owner','admin'].includes(auth.role);
}
function visibleConnection(row,auth){
  const canUseToken=canUseClickupOwnerToken(row,auth);
  const canManage=!row?['owner','admin'].includes(auth.role):canUseToken;
  const workspaces=Array.isArray(row?.available_workspaces)?row.available_workspaces.slice(0,50).filter(w=>w&&/^[1-9][0-9]{0,19}$/.test(String(w.id||''))).map(w=>({id:String(w.id),name:String(w.name||'ClickUp workspace').slice(0,120)})):[];
  return {configured:true,connected:!!row&&row.status==='connected',provider:'clickup',workspace:row?.status==='connected'?{id:row.workspace_id,name:row.workspace_name}:null,availableWorkspaces:canUseToken?workspaces:[],canManage,canViewTasks:canUseToken,canDisconnect:auth.role==='owner'};
}
export default async function handler(req,res){
  res.setHeader('Cache-Control',NO_STORE);
  restorePreviewAuthToken(req);
  if(!isApprovedSupabaseTarget())return res.status(503).json({error:'Development environment unavailable'});
  const config=clickupConfig();
  try{
    if(req.method==='GET'){
      const auth=requireTenant(await requireBusinessMember(req));
      if(!config.configured)return res.status(200).json(UNCONFIGURED);
      const row=await getClickupConnection(auth.businessId);
      if(!['tasks','lists'].includes(req.query?.view))return res.status(200).json(visibleConnection(row,auth));
      // The business-wide OAuth token is the connector owner's identity, not
      // an impersonation grant for all Colzo staff. Keep tasks/list names
      // unavailable to members until individual scopes or explicit delegated
      // task grants are implemented and independently verified.
      if(!canUseClickupOwnerToken(row,auth))return res.status(403).json({error:'Your team role or ClickUp identity cannot browse this connection',code:'CLICKUP_TEAM_SCOPE_REQUIRED'});
      if(!row||row.status!=='connected')return res.status(409).json({error:'ClickUp is not connected'});
      const token=decryptClickupToken(row,auth.businessId,config.key);
      const page=req.query?.page===undefined?0:Number(req.query.page);
      if(req.query?.view==='lists'){
        const result=await getClickupLists(token,row.workspace_id);
        return res.status(200).json(result);
      }
      const result=await listClickupTasks(token,row.workspace_id,{page});
      return res.status(200).json({workspace:{id:row.workspace_id,name:row.workspace_name},...result});
    }
    if(req.method==='POST'){
      const auth=requireTenant(await requireBusinessAdmin(req));
      if(!config.configured)return res.status(503).json({error:'ClickUp connection is not configured'});
      const body=payload(req.body);
      if(!body)return res.status(400).json({error:'Invalid ClickUp request'});
      if(body.action==='connect'){
        const {state,hash}=createClickupState();
        await clickupStorage('colzo_clickup_oauth_states',{method:'POST',body:{state_hash:hash,business_id:auth.businessId,actor_user_id:auth.userId,expires_at:new Date(Date.now()+600000).toISOString()},prefer:'return=minimal'});
        res.setHeader('Set-Cookie','colzo_clickup_state='+state+'; Path=/api/clickup-callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600');
        return res.status(200).json({url:clickupAuthUrl(state,config)});
      }
      const row=await getClickupConnection(auth.businessId);
      if(!row||row.status!=='connected')return res.status(409).json({error:'ClickUp is not connected'});
      if(!canUseClickupOwnerToken(row,auth))return res.status(403).json({error:'This ClickUp connection belongs to a different authorised user',code:'CLICKUP_TEAM_SCOPE_REQUIRED'});
      if(body.action==='select_workspace'){
        const selected=selectClickupWorkspace(row.available_workspaces,body.workspaceId);
        // Reject concurrent workspace switches using the exact version we loaded.
        if(typeof row.updated_at!=='string'||!Number.isFinite(Date.parse(row.updated_at)))
          return res.status(409).json({error:'Workspace changed. Refresh and try again.'});
        const existingFilter='colzo_clickup_connections?business_id=eq.'+encodeURIComponent(auth.businessId)+'&workspace_id=eq.'+encodeURIComponent(row.workspace_id)+'&updated_at=eq.'+encodeURIComponent(row.updated_at);
        const selectedRows=await clickupStorage(existingFilter,{method:'PATCH',body:{workspace_id:selected.id,workspace_name:selected.name,updated_at:new Date().toISOString()},prefer:'return=representation'});
        if(!Array.isArray(selectedRows)||selectedRows.length!==1||selectedRows[0].workspace_id!==selected.id)return res.status(409).json({error:'Workspace changed. Refresh and try again.'});
        await recordAuditEvent({businessId:auth.businessId,actorUserId:auth.userId,action:'clickup.workspace_selected',resourceType:'clickup_workspace',resourceId:selected.id});
        return res.status(200).json({...visibleConnection(selectedRows[0],auth),confirmed:true});
      }
      if(body.approved!==true)return res.status(400).json({error:'An explicit action approval is required'});
      const token=decryptClickupToken(row,auth.businessId,config.key);
      if(body.action==='update_task'){
        const page=body.page===undefined?0:body.page;
        const snapshot=await listClickupTasks(token,row.workspace_id,{page});
        assertClickupTaskSnapshot(snapshot.tasks,body.taskId,body.expectedTitle,body.expectedStatus);
        const task=await updateClickupTask(token,body.taskId,body.change);
        await recordAuditEvent({businessId:auth.businessId,actorUserId:auth.userId,action:'clickup.task_updated',resourceType:'clickup_task',resourceId:task.id,metadata:{workspace_id:row.workspace_id,fields:Object.keys(body.change||{}).sort().join(',')}});
        return res.status(200).json({task,confirmed:true});
      }
      if(body.action==='create_task'){
        const available=await getClickupLists(token,row.workspace_id);
        if(!available.lists.some(list=>list.id===String(body.listId)))
          return res.status(409).json({error:'Choose an authorised ClickUp list. Refresh and try again.'});
        const task=await createClickupTask(token,body.listId,{title:body.title});
        await recordAuditEvent({businessId:auth.businessId,actorUserId:auth.userId,action:'clickup.task_created',resourceType:'clickup_task',resourceId:task.id,metadata:{workspace_id:row.workspace_id}});
        return res.status(200).json({task,confirmed:true});
      }
      return res.status(400).json({error:'Unsupported ClickUp action'});
    }
    if(req.method==='DELETE'){
      const auth=requireTenant(await requireBusinessAdmin(req));
      if(!config.configured)return res.status(503).json({error:'ClickUp connection is not configured'});
      await clickupStorage('colzo_clickup_connections?business_id=eq.'+encodeURIComponent(auth.businessId),{method:'DELETE',prefer:'return=minimal'});
      await recordAuditEvent({businessId:auth.businessId,actorUserId:auth.userId,action:'clickup.disconnected',resourceType:'clickup_workspace',resourceId:'clickup'});
      return res.status(200).json({connected:false,confirmed:true});
    }
    res.setHeader('Allow','GET, POST, DELETE');
    return res.status(405).json({error:'Method not allowed'});
  }catch(error){
    if(error?.code==='MFA_REQUIRED'||(error?.status===401||error?.status===403)&&!error?.code)return sendAuthError(res,error);
    return sendError(res,error);
  }
}

