/**
 * Preview-only compatibility probe. NO service-role credentials, mutations,
 * dynamic URL destinations, or customer-supplied paths. The original app
 * validates a user's access token and tenant membership for each GET.
 */
const ORIGINAL_BASE = 'https://app.getbusiness-ai.com';
const ORIGINAL_AUTH_PROJECT = 'mvwseobgkexzpmmkgcxe.supabase.co';
const TOKEN_PATTERN = /^Bearer ([A-Za-z0-9_-]+\.){2}[A-Za-z0-9_-]+$/;
const TIMEOUT_MS = 7500;

function pinnedConfig(data) {
  if (!data?.frontendAuthEnabled || typeof data.supabaseAnonKey !== 'string' || !data.supabaseAnonKey.trim()) return null;
  try {
    const url = new URL(data.supabaseUrl);
    if (url.protocol !== 'https:' || url.hostname !== ORIGINAL_AUTH_PROJECT || url.pathname !== '/' || url.search || url.hash || url.username || url.password) return null;
  } catch { return null; }
  return { supabaseUrl: `https://${ORIGINAL_AUTH_PROJECT}`, supabaseAnonKey: data.supabaseAnonKey };
}

async function originalGet(path, bearer, fetchImpl) {
  const url = ORIGINAL_BASE + path; // constant, allowlisted path only
  return fetchImpl(url, {
    method: 'GET', redirect: 'error', cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: 'application/json', ...(bearer ? { Authorization: bearer } : {}) }
  });
}

export async function readOriginalPublicConfig(fetchImpl = fetch) {
  const response = await originalGet('/api/public-config', null, fetchImpl);
  if (!response.ok) return null;
  return pinnedConfig(await response.json());
}

export async function readOwnerEnquiries(bearer, fetchImpl = fetch) {
  if (typeof bearer !== 'string' || bearer.length > 8192 || !TOKEN_PATTERN.test(bearer)) {
    return { status: 401, body: { error: 'An authorised sign-in is required' } };
  }
  const response = await originalGet('/api/leads', bearer, fetchImpl);
  if (response.status === 401 || response.status === 403) return {status: response.status, body: {error: 'The original app did not authorise this account or business'} };
  if (!response.ok) return {status: 503, body: {error: 'The original app could not return enquiries right now'} };
  const payload = await response.json();
  if (!Array.isArray(payload)) return {status: 503, body: {error: 'Unexpected response from the original app'} };
  const items = payload.slice(0, 100).map(row => ({
    id: typeof row?.id === 'number' || typeof row?.id === 'string' ? String(row.id).slice(0, 50) : '',
    name: typeof row?.name === 'string' ? row.name.slice(0, 160) : '',
    job_type: typeof row?.job_type === 'string' ? row.job_type.slice(0, 160) : '',
    status: typeof row?.status === 'string' ? row.status.slice(0, 40) : '',
    created_at: typeof row?.created_at === 'string' ? row.created_at.slice(0, 64) : ''
  }));
  return {status: 200, body: {items, truncated: payload.length > 100, count: items.length} };
}

/** Return narrowly scoped, allowlisted display fields from the original API. */
export async function readOriginalWork(kind, bearer, fetchImpl = fetch) {
  if (!['bookings', 'actions'].includes(kind)) return {status:404, body:{error:'Not found'}};
  if (typeof bearer !== 'string' || bearer.length > 8192 || !TOKEN_PATTERN.test(bearer)) {
    return { status:401, body:{error:'An authorised sign-in is required'} };
  }
  const response=await originalGet(kind==='bookings'?'/api/bookings':'/api/actions',bearer,fetchImpl);
  if (response.status===401||response.status===403) return {status:response.status,body:{error:'The original app did not authorise this account or business'}};
  if (!response.ok) return {status:503,body:{error:'The original app could not return this information now'}};
  const payload=await response.json();
  if(!Array.isArray(payload))return {status:503,body:{error:'Unexpected response from the original app'}};
  const clamp=(value,max=160)=>typeof value==='string'?value.slice(0,max):'';
  const id=value=>(typeof value==='number'&&Number.isSafeInteger(value)&&value>0)||typeof value==='string'&&/^[1-9]\d{0,17}$/.test(value)?String(value):'';
  const items=payload.slice(0,100).map(row=>kind==='bookings'?{
    id:id(row?.id),lead_id:id(row?.lead_id),title:clamp(row?.title),customer_name:clamp(row?.customer_name),
    status:clamp(row?.status,32),starts_at:clamp(row?.starts_at,64),ends_at:clamp(row?.ends_at,64)
  }:{
    id:id(row?.id),lead_id:id(row?.lead_id),title:clamp(row?.title),status:clamp(row?.status,32),
    priority:clamp(row?.priority,24),due_at:clamp(row?.due_at,64),action_type:clamp(row?.action_type,48)
  });
  return {status:200,body:{items,count:items.length,truncated:payload.length>100}};
}

export default async function originalReadOnlyHandler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method !== 'GET') return res.status(405).json({error: 'Read-only test: this endpoint accepts GET only'});
  if (process.env.VERCEL_ENV !== 'preview') return res.status(404).json({error: 'Not found'});
  const kind = req.query?.kind;
  if (!['config','enquiries','bookings','actions'].includes(kind)) return res.status(404).json({error: 'Not found'});
  try {
    if (kind === 'config') {
      const config = await readOriginalPublicConfig();
      return config ? res.status(200).json(config) : res.status(503).json({error: 'Original authentication configuration could not be verified'});
    }
    const reply = kind === 'enquiries' ? await readOwnerEnquiries(req.headers?.authorization) : await readOriginalWork(kind,req.headers?.authorization);
    return res.status(reply.status).json(reply.body);
  } catch { return res.status(503).json({error: 'Read-only compatibility test temporarily unavailable'}); }
}
