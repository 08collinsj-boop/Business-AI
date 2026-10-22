import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const routes=['about','contact','resources','resources/ai-lead-capture-trades','resources/automate-website-enquiries-small-business','resources/ai-website-receptionist-small-business','ai-receptionist','ai-for-trades','teesside','small-business-ai','ai-marketing','ai-marketing-small-business','customer-enquiry-management'];
for(const route of routes)test(`${route}: consistent, non-chargeable Colzo pilot route`,()=>{
 const html=readFileSync(`site/${route}/index.html`,'utf8');
 assert.doesNotMatch(html,/7.day trial|Start trial\b/i,'cannot advertise old paid trial');
 assert.match(html,/href="\/pilot\/"/,'must link to actual public interest page');
 assert.match(html,/pilot interest|free 14-day pilot/i,'must explain that pilot is interest-led');
});
