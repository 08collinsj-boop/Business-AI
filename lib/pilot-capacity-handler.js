// Pilot recruitment goals must come from explicitly verified figures, never from all business accounts.
export function parsePilotCapacity(totalValue, confirmedValue) {
  if (!/^[1-9][0-9]{0,2}$/.test(String(totalValue ?? '')) || !/^(0|[1-9][0-9]{0,2})$/.test(String(confirmedValue ?? ''))) return null;
  const total = Number(totalValue);
  const confirmed = Number(confirmedValue);
  return confirmed <= total ? { total, confirmed } : null;
}

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const host = String(req.headers?.host || '').toLowerCase().split(':')[0];
  if (!/^business-ai-pilot(?:-[a-z0-9-]+)?\.vercel\.app$/.test(host)) return res.status(200).json({ status: 'unverified' });
  const goal = parsePilotCapacity(process.env.PILOT_GOAL_TOTAL, process.env.PILOT_CONFIRMED_SIGNUPS);
  if (!goal) return res.status(200).json({ status: 'unverified' });
  return res.status(200).json({ status: 'verified', goal: goal.total, confirmed: goal.confirmed });
}
