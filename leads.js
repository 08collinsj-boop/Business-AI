export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return res.status(500).json({
      error: 'Supabase server configuration is missing'
    });
  }

  if (req.method === 'GET') {
    try {
      const r = await fetch(
        `${url}/rest/v1/leads?select=*&order=created_at.desc`,
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`
          }
        }
      );

      const data = await r.json();

      if (!r.ok) {
        return res.status(502).json({
          error: data?.message || 'Could not load leads'
        });
      }

      return res.status(200).json(data);
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        error: 'Server error'
      });
    }
  }

  if (req.method === 'PATCH') {
    const body = req.body || {};
    const id = Number(body.id);
    const status = String(body.status || '');

    if (
      !Number.isInteger(id) ||
      !['New', 'Contacted', 'Converted'].includes(status)
    ) {
      return res.status(400).json({
        error: 'Invalid id or status'
      });
    }

    try {
      const r = await fetch(
        `${url}/rest/v1/leads?id=eq.${encodeURIComponent(String(id))}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: key,
            Authorization: `Bearer ${key}`,
            Prefer: 'return=representation'
          },
          body: JSON.stringify({ status })
        }
      );

      const data = await r.json();

      if (!r.ok) {
        return res.status(502).json({
          error: data?.message || 'Could not update lead'
        });
      }

      return res.status(200).json(data[0] || null);
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        error: 'Server error'
      });
    }
  }

  return res.status(405).json({
    error: 'Method not allowed'
  });
}
