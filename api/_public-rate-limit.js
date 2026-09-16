// Best-effort, process-local foundation. It limits accidental/casual abuse
// before an OpenAI request without storing customer data. Serverless instances
// do not share memory, so production needs a durable shared store/WAF limiter.
const buckets = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_CLIENT = 20;
const MAX_PER_ROUTE = 120;

function keyPart(value) {
  return typeof value === "string" && value.length ? value.slice(0, 200) : "unknown";
}

function consume(key, limit, now) {
  const existing = buckets.get(key);
  const active = existing && now - existing.startedAt < WINDOW_MS ? existing : { startedAt: now, count: 0 };
  if (active.count >= limit) return false;
  active.count += 1;
  buckets.set(key, active);
  return true;
}

export function getPublicClientAddress(req) {
  const forwarded = req?.headers?.["x-forwarded-for"] || req?.headers?.["X-Forwarded-For"];
  return keyPart(Array.isArray(forwarded) ? forwarded[0] : String(forwarded || "").split(",")[0].trim());
}

export function checkPublicEnquiryRateLimit({ slug, clientAddress, now = Date.now() }) {
  // Bounded cleanup prevents long-lived local instances from retaining keys.
  if (buckets.size > 2000) for (const [key, value] of buckets) if (now - value.startedAt >= WINDOW_MS) buckets.delete(key);
  const route = keyPart(slug); const client = keyPart(clientAddress);
  const allowed = consume(`route:${route}`, MAX_PER_ROUTE, now) && consume(`client:${route}:${client}`, MAX_PER_CLIENT, now);
  return { allowed, retryAfterSeconds: Math.ceil(WINDOW_MS / 1000) };
}

export function resetPublicEnquiryRateLimitsForTest() { buckets.clear(); }
