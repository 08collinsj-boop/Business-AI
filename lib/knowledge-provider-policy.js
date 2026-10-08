import { logOperationalEvent } from './operational-log.js';

const providerCooldowns = new Map();
export function resetKnowledgeProviderCooldowns() { providerCooldowns.clear(); }

const HARD_CODES = new Set(['insufficient_quota', 'credit_balance_exhausted', 'billing_hard_limit_reached', 'organization_spend_limit_exceeded', 'project_spend_limit_exceeded', 'organization_usage_limit_exceeded']);
const SAFE_CODES = new Set([...HARD_CODES, 'rate_limit_exceeded', 'model_not_found', 'invalid_request_error']);

export function knowledgeProviderDiagnostic(response, data) {
  const e = data?.error || {};
  const code = SAFE_CODES.has(e.code) ? e.code : Number.isInteger(e.code) ? e.code : 'unknown';
  const type = SAFE_CODES.has(e.type) ? e.type : 'unknown';
  const message = String(e.message || '').toLowerCase();
  const permanent = HARD_CODES.has(e.code) || HARD_CODES.has(e.type) || /credits? (?:exhausted|remaining)|insufficient (?:credits|quota)|exceeded your current quota|daily.*limit|limit.*(?:per.day|daily)|free-models-per-day/.test(message);
  const transient = !permanent && (e.code === 'rate_limit_exceeded' || e.metadata?.error_type === 'rate_limit_exceeded' || /rate limit|temporarily rate.limited|too many requests/.test(message));
  return { status: response.status, code, type, quota_exhausted: permanent, transient_rate_limit: transient };
}

export function retryAfterMilliseconds(value, now = Date.now()) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : null;
}

// At most one retry, eight seconds per delay and twelve seconds total backoff.
// Long Retry-After and quota failures stop; never shorten a provider's delay.
export async function knowledgeProviderFetch(url, options, provider, { sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), random = Math.random, now = Date.now } = {}) {
  const blocked = providerCooldowns.get(provider);
  if (blocked && blocked.until > now()) throw blocked.error;
  let spent = 0;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await fetch(url, options);
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* invalid output is handled by extraction */ }
    if (response.ok) return { response, data };
    const diagnostic = knowledgeProviderDiagnostic(response, data);
    logOperationalEvent('knowledge.provider_error', { provider, attempt, ...diagnostic });
    const hint = retryAfterMilliseconds(response.headers?.get?.('retry-after'), now());
    const delay = Math.max(hint ?? 0, 1000 * 2 ** (attempt - 1) + Math.floor(random() * 250));
    if (response.status !== 429 || diagnostic.quota_exhausted || (!diagnostic.transient_rate_limit && hint === null) || attempt === 2 || delay > 8000 || spent + delay > 12000) {
      const error = Object.assign(new Error('Knowledge extraction is temporarily unavailable'), { status: 502, providerStatus: response.status, providerDiagnostic: diagnostic, retryAfterMs: hint });
      if (response.status === 429) providerCooldowns.set(provider, { until: now() + Math.max(hint ?? 0, diagnostic.quota_exhausted ? 300000 : 30000), error });
      throw error;
    }
    spent += delay;
    logOperationalEvent('knowledge.provider_backoff', { provider, attempt, delay_ms: delay });
    await sleep(delay);
  }
}

export async function checkOpenRouterFreeAllowance() {
  const response = await fetch('https://openrouter.ai/api/v1/key', { headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw Object.assign(new Error('Could not check free Knowledge allowance'), { status: 503 });
  const data = await response.json();
  const daily = data?.data?.free_model_daily_requests;
  if (daily && Number.isFinite(daily.remaining) && daily.remaining <= 0) {
    logOperationalEvent('knowledge.free_allowance_exhausted', { remaining: 0 });
    throw Object.assign(new Error('Free Knowledge allowance is unavailable. Add a fact manually or retry after the allowance resets.'), { status: 429, retryAfterMs: Math.max(1000, Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1) - Date.now()) });
  }
}
