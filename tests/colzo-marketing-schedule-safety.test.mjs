import test from 'node:test';
import assert from 'node:assert/strict';
import {isMarketingAutomationDue} from '../lib/marketing-automation.js';
test('invalid automation last-run timestamps must not trigger a new generation',()=>{
 const now=Date.parse('2026-10-16T16:00:00.000Z');
 for(const invalid of ['corrupt-value','not-a-date']){
  assert.equal(isMarketingAutomationDue({enabled:true,posts_per_day:1,last_run_at:invalid},now),false);
 }
});
test('valid scheduling preserves usual due and paused logic',()=>{
 const now=Date.parse('2026-10-16T16:00:00.000Z');
 assert.equal(isMarketingAutomationDue({enabled:true,posts_per_day:1,last_run_at:null},now),true);
 assert.equal(isMarketingAutomationDue({enabled:false,posts_per_day:1,last_run_at:null},now),false);
 assert.equal(isMarketingAutomationDue({enabled:true,posts_per_day:1,last_run_at:new Date(now-23*60*60*1000).toISOString()},now),false);
 assert.equal(isMarketingAutomationDue({enabled:true,posts_per_day:1,last_run_at:new Date(now-25*60*60*1000).toISOString()},now),true);
});
