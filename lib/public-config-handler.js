// Optional per-Preview safety check. Existing Pilot/Production remain unchanged if unset.
export function isApprovedSupabaseTarget({expectedRef=(process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF === 'feature/colzo-complete-ui-motion-20261017' ? 'mvwseobgkexzpmmkgcxe' : process.env.COLZO_EXPECTED_SUPABASE_PROJECT_REF),supabaseUrl=process.env.SUPABASE_URL}={}) {
  if (!expectedRef) return true;
  if (!/^[a-z0-9]{20}$/.test(String(expectedRef))) return false;
  try {
    const url = new URL(String(supabaseUrl || ''));
    return url.protocol === 'https:' && url.hostname === expectedRef + '.supabase.co'
      && !url.username && !url.password && !url.port && url.pathname === '/' && !url.search && !url.hash;
  } catch { return false; }
}

// Shape/role validation is a disclosure boundary, not JWT signature verification.
// Only Supabase validates whether the configured browser key belongs to a project.
export function isBrowserSafeSupabaseKey(key) {
  if (typeof key !== "string" || !key || key === process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  try {
    const parts = key.split(".");
    if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) return false;
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return claims?.role === "anon";
  } catch { return false; }
}

// This endpoint deliberately exposes only browser-safe Supabase configuration.
export default function handler(_req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (process.env.FRONTEND_AUTH_ENABLED !== "true") {
    return res.status(404).json({ error: "Not found" });
  }

  if (!isApprovedSupabaseTarget()) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'Authentication is unavailable' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !isBrowserSafeSupabaseKey(supabaseAnonKey)) {
    return res.status(503).json({ error: "Authentication is unavailable" });
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ frontendAuthEnabled: true, supabaseUrl, supabaseAnonKey, pilotFreeAccess: process.env.PILOT_FREE_STARTER_MARKETING === "true", colzoPasskeysEnabled: process.env.COLZO_PASSKEYS_ENABLED === "true" });
}
