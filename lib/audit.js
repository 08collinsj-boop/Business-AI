const SAFE_ACTION = /^[a-z][a-z0-9_.]{2,99}$/;
const SAFE_RESOURCE = /^[a-z][a-z0-9_]{1,63}$/;

function config() {
  const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

// Best-effort audit writes must never turn a valid business operation into a
// failure. Metadata is an allowlisted operational summary, never raw enquiry,
// token, phone, email, address, or free-text customer content.
export async function recordAuditEvent({ businessId, actorUserId = null, action, resourceType, resourceId = "", metadata = {} }) {
  const connection = config();
  if (!connection || typeof businessId !== "string" || !SAFE_ACTION.test(action || "") || !SAFE_RESOURCE.test(resourceType || "") || typeof resourceId !== "string" || resourceId.length > 200 || !metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const safeMetadata = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (/token|secret|password|email|phone|address|message|content|description|notes/i.test(key)) continue;
    if (["string", "number", "boolean"].includes(typeof value) && String(value).length <= 200) safeMetadata[key] = value;
  }
  try {
    const response = await fetch(`${connection.url}/rest/v1/business_audit_events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: connection.key, Authorization: `Bearer ${connection.key}`, Prefer: "return=minimal" },
      body: JSON.stringify({ business_id: businessId, actor_user_id: actorUserId, action, resource_type: resourceType, resource_id: resourceId, metadata: safeMetadata })
    });
    return response.ok;
  } catch { return false; }
}
