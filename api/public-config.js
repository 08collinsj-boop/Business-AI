// This endpoint deliberately exposes only browser-safe Supabase configuration.
export default function handler(_req, res) {
  if (process.env.FRONTEND_AUTH_ENABLED !== "true") {
    return res.status(404).json({ error: "Not found" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(503).json({ error: "Authentication is unavailable" });
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ frontendAuthEnabled: true, supabaseUrl, supabaseAnonKey });
}
