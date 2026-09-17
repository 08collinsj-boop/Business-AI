import { assessCallSafety } from "./voice.js";

// Development/test-only orchestration seam. It has no HTTP handler, accepts a
// tenant context only from trusted test/provider code, and cannot dial a phone.
export async function simulateInboundVoiceCall({ tenant, turns = [], repository, lead = null } = {}) {
  if (!tenant?.businessId || !repository?.createCall || !repository?.addEvent) throw new Error("Invalid simulated call context");
  const call = await repository.createCall({ business_id: tenant.businessId, provider_call_id: `simulation:${crypto.randomUUID()}`, direction: "inbound", status: "in_progress", caller_number: "", called_number: "", transcript_summary: "Simulated development call" });
  if (!call?.id) throw new Error("Could not create simulated call");
  let safety = { level: "normal", handover: false };
  for (const turn of turns) {
    const speaker = turn?.speaker === "assistant" ? "assistant" : "caller";
    const content = typeof turn?.content === "string" ? turn.content.slice(0, 2000) : "";
    if (!content) continue;
    if (speaker === "caller") safety = assessCallSafety(content).handover ? assessCallSafety(content) : safety;
    await repository.addEvent({ business_id: tenant.businessId, call_id: call.id, event_type: speaker === "caller" ? "caller_turn" : "assistant_turn", speaker, content });
  }
  let savedLead = null;
  if (lead && repository.captureLead) { savedLead = await repository.captureLead({ businessId: tenant.businessId, lead }); if (savedLead?.id) await repository.addEvent({ business_id: tenant.businessId, call_id: call.id, event_type: "lead_linked", speaker: "system", content: "Lead linked" }); }
  let action = null;
  if (safety.handover && savedLead?.id && repository.createFollowUp) { action = await repository.createFollowUp({ businessId: tenant.businessId, leadId: savedLead.id, priority: "urgent" }); await repository.addEvent({ business_id: tenant.businessId, call_id: call.id, event_type: safety.level === "emergency" ? "emergency_escalated" : "handover_requested", speaker: "system", content: safety.level }); }
  const status = safety.handover ? "escalated" : lead ? "completed" : "missed";
  const updated = await repository.updateCall?.(call.id, tenant.businessId, { status, lead_id: savedLead?.id || null, action_id: action?.id || null, handover_status: safety.handover ? "requested" : "not_requested", escalation_reason: safety.level === "normal" ? "" : safety.level, ended_at: new Date().toISOString() }) || call;
  await repository.addEvent({ business_id: tenant.businessId, call_id: call.id, event_type: "call_completed", speaker: "system", content: status });
  return { call: updated, lead: savedLead, action, safety };
}
