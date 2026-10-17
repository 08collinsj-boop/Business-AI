import React from 'react';

// One title baseline and action row for standard owner directories.
export function PageHeader({ title, subtitle, actions, className = '' }) {
  return <header className={`cn-page-header ${className}`}>
    <div className="cn-page-heading"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    {actions && <div className="cn-page-actions">{actions}</div>}
  </header>;
}

export const contact = lead => String(lead.name || lead.email || lead.phone || 'Customer');
export const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase();
export const stage = lead => {
  const value = String(lead.status || 'New').toLowerCase();
  return /won|completed|converted|closed|resolved/.test(value) ? 'Won'
    : /new|pending|unread|open/.test(value) ? 'New' : 'In Progress';
};
export function day(value) {
  if (!value) return 'No date';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date) : 'No date';
}
export function EmptyState({ children, action, error = false }) {
  return <div className="cn-empty" role={error ? 'alert' : 'status'}>
    <span className="cn-empty-symbol" aria-hidden="true">◇</span><p>{children}</p>{action}
  </div>;
}
export function LoadingState({ label }) {
  return <section className="cr-loading" aria-busy="true" aria-label={label}>
    <p role="status" className="cn-caption">{label}</p>
    {[0, 1, 2].map(i => <div key={i} className="cr-skeleton-row" aria-hidden="true"><span/><div><i/><i/></div></div>)}
  </section>;
}
export function SearchField({ id, value = '', label, onChange, className = 'cn-search cf-search' }) {
  return <label className={className}><span aria-hidden="true">⌕</span>
    <input id={id} data-react-field="true" type="search" aria-label={label} placeholder={`${label}…`}
      value={value} onChange={e => onChange(e.target.value)}/>
  </label>;
}
export function DirectoryState({ model, resource, filtered, empty, noMatch, children }) {
  if (model.colzoError) return <EmptyState error action={<button type="button" data-colzo-refresh={resource}>Try again</button>}>{model.colzoError}</EmptyState>;
  if (model.colzoLoading === resource) return <LoadingState label={`Loading saved ${resource === 'clients' ? 'customers' : resource}…`}/>;
  if (!filtered.length) return <EmptyState>{(model.colzoRecords[resource] || []).length ? noMatch : empty}</EmptyState>;
  return children;
}
export function StatusPill({ label }) {
  const group = stage({ status: label });
  return <span className={`cn-pill ${group === 'Won' ? 'success' : group === 'New' ? 'attention' : 'progress'}`}>{label || 'New'}</span>;
}
export function Feedback({ model }) {
  return model.colzoFeedback ? <p className="cn-work-message" role="status">{model.colzoFeedback}</p> : null;
}
