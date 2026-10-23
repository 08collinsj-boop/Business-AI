import React from 'react';
import { contact, day, EmptyState, LoadingState, initials, PageHeader, SearchField, stage, StatusPill } from './primitives.jsx';

export function Enquiries({ model }) {
  if(model.recordsReady===false)return <LoadingState label="Loading enquiries…"/>;
  const all = model.enquiries;
  const filter = model.filter || 'All';
  const filtered = all.filter(l => (filter === 'All' || stage(l) === filter)
    && [l.name,l.job_type,l.description,l.location,l.email,l.phone].join(' ').toLowerCase().includes((model.search || '').toLowerCase()));
  return <>
    <PageHeader title="Enquiries" className="cf-screen-top" actions={<div className="cf-top-actions">
      <button type="button" className="cf-icon-button" data-cn-focus-search aria-label="Focus enquiry search">⌕</button>
      <button type="button" className="cf-icon-button volt" data-cn-create-lead aria-label="Create enquiry">+</button></div>}/>
    <div className="cn-tabs cf-tabs" role="group" aria-label="Filter enquiries">{['All','New','In Progress','Won'].map(t => <button key={t} type="button" data-cn-filter={t} aria-pressed={filter === t}>{t}{t !== 'All' ? ` (${all.filter(l => stage(l) === t).length})` : ''}</button>)}</div>
    <SearchField id="cnSearch" label="Search enquiries" value={model.search} onChange={v => model.onSearch('search',v)}/>
    <div className="cn-stack cf-lead-list">{filtered.length ? filtered.map(l => <button className="cn-record cf-lead-card" type="button" key={l.id} data-cn-lead={l.id}>
      <span className="cn-avatar">{initials(contact(l))}</span><span className="cn-record-main"><strong>{contact(l)}</strong><small>{l.job_type || 'General enquiry'}</small><small>Source: {l.source_label || 'Not recorded'}</small><StatusPill label={l.status}/></span><span className="cn-record-end"><time>{day(l.created_at)}</time><span aria-hidden="true">›</span></span>
    </button>) : <EmptyState action={!all.length ? <button type="button" data-cn-create-lead>Create enquiry</button> : <button type="button" data-react-reset onClick={model.onResetEnquiry}>Clear search and filters</button>}>
      {!all.length ? 'No enquiries yet. Create an enquiry to begin.' : 'No enquiries match your search or filters.'}
    </EmptyState>}</div>
    <div className="cf-list-footer"><span>{filtered.length} {filtered.length === 1 ? 'enquiry' : 'enquiries'}</span><button type="button" data-cn-refresh>Refresh ↻</button></div>
  </>;
}
