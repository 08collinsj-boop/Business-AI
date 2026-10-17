import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Projects } from './Projects.jsx';
import { Quotes } from './Quotes.jsx';
import { Customers } from './Customers.jsx';
import { Enquiries } from './Enquiries.jsx';
import { RecordForm } from './RecordForm.jsx';
import { RecordDetails } from './RecordDetails.jsx';
import { createSurfaceMotion } from './motion.js';

// React owns only the content node. Existing auth, tenant-scoped APIs and event
// contracts remain owned by the established application controller.
const roots = new WeakMap();
const pages = { projects: Projects, clients: Customers, quotes: Quotes, enquiries: Enquiries, colzoDetail: RecordDetails };
function unmount(container) {
  const root = roots.get(container);
  if (root) { flushSync(() => root.unmount()); roots.delete(container); }
}
function renderScreen(container, model) {
  const Page = pages[model.screen];
  if (!Page) { unmount(container); return false; }
  let root = roots.get(container);
  if (!root) { root = createRoot(container); roots.set(container, root); }
  flushSync(() => root.render(model.colzoForm
    ? <RecordForm key={`${model.colzoForm.resource}:${model.colzoForm.record?.id || 'new'}`} model={model}/>
    : <Page model={model}/>));
  return true;
}
window.ColzoReact = { renderScreen, unmount };
const workspace = document.getElementById('colzoOwner');
if (workspace) window.ColzoSurfaceMotion = createSurfaceMotion(workspace);
