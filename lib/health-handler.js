// Deliberately shallow: no secrets, database rows, tenant identifiers or
// provider configuration are returned to unauthenticated callers.
export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const ready = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.OPENAI_API_KEY);
  res.setHeader?.("Cache-Control", "no-store");
  return res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "unavailable" });
}
