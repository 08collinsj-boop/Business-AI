import {
  isVoiceReceptionistEnabled,
  resolveInboundTenant,
  validateInboundCallEvent,
  voiceProviderRegistry
} from "./voice.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const config = { api: { bodyParser: false } };

function supabaseUrl(path) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Server configuration unavailable");
  return `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${path}`;
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(supabaseUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) throw new Error("Voice database request failed");
  return data;
}

async function readRawBody(req, maxBytes = 65536) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);
  if (req.body && typeof req.body === "object") return Buffer.from(JSON.stringify(req.body));
  if (!req || typeof req.on !== "function") return Buffer.alloc(0);
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("Webhook body too large"));
        req.resume?.();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function createVoiceRepository(request = supabaseRequest) {
  return {
    async findActivePhoneNumber(provider, e164Number) {
      const rows = await request(
        `voice_phone_numbers?e164_number=eq.${encodeURIComponent(e164Number)}&active=is.true&select=id,business_id,provider_connection_id,e164_number,voice_provider_connections!inner(provider,status)&limit=1`
      );
      const mapping = Array.isArray(rows) ? rows[0] : null;
      return mapping?.voice_provider_connections?.provider === provider && mapping.voice_provider_connections.status === "active"
        ? mapping
        : null;
    },
    async findCall(connectionId, providerCallId) {
      const rows = await request(`voice_calls?provider_connection_id=eq.${encodeURIComponent(connectionId)}&provider_call_id=eq.${encodeURIComponent(providerCallId)}&select=*&limit=1`);
      return Array.isArray(rows) ? rows[0] || null : null;
    },
    async createCall(record) {
      const rows = await request("voice_calls", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(record) });
      return Array.isArray(rows) ? rows[0] || null : rows;
    },
    async updateCall(id, businessId, updates) {
      const rows = await request(`voice_calls?id=eq.${encodeURIComponent(String(id))}&business_id=eq.${encodeURIComponent(businessId)}`, {
        method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(updates)
      });
      return Array.isArray(rows) ? rows[0] || null : rows;
    },
    async addEvent(record) {
      await request("voice_call_events", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(record) });
    }
  };
}

export function createVoiceWebhookHandler({ registry = voiceProviderRegistry, repository = createVoiceRepository(), enabled = isVoiceReceptionistEnabled } = {}) {
  return async function handler(req, res) {
    if (!enabled()) return res.status(404).json({ error: "Not found" });
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const provider = typeof req.query?.provider === "string" ? req.query.provider : "";
    const adapter = registry.get(provider);
    if (!adapter) return res.status(503).json({ error: "Voice provider is not configured" });

    try {
      const rawBody = await readRawBody(req);
      const requestUrl = String(req.url || "");
      const verified = await adapter.verifyWebhook({ headers: req.headers || {}, rawBody, requestUrl });
      if (verified !== true) return res.status(401).json({ error: "Webhook authentication failed" });

      const event = validateInboundCallEvent(await adapter.parseInboundEvent({ headers: req.headers || {}, rawBody }));
      if (!event) return res.status(400).json({ error: "Invalid voice event" });
      const tenant = await resolveInboundTenant(repository, { provider, calledNumber: event.calledNumber });
      if (!tenant) return res.status(404).json({ error: "Phone number is not configured" });

      let call = await repository.findCall(tenant.providerConnectionId, event.providerCallId);
      if (!call) {
        call = await repository.createCall({
          business_id: tenant.businessId,
          phone_number_id: tenant.phoneNumberId,
          provider_connection_id: tenant.providerConnectionId,
          provider_call_id: event.providerCallId,
          direction: "inbound",
          status: event.status,
          caller_number: event.callerNumber,
          called_number: tenant.calledNumber,
          started_at: event.occurredAt
        });
      } else if (call.business_id === tenant.businessId) {
        call = await repository.updateCall(call.id, tenant.businessId, { status: event.status, updated_at: event.occurredAt });
      } else {
        // A provider-call ID must never cross a mapped tenant boundary.
        return res.status(404).json({ error: "Phone number is not configured" });
      }
      if (!call?.id) throw new Error("Voice call persistence failed");
      await repository.addEvent({
        business_id: tenant.businessId,
        call_id: call.id,
        event_type: "provider_event",
        speaker: "system",
        provider_event_id: event.providerEventId,
        occurred_at: event.occurredAt
      });
      const response = adapter.buildResponse?.({ call, tenant, event }) || { status: 204 };
      if (response.headers) for (const [name, value] of Object.entries(response.headers)) res.setHeader?.(name, value);
      return res.status(response.status || 204).send?.(response.body || "");
    } catch (error) {
      if (error?.message === "Webhook body too large") return res.status(413).json({ error: "Webhook body too large" });
      console.error("Voice webhook error");
      return res.status(500).json({ error: "Could not process voice webhook" });
    }
  };
}

export default createVoiceWebhookHandler();
