(() => {
  const text = (value, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  const humanType = value => {
    const raw = text(value, 80);
    const normalized = raw.toLowerCase();
    if (normalized === 'sole_trader') return 'Sole trader';
    if (normalized === 'limited_company') return 'Limited company';
    if (normalized === 'partnership') return 'Partnership';
    return raw;
  };
  const add = (parent, label, value, link = null) => {
    if (!value) return;
    const line = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = label + ': ';
    line.appendChild(strong);
    if (link) {
      const a = document.createElement('a');
      a.href = link;
      a.textContent = value;
      line.appendChild(a);
    } else {
      line.appendChild(document.createTextNode(value));
    }
    parent.appendChild(line);
  };
  fetch('/api/legal-public', { headers: { Accept: 'application/json' }, cache: 'no-store' })
    .then(response => response.ok ? response.json() : null)
    .then(data => {
      const legal = data?.legal || {};
      const name = text(legal.operator_name, 200);
      const trading = text(legal.trading_name, 200);
      const type = humanType(legal.operator_type);
      const address = text(legal.operator_address, 500);
      const email = text(legal.contact_email, 320);
      const phone = text(legal.contact_phone, 80);
      const phoneHref = phone ? 'tel:' + phone.replace(/[^\d+]/g, '') : null;
      const company = text(legal.company_number, 80);
      const vat = text(legal.vat_number, 80);
      document.querySelectorAll('[data-legal-identity]').forEach(box => {
        if (!legal.identity_configured) return;
        box.replaceChildren();
        const title = document.createElement('strong');
        title.textContent = 'Service provider.';
        box.appendChild(title);
        add(box, 'Legal name', name);
        add(box, 'Trading name', trading);
        add(box, 'Business structure', type);
        add(box, 'Geographic address', address);
        add(box, 'Email', email, 'mailto:' + email);
        add(box, 'Telephone', phone, phoneHref);
        add(box, 'Company number', company);
        add(box, 'VAT number', vat);
      });
      document.querySelectorAll('[data-legal-readiness]').forEach(box => {
        box.textContent = legal.identity_configured
          ? 'Service-provider identity is configured. Public launch still depends on completing the organisation-specific compliance checklist, provider transfer review and any required ICO fee registration.'
          : box.textContent;
      });
    })
    .catch(() => {});
})();
