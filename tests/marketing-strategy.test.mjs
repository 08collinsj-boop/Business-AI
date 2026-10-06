import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { validateMarketingStrategy, validateMarketingWeeklyPlan } from '../lib/marketing-automation.js';
import { applyMarketingBrandVoice, marketingBrandVoiceViolations, validateMarketingBrandVoice } from '../lib/marketing.js';

const read=async path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('Marketing strategy validates a balanced tenant plan',()=>{
  const strategy=validateMarketingStrategy({primary_goal:'more_enquiries',posts_per_week:4,preferred_time:'18:30',pillars:{services:30,completed_work:25,advice:20,trust:15,offers:10},brand_voice:{tone:'friendly',length:'short',emojis:'never',hashtags:'light',sales_style:'subtle',perspective:'we',local_mentions:'when_relevant',avoid_phrases:'game-changer, level up'}});
  assert.equal(strategy.posts_per_week,4);
  assert.equal(strategy.brand_voice.length,'short');
  assert.equal(strategy.brand_voice.emojis,'never');
  assert.equal(Object.values(strategy.pillars).reduce((sum,value)=>sum+value,0),100);
  assert.throws(()=>validateMarketingStrategy({...strategy,pillars:{...strategy.pillars,offers:15}}),/total 100%/);
});

test('weekly Marketing plan accepts safe bounded briefs',()=>{
  const plan=validateMarketingWeeklyPlan([{date:'2026-10-05',time:'18:30',pillar:'services',goal:'promote_service',title:'Service spotlight',prompt:'Promote one real approved service without inventing claims.'}]);
  assert.equal(plan.length,1);
  assert.equal(plan[0].pillar,'services');
  assert.throws(()=>validateMarketingWeeklyPlan([{...plan[0],pillar:'unknown'}]),/invalid content/);
});

test('Marketing UI exposes overview, goals, weekly planning and calendar',async()=>{
  const [html,js,css]=await Promise.all([read('index.html'),read('assets/marketing.js'),read('assets/marketing.css')]);
  for(const id of ['marketingTabOverview','marketingPlanWeek','marketingStrategyGoal','marketingWeekPlan','marketingCalendar']) assert.match(html,new RegExp(`id=\"${id}\"`));
  assert.match(html,/data-marketing-goal=\"more_enquiries\"/);
  assert.match(js,/planning_save/);
  assert.match(js,/buildWeekPlan/);
  assert.match(css,/marketing-overview-grid/);
  assert.match(css,/marketing-calendar-week/);
});


test('Brand Voice validates preferences and enforces hard output limits',()=>{
  const voice=validateMarketingBrandVoice({tone:'casual',length:'balanced',emojis:'never',hashtags:'none',sales_style:'subtle',perspective:'i',local_mentions:'avoid',avoid_phrases:'level up'});
  const output=applyMarketingBrandVoice({main_copy:'Great job ⚡',short_alternative:'Done ✅',call_to_action:'Message us 👋',hashtags:['#One','#Two'],missing_information:[]},voice);
  assert.equal(output.hashtags.length,0);
  assert.equal(output.main_copy.includes('⚡'),false);
  assert.equal(output.call_to_action.includes('👋'),false);
  assert.deepEqual(marketingBrandVoiceViolations({...output,main_copy:'Time to level up your marketing'},voice),['level up']);
  assert.throws(()=>validateMarketingBrandVoice({...voice,hashtags:'lots'}),/Invalid Marketing brand voice/);
});
