import React from 'react';
import { contact, day, EmptyState, initials, LoadingState, stage } from './primitives.jsx';

function Back({ resource }) {
  return <button className="cn-back" data-cn-screen={resource} type="button" aria-label={`Back to ${resource === 'clients' ? 'customers' : resource}`}>← {resource === 'clients' ? 'Customers' : resource === 'projects' ? 'Projects' : 'Quotes'}</button>;
}
function Edit({ resource, record }) {
  return resource === 'quotes' && ['sent','accepted'].includes(record.status)
    ? <p className="cn-caption">Quote terms are locked after issuing. Editing is unavailable here.</p>
    : <button className="cn-primary" type="button" data-colzo-edit={resource} data-colzo-id={record.id}>Edit details</button>;
}
function QuoteDetails({ model, record }) {
  const lead = model.enquiries.find(l => String(l.id) === String(record.lead_id));
  return <section className="cn-approved-quote-detail" aria-label="Saved quote details">
    <header className="cn-approved-detail-top"><Back resource="quotes"/><h1>Quote details</h1></header>
    <section className="cn-approved-estimate" aria-label="Saved quote estimate"><div className="cn-approved-estimate-meta"><span>{day(record.created_at)}</span><span className="cn-pill">{record.status || 'draft'}</span></div>
      <h2>{record.title || 'Untitled quote'}</h2><p>Price estimate</p><strong>£{Number(record.amount_gbp || 0).toFixed(2)} <small>GBP</small></strong></section>
    <section className="cn-approved-info-card"><h2>LINKED RECORDS</h2>{lead ? <button type="button" className="cn-approved-related" data-cn-lead={lead.id}><span><small>Customer</small><strong>{contact(lead)}</strong><small>Linked enquiry · {lead.job_type || 'General enquiry'}</small></span><span aria-hidden="true">›</span></button> : <p className="cn-caption">No matching enquiry is available in this workspace.</p>}</section>
    <section className="cn-approved-info-card"><h2>WORK DESCRIPTION / NOTES</h2><p className="cn-approved-note">{record.notes || 'No quote notes recorded.'}</p></section>
    <p className="cn-approved-quote-boundary">This is a saved quote record. Sending quotes and collecting customer payments are unavailable here. A saved status does not confirm delivery.</p>
    <div className="cn-approved-quote-actions"><Edit resource="quotes" record={record}/></div>
  </section>;
}
function CustomerDetails({ model, record }) {
  const norm = v => String(v || '').trim().toLowerCase();
  const email = norm(record.email), phone = String(record.phone || '').replace(/\D/g,'');
  const tel = String(record.phone || '').replace(/[^+\d]/g,'');
  const related = model.enquiries.filter(l => (email && norm(l.email) === email) || (phone && String(l.phone || '').replace(/\D/g,'') === phone));
  const activity = model.customerProfileTab === 'activity';
  const relatedRows = related.slice(0,activity ? 20 : 12).map(l => <button className="cn-approved-related" type="button" key={l.id} data-cn-lead={l.id}><span><strong>{l.job_type || 'Customer enquiry'}</strong><small>{day(l.created_at)} · {stage(l)}</small></span><span aria-hidden="true">›</span></button>);
  return <section className="cn-approved-profile" aria-label="Saved customer profile">
    <header className="cn-approved-detail-top"><Back resource="clients"/><button className="cn-approved-text-action" type="button" data-colzo-edit="clients" data-colzo-id={record.id}>Edit</button></header>
    <div className="cn-approved-contact-head"><span className="cn-approved-avatar">{initials(record.full_name)}</span><h1>{record.full_name}</h1><p>Saved customer profile</p></div>
    <div className="cn-approved-contact-actions">{tel ? <a href={`tel:${tel}`} aria-label={`Call ${record.full_name}`}><span aria-hidden="true">☎</span>Call</a> : <span className="cn-approved-disabled-action">Call unavailable</span>}
      {email ? <a href={`mailto:${record.email}`} aria-label={`Email ${record.full_name}`}><span aria-hidden="true">✉</span>Email</a> : <span className="cn-approved-disabled-action">Email unavailable</span>}
      <button type="button" data-cn-screen="bookings"><span aria-hidden="true">▣</span>Bookings</button></div>
    <div className="cn-approved-tabs" role="group" aria-label="Customer profile sections">{['overview','activity'].map(t => <button key={t} type="button" data-cn-client-profile-tab={t} aria-pressed={activity === (t === 'activity')}>{t === 'overview' ? 'Overview' : 'Activity'}</button>)}</div>
    {!activity && <section className="cn-approved-info-card"><h2>CONTACT DETAILS</h2><dl><div><dt>Email</dt><dd>{record.email || 'Not provided'}</dd></div><div><dt>Phone</dt><dd>{record.phone || 'Not provided'}</dd></div><div><dt>Created</dt><dd>{day(record.created_at)}</dd></div></dl></section>}
    <section className="cn-approved-info-card"><h2>{activity ? 'RECORDED ACTIVITY' : <>RELATED ENQUIRIES <span>{related.length}</span></>}</h2>
      {activity && <p className="cn-caption">Enquiries matched by saved email or phone. No activity is invented.</p>}
      {relatedRows.length ? relatedRows : <p className="cn-caption">No related enquiries match these saved contact details.</p>}</section>
    {!activity && <section className="cn-approved-info-card"><h2>NOTES</h2><p className="cn-approved-note">{record.notes || 'No internal notes added.'}</p><button className="cn-approved-outline" type="button" data-colzo-edit="clients" data-colzo-id={record.id}>{record.notes ? 'Edit note' : 'Add note'}</button></section>}
    <p className="cn-approved-boundary">Call and Email open your device apps. Colzo does not send messages automatically.</p>
  </section>;
}
function ProjectDetails({ record }) {
  const progress = Math.max(0,Math.min(100,Number(record.progress) || 0));
  return <><div className="cf-screen-top"><Back resource="projects"/></div>
    <header className="cf-detail-contact"><span className="cn-avatar large">{String(record.title || '?')[0]}</span><div><span className="cn-kicker">PROJECT DETAILS</span><h1>{record.title}</h1><p>Project record</p></div></header>
    <section className="cn-detail-panel cf-detail-panel"><h2>Project overview</h2><dl><div><dt>Customer</dt><dd>{record.client_name || 'Not recorded'}</dd></div><div><dt>Status</dt><dd>{record.status || 'planned'}</dd></div><div><dt>Progress</dt><dd>{progress}%</dd></div><div><dt>Created</dt><dd>{day(record.created_at)}</dd></div></dl>
      <div className="cf-progress" role="progressbar" aria-label="Project progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{width:`${progress}%`}}/></div></section>
    <section className="cn-detail-panel cf-detail-panel"><h2>Project notes</h2><p>{record.notes || 'No project notes recorded.'}</p></section><div className="cf-detail-buttons"><Edit resource="projects" record={record}/></div>
  </>;
}
export function RecordDetails({ model }) {
  const { resource, id } = model.colzoDetail || {};
  if (!['clients','projects','quotes'].includes(resource)) return <EmptyState>This record is no longer available.</EmptyState>;
  if (model.colzoLoading === resource) return <LoadingState label="Loading saved record…"/>;
  const record = (model.colzoRecords[resource] || []).find(r => String(r.id) === String(id));
  if (!record) return <><Back resource={resource}/><EmptyState>This record is no longer available in this workspace.</EmptyState></>;
  return resource === 'clients' ? <CustomerDetails model={model} record={record}/>
    : resource === 'quotes' ? <QuoteDetails model={model} record={record}/> : <ProjectDetails record={record}/>;
}
