export const AUTH_ROLES = Object.freeze(["owner", "admin", "member"]);

export function isTenancyAuthEnabled() {
  return process.env.TENANCY_AUTH_ENABLED === "true";
}

function safeError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function extractBearerToken(req) {
  const value = String(req.headers?.authorization || "");
  const match = value.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1]?.trim() || null;
}

async function supabase(path, options = {}) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw safeError(500, "Server authentication is unavailable");
  }
  const response = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) throw safeError(500, "Server authentication is unavailable");
  return data;
}

export async function requireAuthenticatedUser(req) {
  if (!isTenancyAuthEnabled()) {
    return { enforced: false, userId: null };
  }
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw safeError(500, "Server authentication is unavailable");
  }
  const token = extractBearerToken(req);
  if (!token) throw safeError(401, "Authentication is required");
  // Always ask Supabase Auth to verify the presented token. JWT contents,
  // metadata and any browser claims are deliberately ignored.
  const userResponse = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/user`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` }
  });
  if (!userResponse.ok) throw safeError(401, "Authentication is invalid or expired");
  const user = await userResponse.json();
  if (!user?.id) throw safeError(401, "Authentication is invalid or expired");
  return { enforced: true, userId: user.id };
}

export async function requireBusinessMember(req, allowedRoles = null) {
  if (!isTenancyAuthEnabled()) {
    return { enforced: false, userId: null, businessId: null, role: null };
  }

  if (allowedRoles !== null && (!Array.isArray(allowedRoles) || !allowedRoles.every((role) => AUTH_ROLES.includes(role)))) {
    throw safeError(500, "Server authentication is unavailable");
  }

  const user = await requireAuthenticatedUser(req);

  const memberships = await supabase(`/rest/v1/business_memberships?user_id=eq.${encodeURIComponent(user.userId)}&select=business_id,role&limit=2`);
  if (!Array.isArray(memberships) || memberships.length !== 1) {
    throw safeError(403, "No authorised business membership");
  }
  const membership = memberships[0];
  if (!membership?.business_id || !AUTH_ROLES.includes(membership.role)) {
    throw safeError(403, "No authorised business membership");
  }
  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw safeError(403, "You are not authorised for this action");
  }
  return { enforced: true, userId: user.userId, businessId: membership.business_id, role: membership.role };
}

export function requireBusinessAdmin(req) {
  return requireBusinessMember(req, ["owner", "admin"]);
}

export function sendAuthError(res, error) {
  const status = [401, 403, 500].includes(error?.status) ? error.status : 500;
  const message = status === 401
    ? "Authentication is required"
    : status === 403
      ? "You are not authorised for this action"
      : "Server authentication is unavailable";
  return res.status(status).json({ error: message });
}
