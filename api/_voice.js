import { getBusinessSettings, saveLead } from "./enquiry.js";

const E164 = /^\+[1-9][0-9]{7,14}$/;
const PROVIDER_NAME = /^[a-z][a-z0-9_-]{1,39}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CALL_STATUSES = new Set([
  "received", "ringing", "in_progress", "completed", "missed", "failed", "escalated"
]);
const EVENT_TYPES = new Set([
  "provider_event", "caller_turn", "assistant_turn", "lead_linked", "booking_requested",
  "action_created", "handover_requested", "emergency_escalated", "call_completed"
]);

/**
 * Voice is deliberately a separate exact-value gate. A deployed application
 * has no public phone webhook until an owner has configured a provider and
 * explicitly enabled it in that environment.
 */
export function isVoiceReceptionistEnabled() {
  return process.env.VOICE_RECEPTIONIST_ENABLED === "true";
}

export function normaliseE164(value) {
  if (typeof value !== "string") return null;
  const compact = value.trim().replace(/[\s().-]/g, "");
  const candidate = compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
  return E164.test(candidate) ? candidate : null;
}

export function normaliseProviderName(value) {
  const name = typeof value === "string" ? value.trim().toLowerCase() : "";
  return PROVIDER_NAME.test(name) ? name : null;
}

/**
 * Provider adapters are the only provider-specific boundary. An adapter must
 * authenticate the raw webhook before the app resolves a tenant or writes a
 * call. It must return normalized values; the shared layer validates them
 * again before using them.
 *
 * @typedef {{
 *   name: string,
 *   verifyWebhook: (input: {headers: object, rawBody: Buffer, requestUrl: string}) => Promise<boolean>,
 *   parseInboundEvent: (input: {headers: object, rawBody: Buffer}) => Promise<object>,
 *   buildResponse?: (input: object) => {status?: number, headers?: object, body?: string}
 * }} VoiceProviderAdapter
 */
export function createVoiceProviderRegistry(adapters = []) {
  const registry = new Map();
  for (const adapter of adapters) {
    const name = normaliseProviderName(adapter?.name);
    if (!name || typeof adapter?.verifyWebhook !== "function" || typeof adapter?.parseInboundEvent !== "function") {
      throw new Error("Invalid voice provider adapter");
    }
    if (registry.has(name)) throw new Error("Duplicate voice provider adapter");
    registry.set(name, adapter);
  }
  return Object.freeze({ get: (provider) => registry.get(normaliseProviderName(provider)) || null });
}

// No provider is enabled merely by shipping this code. A future provider
// integration must be added here only with a server-side signature verifier.
export const voiceProviderRegistry = createVoiceProviderRegistry();

export function validateInboundCallEvent(event) {
  if (!event || typeof event !== "object") return null;
  const providerCallId = typeof event.providerCallId === "string" ? event.providerCallId.trim() : "";
  const calledNumber = normaliseE164(event.calledNumber);
  const callerNumber = event.callerNumber ? normaliseE164(event.callerNumber) : null;
  const status = CALL_STATUSES.has(event.status) ? event.status : "received";
  const providerEventId = typeof event.providerEventId === "string" ? event.providerEventId.trim() : "";
  if (!providerCallId || providerCallId.length > 200 || !calledNumber || (event.callerNumber && !callerNumber)) return null;
  return {
    providerCallId,
    providerEventId: providerEventId.slice(0, 200),
    calledNumber,
    callerNumber: callerNumber || "",
    status,
    occurredAt: typeof event.occurredAt === "string" && !Number.isNaN(new Date(event.occurredAt).getTime())
      ? new Date(event.occurredAt).toISOString()
      : new Date().toISOString()
  };
}

/**
 * The mapping query has no browser/provider business ID input. The webhook
 * adapter selects a provider only after verification; the called number then
 * resolves the authoritative tenant server-side.
 */
export async function resolveInboundTenant(repository, { provider, calledNumber }) {
  const providerName = normaliseProviderName(provider);
  const e164Number = normaliseE164(calledNumber);
  if (!providerName || !e164Number || !repository?.findActivePhoneNumber) return null;
  const mapping = await repository.findActivePhoneNumber(providerName, e164Number);
  if (!mapping?.business_id || !mapping?.provider_connection_id || mapping.e164_number !== e164Number) return null;
  return {
    businessId: mapping.business_id,
    phoneNumberId: mapping.id,
    providerConnectionId: mapping.provider_connection_id,
    calledNumber: e164Number
  };
}

export function assessCallSafety(text) {
  const message = typeof text === "string" ? text.toLowerCase() : "";
  const emergency = /\b(fire|electric shock|electrocut|smell(?:ing)? gas|gas leak|unconscious|not breathing|immediate danger)\b/.test(message);
  if (emergency) {
    return {
      level: "emergency",
      handover: true,
      response: "If anyone is in immediate danger, contact the emergency services now. I cannot diagnose or safely manage an emergency over the phone."
    };
  }
  const handover = /\b(speak to (?:a )?person|human|manager|complaint|urgent help|call me back)\b/.test(message);
  return handover
    ? { level: "handover", handover: true, response: "I will arrange for a member of the team to take this forward." }
    : { level: "normal", handover: false, response: null };
}

export function buildVoiceReceptionistContext(settings = {}) {
  return {
    businessName: settings.business_name || "the business",
    businessType: settings.business_type || "",
    services: settings.services || "",
    serviceAreas: settings.address || "",
    openingHours: settings.opening_hours || "",
    contactPhone: settings.phone || "",
    aiInstructions: settings.ai_instructions || "",
    urgentJobsEnabled: settings.urgent_jobs_enabled !== false,
    rules: [
      "Do not promise availability, prices, attendance times, policies, or a confirmed booking unless a server-authorized action has succeeded.",
      "Create booking requests only; confirmation requires the business availability/rules workflow.",
      "Escalate emergencies and explicit human-handover requests rather than attempting to resolve them."
    ]
  };
}

export function createBookingRequestFromVoice(input = {}) {
  return {
    lead_id: input.leadId || null,
    title: typeof input.title === "string" && input.title.trim() ? input.title.trim().slice(0, 200) : "Phone booking request",
    starts_at: input.startsAt || null,
    ends_at: input.endsAt || null,
    location: typeof input.location === "string" ? input.location.trim().slice(0, 500) : "",
    notes: typeof input.notes === "string" ? input.notes.trim().slice(0, 5000) : "Requested during phone conversation",
    status: "requested",
    source: "ai_request"
  };
}

export function createFollowUpActionFromVoice(input = {}) {
  return {
    lead_id: input.leadId || null,
    booking_id: input.bookingId || null,
    title: typeof input.title === "string" && input.title.trim() ? input.title.trim().slice(0, 200) : "Follow up phone enquiry",
    description: typeof input.description === "string" ? input.description.trim().slice(0, 5000) : "Created from phone receptionist handover",
    action_type: "follow_up",
    priority: input.priority || "normal",
    status: "pending"
  };
}

/**
 * This is an internal-only bridge for a future speech/AI adapter. The caller
 * must supply a business ID produced by resolveInboundTenant, never a request
 * body value. It reuses the same lead de-duplication and storage path as the
 * web receptionist.
 */
export async function captureVoiceLead({ businessId, lead }) {
  if (typeof businessId !== "string" || !UUID.test(businessId) || !lead || typeof lead !== "object") {
    throw new Error("Invalid trusted voice lead context");
  }
  return saveLead(lead, businessId);
}

export async function loadVoiceBusinessContext(businessId) {
  if (typeof businessId !== "string" || !businessId) throw new Error("Invalid trusted voice context");
  const settings = await getBusinessSettings(businessId);
  if (!settings?.business_name) throw new Error("Voice business configuration is unavailable");
  return buildVoiceReceptionistContext(settings);
}
