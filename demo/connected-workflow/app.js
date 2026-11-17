import {
  SIMULATED_RECORDS, createDemoState, reviewHandoff, approveHandoff,
  declineHandoff, setProviderScenario, resetDemo
} from './model.js';

const el = id => document.getElementById(id);
const text = (id, value) => { el(id).textContent = value; };
const dialog = el('handoffDialog');
let state = createDemoState();

function populateFixture() {
  const { enquiry, appointment, task } = SIMULATED_RECORDS;
  text('enquiryTitle', enquiry.subject);
  text('enquiryDescription', enquiry.description);
  text('enquiryContact', enquiry.contact);
  text('enquiryRef', enquiry.id);
  text('enquiryReceived', enquiry.received);
  text('appointmentWhen', appointment.when);
  text('appointmentStatus', appointment.status);
  text('taskTitle', task.title);
  text('taskDescription', task.description);
  text('taskDue', task.due);
  text('taskAssignee', task.assignee);
  text('dialogEnquiry', enquiry.id);
  text('dialogTask', task.title);
}

function activityItem(title, description, isCompleted = false) {
  const item = document.createElement('li');
  if (isCompleted) item.className = 'completed';
  const mark = document.createElement('span');
  mark.className = 'timeline-mark';
  mark.setAttribute('aria-hidden', 'true');
  const content = document.createElement('span');
  const heading = document.createElement('strong');
  heading.textContent = title;
  const detail = document.createElement('small');
  detail.textContent = description;
  content.append(heading, detail);
  item.append(mark, content);
  return item;
}

function render() {
  el('providerScenario').value = state.providerScenario;
  el('workflowStatus').textContent = state.notice;

  const approved = state.phase === 'approved';
  const blocked = state.phase === 'blocked' || state.providerScenario === 'unavailable';
  el('reviewAction').disabled = approved;
  el('reviewAction').firstChild.textContent = approved ? 'Simulated handoff reviewed ' : 'Review suggested action ';
  el('reviewAction').classList.toggle('completed', approved);

  el('taskOutcome').classList.toggle('approved', approved);
  el('taskOutcome').classList.toggle('blocked', blocked);
  if (approved) {
    text('taskOutcomeTitle', 'Simulated task prepared');
    text('taskOutcomeDescription', 'Shown locally only. No ClickUp task was created.');
  } else if (blocked) {
    text('taskOutcomeTitle', 'Mock provider unavailable');
    text('taskOutcomeDescription', 'No task created, and no external changes made.');
  } else if (state.phase === 'declined') {
    text('taskOutcomeTitle', 'Handoff declined');
    text('taskOutcomeDescription', 'The suggested task was not created.');
  } else {
    text('taskOutcomeTitle', 'No task created');
    text('taskOutcomeDescription', 'Review and approve the example to see a local simulated result.');
  }

  const timeline = el('activityList');
  const items = [
    activityItem('Fictional context displayed', 'LeadConnector sample enquiry and appointment · source records unchanged')
  ];
  if (approved) {
    items.push(activityItem('Approval simulated', 'Illustrative ClickUp task shown on this page only; no API request', true));
  } else if (state.phase === 'declined') {
    items.push(activityItem('Handoff declined', 'No simulated or external task created'));
  } else if (blocked) {
    items.push(activityItem('Mock provider unavailable', 'No action attempted; the handoff is blocked'));
  } else {
    items.push(activityItem('Awaiting human review', 'No action executed or sent to any provider'));
  }
  timeline.replaceChildren(...items);
}

el('reviewAction').addEventListener('click', () => {
  state = reviewHandoff(state);
  render();
  if (state.phase === 'review' && !dialog.open) dialog.showModal();
});
el('approveSimulated').addEventListener('click', () => {
  state = approveHandoff(state);
  dialog.close();
  render();
  el('workflowStatus').focus({preventScroll:true});
});
el('declineSimulated').addEventListener('click', () => {
  state = declineHandoff(state);
  dialog.close();
  render();
});
el('closeReview').addEventListener('click', () => dialog.close());
el('resetDemo').addEventListener('click', () => {
  if (dialog.open) dialog.close();
  state = resetDemo();
  render();
});
el('providerScenario').addEventListener('change', event => {
  if (dialog.open) dialog.close();
  state = setProviderScenario(state, event.target.value);
  render();
});

populateFixture();
el('workflowStatus').setAttribute('tabindex', '-1');
render();
