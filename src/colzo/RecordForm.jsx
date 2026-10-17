import React from 'react';
import { contact } from './primitives.jsx';

function Field({ name, label, value, type = 'text', ...props }) {
  return <label>{label}<input name={name} type={type} defaultValue={value ?? ''} {...props}/></label>;
}
function Notes({ value }) {
  return <label>Internal notes<textarea name="notes" defaultValue={value || ''} rows={3} maxLength={4000}/></label>;
}
export function RecordForm({ model }) {
  const { resource, record } = model.colzoForm;
  const editing = Boolean(record);
  if (resource === 'quotes' && ['sent','accepted'].includes(record?.status)) return <section className="cn-detail-panel">
    <p>Quote terms are locked after issuing. Editing is unavailable here.</p><button type="button" data-colzo-cancel>Back to quotes</button>
  </section>;
  if (resource === 'clients') return <section className="cn-approved-client-form" aria-label={editing ? 'Edit Customer' : 'Add Customer'}>
    <form id="cnColzoForm" data-resource="clients" data-record-id={record?.id || ''}>
      <header className="cn-approved-form-header"><button type="button" className="cn-approved-text-action" data-colzo-cancel>Cancel</button>
        <h2>{editing ? 'Edit Customer' : 'Add Customer'}</h2><button type="submit" className="cn-approved-text-action cn-approved-save" disabled={model.colzoBusy}>{model.colzoBusy ? 'Saving…' : editing ? 'Save' : 'Create'}</button></header>
      <p className="cn-approved-form-subtitle">Saved to this business only. No automatic messages are sent.</p>
      <div className="cn-approved-form-group"><h3>CUSTOMER DETAILS</h3><Field name="full_name" label="Full name *" value={record?.full_name} required minLength={2} maxLength={160} autoComplete="name"/></div>
      <div className="cn-approved-form-group"><h3>CONTACT DETAILS <small>Optional</small></h3>
        <Field name="email" label="Email address" type="email" value={record?.email} maxLength={320} autoComplete="email"/>
        <Field name="phone" label="Phone number" type="tel" value={record?.phone} maxLength={80} autoComplete="tel"/></div>
      <div className="cn-approved-form-group"><h3>NOTES <small>Optional</small></h3><Notes value={record?.notes}/></div>
      <p id="cnColzoFeedback" className="cn-caption" role="status" aria-live="polite">{model.colzoFeedback}</p>
      <p className="cn-approved-form-limit">Company and location fields are not yet stored by the current customer API.</p>
    </form>
  </section>;
  const isQuote = resource === 'quotes';
  const heading = `${editing ? 'Edit' : 'New'} ${isQuote ? 'quote' : 'project'}`;
  return <section className="cn-detail-panel cn-colzo-record-form"><h2>{heading}</h2>
    <form id="cnColzoForm" data-resource={resource} data-record-id={record?.id || ''}>
      {isQuote && <label>Related enquiry<select name="lead_id" required defaultValue={record?.lead_id || ''}><option value="">Choose an enquiry</option>{model.enquiries.map(l => <option key={l.id} value={l.id}>{contact(l)} · {l.job_type || 'Enquiry'}</option>)}</select></label>}
      <Field name="title" label={isQuote ? 'Quote title' : 'Project name'} value={record?.title} required minLength={3} maxLength={160}/>
      {isQuote ? <>
        <Field name="amount_gbp" label="Amount (GBP)" type="number" value={record?.amount_gbp} required min={0} max="999999999.99" step="0.01"/>
        <label>Status<select name="status" defaultValue={record?.status || 'draft'}>{['draft','sent','accepted','declined'].map(v => <option key={v} value={v} disabled={v !== (record?.status || 'draft')}>{v}</option>)}</select></label>
        <p className="cn-caption">Save a draft only. Quote delivery and status changes are separate workflows.</p>
      </> : <>
        <Field name="client_name" label="Customer name" value={record?.client_name} maxLength={160}/>
        <label>Status<select name="status" defaultValue={record?.status || 'planned'}>{['planned','active','paused','completed'].map(v => <option key={v} value={v}>{v[0].toUpperCase() + v.slice(1)}</option>)}</select></label>
        <label>Progress<output>{Number(record?.progress || 0)}%</output><input name="progress" type="range" min={0} max={100} step={5} defaultValue={record?.progress || 0} onInput={e => { e.currentTarget.previousElementSibling.value = `${e.currentTarget.value}%`; }}/></label>
      </>}
      <Notes value={record?.notes}/><p id="cnColzoFeedback" className="cn-caption" role="status">{model.colzoFeedback}</p>
      <div className="cn-form-actions"><button className="cn-primary" type="submit" disabled={model.colzoBusy}>{model.colzoBusy ? 'Saving…' : editing ? 'Save changes' : isQuote ? 'Create draft quote' : 'Create project'}</button><button className="cn-secondary" type="button" data-colzo-cancel>Cancel</button></div>
    </form>
  </section>;
}
