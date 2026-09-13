const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function supabaseUrl(path) {
  if (!SUPABASE_URL) {
    throw new Error('SUPABASE_URL is not configured');
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  return `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/${path}`;
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(supabaseUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      typeof data === 'string'
        ? data
        : data?.message || data?.error || `Supabase error ${response.status}`
    );
  }

  return data;
}

export default async function handler(req, res) {
  try {
    // GET /api/leads
    if (req.method === 'GET') {
      const leads = await supabaseRequest(
        'leads?select=*&order=created_at.desc'
      );

      return res.status(200).json(
        Array.isArray(leads) ? leads : []
      );
    }

    // PATCH /api/leads
    if (req.method === 'PATCH') {
      const body =
        typeof req.body === 'string'
          ? JSON.parse(req.body)
          : req.body || {};

      const id = body.id;
      const status = String(body.status || '').trim();

      if (!id) {
        return res.status(400).json({
          error: 'Lead ID is required'
        });
      }

      const allowedStatuses = [
        'New',
        'Contacted',
        'Converted'
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Invalid status'
        });
      }

      const query =
        `leads?id=eq.${encodeURIComponent(String(id))}`;

      const updated = await supabaseRequest(query, {
        method: 'PATCH',
        headers: {
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          status
        })
      });

      return res.status(200).json(
        Array.isArray(updated) ? updated[0] || null : updated
      );
    }

    return res.status(405).json({
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Leads API error:', error);

    return res.status(500).json({
      error: error.message || 'Could not load leads'
    });
  }
}
