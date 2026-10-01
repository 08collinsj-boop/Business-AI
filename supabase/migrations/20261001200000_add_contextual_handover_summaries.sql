CREATE OR REPLACE FUNCTION public.save_public_enquiry(p_business_id uuid, p_lead jsonb, p_mode text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  saved public.leads%rowtype;
  handover public.lead_handovers%rowtype;
  action_id bigint;
  is_new boolean := false;
  effective_reason text := p_reason;
  phone_value text := nullif(p_lead->>'phone', '');
  email_value text := nullif(lower(p_lead->>'email'), '');
  summary_value text := left(coalesce(nullif(p_lead->>'handover_summary',''), 'Wants human response. Review the linked lead for enquiry context.'), 2000);
begin
  if p_business_id is null or (phone_value is null and email_value is null) or p_mode not in ('human_first','balanced','ai_first') then
    raise exception 'invalid public enquiry';
  end if;
  if p_reason is not null and p_reason not in ('human_requested','complaint_or_dispute','emergency_or_high_risk','sensitive_or_unusual','ai_uncertain','human_first_mode','quote_or_commitment') then
    raise exception 'invalid handover reason';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text, 0));
  select * into saved from public.leads where business_id = p_business_id
    and ((phone_value is not null and phone = phone_value) or (email_value is not null and lower(email) = email_value)) order by id limit 1 for update;
  if not found then
    insert into public.leads (business_id,name,phone,email,location,job_type,description,urgency,qualified,status,priority,notes,estimated_value)
    values (p_business_id,p_lead->>'name',phone_value,email_value,p_lead->>'location',coalesce(p_lead->>'job_type','General enquiry'),p_lead->>'description',coalesce(p_lead->>'urgency','Normal'),true,'New',coalesce(p_lead->>'priority','Normal'),p_lead->>'notes',0) returning * into saved;
    is_new := true;
  else
    select * into handover from public.lead_handovers where business_id=p_business_id and lead_id=saved.id order by created_at desc limit 1;
    -- A previously handed-over contact stays with the team. Never downgrade a
    -- safety escalation when another message arrives or the client drops history.
    if handover.id is not null and (effective_reason is null or handover.reason = 'emergency_or_high_risk' or (handover.reason = 'complaint_or_dispute' and effective_reason <> 'emergency_or_high_risk') or (handover.reason = 'human_requested' and effective_reason not in ('emergency_or_high_risk','complaint_or_dispute'))) then effective_reason := handover.reason; end if;
    update public.leads set name=coalesce(nullif(p_lead->>'name',''),name),phone=coalesce(phone_value,phone),email=coalesce(email_value,email),
      location=coalesce(nullif(p_lead->>'location',''),location),job_type=coalesce(nullif(p_lead->>'job_type',''),job_type),
      description=case when nullif(p_lead->>'description','') is null then description when position((p_lead->>'description') in coalesce(description,'')) > 0 then description else right(concat_ws(E'\n',description,p_lead->>'description'),12000) end,
      priority=case when effective_reason = 'quote_or_commitment' then priority when effective_reason is not null then 'High' else priority end,
      notes=case when effective_reason is not null then 'Captured by Business AI AI receptionist. Human handover requested.' else notes end
      where id=saved.id and business_id=p_business_id returning * into saved;
  end if;
  if effective_reason is not null then
    select * into handover from public.lead_handovers where business_id=p_business_id and lead_id=saved.id order by created_at desc limit 1;
    if not found then
      insert into public.actions (business_id,lead_id,title,description,action_type,priority,status)
        values (p_business_id,saved.id,'Human follow-up requested',summary_value,'follow_up',case when effective_reason = 'quote_or_commitment' then 'normal' else 'urgent' end,'pending') returning id into action_id;
      insert into public.lead_handovers (business_id,lead_id,action_id,reason,summary)
        values (p_business_id,saved.id,action_id,effective_reason,summary_value);
      insert into public.lead_history (business_id,lead_id,action,old_value,new_value)
        values (p_business_id,saved.id,'Human handover requested','','Follow-up action created');
      insert into public.business_audit_events (business_id,action,resource_type,resource_id,metadata)
        values (p_business_id,'lead.public_handover','lead',saved.id::text,jsonb_build_object('source','public_enquiry','handling_mode',p_mode,'handover_reason',effective_reason,'customer_requested_human',effective_reason='human_requested','action_created',true));
    elsif effective_reason = 'human_requested' and handover.reason not in ('human_requested','emergency_or_high_risk','complaint_or_dispute') then
      update public.lead_handovers set reason=effective_reason,updated_at=now() where id=handover.id and business_id=p_business_id;
      insert into public.business_audit_events (business_id,action,resource_type,resource_id,metadata)
        values (p_business_id,'lead.customer_requested_human','lead',saved.id::text,jsonb_build_object('handling_mode',p_mode,'handover_reason',effective_reason,'customer_requested_human',true));
    elsif effective_reason in ('emergency_or_high_risk','complaint_or_dispute') and handover.reason <> effective_reason and handover.reason <> 'emergency_or_high_risk' then
      update public.lead_handovers set reason=effective_reason,status='requires_attention',acknowledged_by=null,acknowledged_at=null,resolved_by=null,resolved_at=null,updated_at=now() where id=handover.id and business_id=p_business_id;
      update public.actions set priority='urgent',status='pending',completed_at=null where id=handover.action_id and business_id=p_business_id;
      insert into public.business_audit_events (business_id,action,resource_type,resource_id,metadata)
        values (p_business_id,'lead.public_escalated','lead',saved.id::text,jsonb_build_object('handling_mode',p_mode,'handover_reason',effective_reason));
    end if;
    update public.lead_handovers
      set summary=summary_value,updated_at=now()
      where id=(select h.id from public.lead_handovers h where h.business_id=p_business_id and h.lead_id=saved.id order by h.created_at desc limit 1)
        and business_id=p_business_id;
    update public.actions
      set description=summary_value
      where id=(select h.action_id from public.lead_handovers h where h.business_id=p_business_id and h.lead_id=saved.id order by h.created_at desc limit 1)
        and business_id=p_business_id;
  elsif is_new then
    insert into public.business_audit_events (business_id,action,resource_type,resource_id,metadata)
      values (p_business_id,'lead.public_created','lead',saved.id::text,jsonb_build_object('source','public_enquiry','handling_mode',p_mode));
  end if;
  return jsonb_build_object('id',saved.id,'handover_reason',effective_reason);
end;
$function$;

revoke all on function public.save_public_enquiry(uuid,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.save_public_enquiry(uuid,jsonb,text,text) to service_role;
