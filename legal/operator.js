(() => {
  const text = (value, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : '';
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
      const address = text(legal.operator_address, 500);
      const email = text(legal.contact_email, 320);
      const company = text(legal.company_number, 80);
      const vat = text(legal.vat_number, 80);
      document.querySelectorAll('[data-legal-identity]').forEach(box => {
        if (!legal.identity_configured) return;
        box.replaceChildren();
        const title = document.createElement('strong');
        title.textContent = 'Service provider.';
        box.appendChild(title);
        add(box, 'Name', name);
        add(box, 'Geographic address', address);
        add(box, 'Email', email, 'mailto:' + email);
        add(box, 'Company/register number', company);
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