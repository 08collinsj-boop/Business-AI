import React from 'react';
import { contact, day, DirectoryState, Feedback, SearchField } from './primitives.jsx';

export function Quotes({ model }) {
  const saved = model.colzoRecords.quotes || [];
  const filtered = saved.filter(q => [q.title, q.status, q.notes].join(' ').toLowerCase().includes((model.search || '').toLowerCase()));
  return <div className="cn-approved-quotes">
    <header className="cn-screen-heading"><span className="cn-kicker">ESTIMATES / QUOTES</span><h1>Quotes</h1><p>Create and manage saved quote records.</p></header>
    <Feedback model={model}/><div className="cn-section-bar"><span className="cn-caption">{saved.length} saved quotes</span>
      <button className="cn-primary" type="button" data-colzo-create="quotes">+ New quote</button></div>
    <SearchField id="cnQuoteSearch" value={model.search} label="Search quotes" onChange={v => model.onSearch('search', v)}/>
    <div className="cn-stack"><DirectoryState model={model} resource="quotes" filtered={filtered}
      empty="No saved quotes yet. Create a draft quote linked to an existing enquiry." noMatch="No quotes match your search.">
      {filtered.map(q => {
        const lead = model.enquiries.find(l => String(l.id) === String(q.lead_id));
        return <button key={q.id} className="cn-record cf-lead-card" type="button" data-colzo-detail="quotes" data-colzo-id={q.id}>
          <span className="cn-avatar">£</span><span className="cn-record-main"><strong>{q.title}</strong><small>{lead ? contact(lead) : 'Related enquiry'} · {day(q.created_at)}</small>
            <span className={`cn-pill ${q.status === 'accepted' ? 'success' : 'attention'}`}>{q.status}</span></span>
          <span className="cn-record-end"><strong>£{Number(q.amount_gbp || 0).toFixed(2)}</strong><span aria-hidden="true">›</span></span>
        </button>;
      })}
    </DirectoryState></div><p className="cn-caption cn-approved-honesty">A saved quote is not the same as an issued or emailed quote. Sending remains a separate workflow.</p>
  </div>;
}
