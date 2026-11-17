/**
 * Self-contained, strictly fictional Colzo cross-app demonstration.
 * Nothing in this module reads or writes a real LeadConnector/ClickUp account.
 * No fetch, storage, secrets, authentication, background sync or provider API.
 */
const freeze = value => Object.freeze(value);

export const SIMULATED_RECORDS = freeze({
  business: freeze({
    name: 'Northfield Property Care',
    subtitle: 'Fictional example business',
    workspace: 'Training workspace'
  }),
  enquiry: freeze({
    id: 'LC-EXAMPLE-104',
    source: 'LeadConnector',
    contact: 'Morgan Example',
    contactEmail: 'morgan@example.invalid',
    subject: 'Kitchen tap needs attention',
    received: '18 Nov 2026 · 09:12',
    status: 'Appointment requested',
    description: 'Sample customer requested a short visit to check a leaking kitchen tap.'
  }),
  appointment: freeze({
    id: 'LC-BOOKING-018',
    source: 'LeadConnector',
    when: '20 Nov 2026 · 10:30',
    location: 'Example property, Hartlepool',
    assignedTo: 'Example service team',
    status: 'Requested — not confirmed'
  }),
  task: freeze({
    id: 'CU-EXAMPLE-027',
    target: 'ClickUp',
    title: 'Prepare fictional tap inspection',
    description: 'Check parts and prepare a customer follow-up for the sample appointment.',
    due: '19 Nov 2026',
    assignee: 'Example operations team',
    status: 'To do'
  })
});

export function createDemoState({providerScenario='available'}={}) {
  if (!['available','unavailable'].includes(providerScenario)) throw new TypeError('Unknown demo scenario');
  return freeze({
    phase: 'idle',
    providerScenario,
    simulatedTask: null,
    activity: freeze([]),
    notice: 'Review the proposed handoff. Nothing will be sent to a provider.'
  });
}

export function reviewHandoff(state) {
  if (state.phase === 'approved') return state;
  if (state.providerScenario !== 'available') {
    return freeze({...state, phase:'blocked',
      notice:'Mock ClickUp is unavailable. No simulated task was created.'});
  }
  return freeze({...state, phase:'review',
    notice:'Review the fictional task details before choosing to approve or decline.'});
}

export function approveHandoff(state) {
  if (state.phase !== 'review') return freeze({...state,
    notice:'Nothing has been sent. Review the proposed action before approval.'});
  if (state.providerScenario !== 'available') {
    return freeze({...state, phase:'blocked',
      notice:'Mock ClickUp is unavailable. No simulated task was created.'});
  }
  const simulatedTask=freeze({
    ...SIMULATED_RECORDS.task,
    sourceEnquiryId: SIMULATED_RECORDS.enquiry.id,
    simulatedOnly: true
  });
  const activity=freeze([freeze({
    id:'DEMO-EVENT-1',
    description:'Approval simulated locally. No ClickUp task was created.',
    provider:'ClickUp (fictional)'
  })]);
  return freeze({...state,phase:'approved',simulatedTask,activity,
    notice:'Simulated handoff complete. This task exists only in this browser demonstration.'});
}

export function declineHandoff(state) {
  if (state.phase !== 'review') return state;
  return freeze({...state,phase:'declined',simulatedTask:null,
    notice:'Handoff declined. No simulated task or external action was created.'});
}

export function setProviderScenario(state,providerScenario) {
  if (!state || typeof state !== 'object') throw new TypeError('Invalid demo state');
  return createDemoState({providerScenario});
}

export function resetDemo() {
  return createDemoState();
}
