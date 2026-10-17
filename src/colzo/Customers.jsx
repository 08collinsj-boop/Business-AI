import React from 'react';
import { contact, day, initials, DirectoryState, Feedback, SearchField } from './primitives.jsx';

export function Customers({ model }) {
  const saved = model.colzoRecords.clients || [];
  const match = values => values.join(' ').toLowerCase().includes((model.clientSearch || '').toLowerCase());
  const filtered = saved.filter(c => match([c.full_name, c.email, c.phone])).sort((a,b) => String(a.full_name).localeCompare(String(b.full_name)));
  const unique = new Map();
  model.enquiries.slice().sort((a,b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))).forEach(l => {
    const key = String(l.email || l.phone || l.name || '').trim().toLowerCase();
    if (key && !unique.has(key)) unique.set(key, l);
  });
  const contacts = [...unique.values()].filter(l => match([l.name,l.email,l.phone])).slice(0, 8);
  return <>
    <div className="cn-stitch-title"><div><h1>Customers</h1><p>{saved.length} saved customer{saved.length === 1 ? '' : 's'}</p></div>
      <button className="cn-stitch-add" data-colzo-create="clients" type="button" aria-label="Add customer">+</button></div>
    <Feedback model={model}/><SearchField id="cnClientSearch" value={model.clientSearch} label="Search saved customers" className="cn-stitch-search" onChange={v => model.onSearch('clientSearch', v)}/>
    <div className="cn-stitch-directory-label"><b>SAVED CUSTOMERS</b><span>{filtered.length} record{filtered.length === 1 ? '' : 's'}</span></div>
    <div className="cn-stitch-customer-list"><DirectoryState model={model} resource="clients" filtered={filtered}
      empty="No saved customers yet. Add a customer to create a persistent profile." noMatch="No customers match your search. Try a different name, email or phone number.">
      {filtered.map(c => <button className="cn-stitch-customer" type="button" key={c.id} data-colzo-detail="clients" data-colzo-id={c.id}>
        <span className="cn-avatar">{initials(c.full_name)}</span><span className="cn-stitch-customer-copy"><strong>{c.full_name}</strong><small>{c.email || c.phone || 'No contact details'}</small><small>Saved customer · {day(c.created_at)}</small></span><span aria-hidden="true">›</span>
      </button>)}
    </DirectoryState></div>
    <section className="cn-detail-panel"><h2>Enquiry contacts</h2><p className="cn-caption">These contacts are derived from existing enquiries and are not saved customer profiles.</p>
      <div className="cn-stitch-customer-list">{contacts.length ? contacts.map(l => <button className="cn-stitch-customer" type="button" key={l.id} data-cn-customer={l.id}>
        <span className="cn-avatar">{contact(l).slice(0,1).toUpperCase()}</span><span className="cn-stitch-customer-copy"><strong>{contact(l)}</strong><small>{l.email || l.phone || 'Enquiry contact'}</small></span><span aria-hidden="true">›</span>
      </button>) : <p className="cn-caption">No matching enquiry contacts.</p>}</div>
    </section>
  </>;
}
