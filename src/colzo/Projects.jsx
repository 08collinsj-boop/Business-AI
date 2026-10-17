import React from 'react';
import { day, DirectoryState, Feedback, PageHeader, SearchField } from './primitives.jsx';

export function Projects({ model }) {
  const saved = model.colzoRecords.projects || [];
  const filter = model.projectFilter || 'All';
  const filtered = saved.filter(p => [p.title, p.client_name, p.status, p.notes].join(' ').toLowerCase().includes((model.projectSearch || '').toLowerCase())
    && (filter === 'All' || (filter === 'Completed' ? p.status === 'completed' : p.status !== 'completed')));
  return <div className="cn-approved-projects">
    <PageHeader title="Projects" subtitle={`${saved.length} saved project${saved.length === 1 ? '' : 's'}`} className="cf-screen-top" actions={<button type="button" className="cf-icon-button volt" data-colzo-create="projects" aria-label="Create project">+</button>}/>
    <Feedback model={model}/>
    <SearchField id="cnProjectSearch" value={model.projectSearch} label="Search projects" onChange={v => model.onSearch('projectSearch', v)}/>
    <div className="cf-tabs cf-project-tabs" role="group" aria-label="Filter projects">
      {['All', 'Active', 'Completed'].map(t => <button key={t} type="button" data-cn-project-filter={t} aria-pressed={filter === t}>{t}</button>)}
    </div>
    <div className="cn-stack cf-project-list"><DirectoryState model={model} resource="projects" filtered={filtered}
      empty="No saved projects yet. Create a project to start tracking work." noMatch="No projects match your search or filter.">
      {filtered.map(p => {
        const progress = Math.max(0, Math.min(100, Number(p.progress) || 0));
        return <button className="cf-project-card" type="button" key={p.id} data-colzo-detail="projects" data-colzo-id={p.id}>
          <span className="cn-avatar">{String(p.title || '?').slice(0, 1).toUpperCase()}</span>
          <span className="cf-project-text"><strong>{p.title}</strong><small>{p.client_name || 'Customer not recorded'} · {day(p.created_at)}</small>
            <span className="cf-progress" role="progressbar" aria-label="Project progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }}/></span>
            <span className="cf-project-status">{p.status} · {progress}%</span></span><span aria-hidden="true">›</span>
        </button>;
      })}
    </DirectoryState></div>
    <p className="cn-caption cn-approved-honesty">Projects are stored as tenant-scoped Colzo records. Changes are confirmed by the server.</p>
  </div>;
}
