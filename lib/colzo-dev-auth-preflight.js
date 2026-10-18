import { isApprovedSupabaseTarget } from './public-config-handler.js';

const DEV_BRANCH = 'feature/colzo-complete-ui-motion-20261017';
const DEV_URL = 'https://mvwseobgkexzpmmkgcxe.supabase.co';

// Temporary read-only Dev credential check. No Supabase rows are fetched,
// response bodies consumed, identities logged, or secrets returned.
export default async function handler(req, res) {
  res.setHeader?.('Cache-Control', 'no-store');
  if (process.env.VERCEL_ENV !== 'preview'
    || process.env.VERCEL_GIT_COMMIT_REF !== DEV_BRANCH
    || !isApprovedSupabaseTarget()
    || process.env.SUPABASE_URL !== DEV_URL) {
    return res.status(404).json({error:'Not found'});
  }
  if (req.method !== 'GET') return res.status(405).json({error:'Method not allowed'});
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return res.status(503).json({status:'blocked',backendCredential:'unconfigured'});

  try {
    const response = await fetch(
      DEV_URL + '/rest/v1/business_memberships?select=business_id&limit=0',
      {method:'GET',headers:{apikey:key,Authorization:'Bearer '+key},
       signal:AbortSignal.timeout(7000),cache:'no-store'}
    );
    if (response.ok) return res.status(200).json({status:'ready',backendCredential:'accepted'});
    const status = Number.isInteger(response.status) && response.status>=100 && response.status<=599
      ? response.status : 0;
    return res.status(503).json({status:'blocked',backendCredential:'rejected',upstreamStatus:status});
  } catch {
    return res.status(503).json({status:'blocked',backendCredential:'unreachable'});
  }
}
