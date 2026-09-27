function safe(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const legal = {
    operator_name: safe(process.env.LEGAL_OPERATOR_NAME, 200),
    operator_address: safe(process.env.LEGAL_OPERATOR_ADDRESS, 500),
    contact_email: safe(process.env.LEGAL_CONTACT_EMAIL, 320),
    company_number: safe(process.env.LEGAL_COMPANY_NUMBER, 80),
    vat_number: safe(process.env.LEGAL_VAT_NUMBER, 80)
  };
  legal.identity_configured = Boolean(
    legal.operator_name && legal.operator_address && legal.contact_email
  );
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=300');
  return res.status(200).json({ legal });
}
