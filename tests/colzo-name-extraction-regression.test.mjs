import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

// Read exactly the helper used by the public receptionist. No provider or DB calls.
const source = await readFile(new URL('../api/enquiry.js', import.meta.url), 'utf8');
const start = source.indexOf('function findNameInConversation(conversationText) {');
const end = source.indexOf('\nfunction findLocationInConversation(', start);
assert.ok(start !== -1 && end > start, 'name extraction helper must exist');
const findName = runInNewContext(source.slice(start, end) + '\nfindNameInConversation;', {});

const cases = [
  ['I am looking for an electrician', null],
  ["I'm after a quote for a rewire", null],
  ["I'm in Hartlepool", null],
  ['I am a property manager looking for maintenance', null],
  ["I'm interested in booking", null],
  ["I'm trying to book an appointment", null],
  ["I'm based in Stockton and need help", null],
  ["I'm calling about my appointment", null],
  ['I am hoping to get a quote', null],
  ['My name is Sarah Jones', 'Sarah Jones'],
  ["I'm James", 'James'],
  ['I am Michael Smith', 'Michael Smith'],
  ['My name is Alex QA and my email is alex@example.test', 'Alex QA'],
  ["I'm James from Hartlepool", 'James'],
  ['I am Anne-Marie', 'Anne-Marie']
];
for (const [message, expected] of cases) {
  test('customer name extraction: ' + message, () => {
    assert.equal(findName('user: ' + message), expected);
  });
}
test('a later corrected customer name takes precedence', () => {
  assert.equal(findName('user: My name is Alex\nuser: Actually, my name is Sam'), 'Sam');
});
test('assistant messages are not customer names', () => {
  assert.equal(findName('assistant: My name is Bot\nuser: I am looking for help'), null);
});
test('earlier genuine name survives an unrelated later request', () => {
  assert.equal(findName("user: My name is Steve\nuser: I'm looking for help"), 'Steve');
});
test('a genuine name on a later user message is extracted', () => {
  assert.equal(findName("user: I'm looking for help\nuser: My name is Steve"), 'Steve');
});
