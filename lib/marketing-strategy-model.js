import { randomUUID } from 'node:crypto';

export const MARKETING_GOALS = Object.freeze([
  'enquiries',
  'promote_service',
  'showcase_work',
  'build_trust',
  'educate',
  'promote_offer',
  'business_update'
]);

export const MARKETING_PILLARS = Object.freeze([
  Object.freeze({ key: 'services', weight: 30 }),
  Object.freeze({ key: 'completed_work', weight: 25 }),
  Object.freeze({ key: 'advice', weight: 20 }),
  Object.freeze({ key: 'trust', weight: 15 }),
  Object.freeze({ key: 'offers', weight: 5 }),
  Object.freeze({ key: 'updates', weight: 5 })
]);

const CONTENT_BY_PILLAR = Object.freeze({
  services: 'promotional_post',
  completed_work: 'social_post',
  advice: 'social_post',
  trust: 'social_post',
  offers: 'offer',
  updates: 'update'
});

const GOAL_BY_PILLAR = Object.freeze({
  services: 'promote_service',
  completed_work: 'showcase_work',
  advice: 'educate',
  trust: 'build_trust',
  offers: 'promote_offer',
  updates: 'business_update'
});

const BRIEF_BY_PILLAR = Object.freeze({
  services: 'Choose one real approved service from Business Knowledge and explain who it helps and why it is useful. Use only approved business facts. Do not invent prices, qualifications, availability or guarantees.',
  completed_work: 'Create a completed-work style post only if approved Business Knowledge contains a real completed job or project detail. If it does not, promote one approved service instead. Never invent a completed job, customer, location, result or testimonial.',
  advice: 'Share one useful customer tip grounded in approved Business Knowledge. Keep it practical and easy to understand. Do not invent technical claims, regulations, statistics or safety guarantees.',
  trust: 'Create a trust-building post using approved business facts only. Do not invent reviews, ratings, years of experience, qualifications, accreditations, guarantees or customer claims.',
  offers: 'Use a current approved offer only if one exists in Business Knowledge. If there is no approved offer, create a service-focused post instead. Never invent a discount, deadline, price or promotion.',
  updates: 'Create a useful business update from approved Business Knowledge or current trusted business details. Do not invent events, opening changes, staff news, milestones or availability.'
});

const validTime=value=>/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value||''));
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))&&!Number.isNaN(Date.parse(String(value)+'T00:00:00Z'));
const clampInt=(value,min,max)=>Math.max(min,Math.min(max,Math.round(Number(value)||0)));

export function defaultMarketingStrategy() {
  return {
    goals: ['enquiries', 'build_trust'],
    pillars: MARKETING_PILLARS.map(item => ({ key: item.key, enabled: true, weight: item.weight })),
    weekly_posts: 4,
    preferred_time: '18:30',
    weekly_plan: []
  };
}

export function validateMarketingStrategyInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Marketing strategy');
  const allowed = new Set(['goals', 'pillars', 'weekly_posts', 'preferred_time', 'weekly_plan']);
  if (Object.keys(value).some(key => !allowed.has(key))) throw new Error('Invalid Marketing strategy');
  if (!Array.isArray(value.goals) || !value.goals.length || value.goals.length > MARKETING_GOALS.length) throw new Error('Choose at least one Marketing goal');
  const goals = [...new Set(value.goals.map(String))];
  if (goals.length !== value.goals.length || goals.some(goal => !MARKETING_GOALS.includes(goal))) throw new Error('Choose valid Marketing goals');
  if (!Array.isArray(value.pillars) || !value.pillars.length || value.pillars.length > MARKETING_PILLARS.length) throw new Error('Choose at least one content pillar');
  const seen = new Set();
  const pillars = value.pillars.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).some(key => !['key','enabled','weight'].includes(key))) throw new Error('Invalid content pillar');
    const key = String(item.key || '');
    if (!MARKETING_PILLARS.some(pillar => pillar.key === key) || seen.has(key)) throw new Error('Invalid content pillar');
    seen.add(key);
    if (typeof item.enabled !== 'boolean') throw new Error('Invalid content pillar');
    const rawWeight=Number(item.weight);
    if (!Number.isInteger(rawWeight) || rawWeight < 0 || rawWeight > 100) throw new Error('Content pillar weights must be between 0 and 100');
    return { key, enabled: item.enabled, weight: rawWeight };
  });
  if (!pillars.some(item => item.enabled && item.weight > 0)) throw new Error('Enable at least one content pillar with a weight above zero');
  const weeklyPosts = Number(value.weekly_posts);
  if (!Number.isInteger(weeklyPosts) || weeklyPosts < 1 || weeklyPosts > 7) throw new Error('Choose between 1 and 7 posts per week');
  if (!validTime(value.preferred_time)) throw new Error('Choose a valid preferred posting time');
  return { goals, pillars, weekly_posts: weeklyPosts, preferred_time: String(value.preferred_time) };
}

function dateOffset(startDate, offset) {
  const date = new Date(startDate + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0,10);
}

function chooseOffsets(count) {
  if (count <= 1) return [0];
  const offsets=[];
  for (let i=0;i<count;i+=1) offsets.push(Math.round(i*6/(count-1)));
  return [...new Set(offsets)];
}

function weightedPillars(pillars, count) {
  const enabled=pillars.filter(item=>item.enabled&&item.weight>0);
  const scores=new Map(enabled.map(item=>[item.key,0]));
  const total=enabled.reduce((sum,item)=>sum+item.weight,0);
  const result=[];
  for(let i=0;i<count;i+=1){
    for(const item of enabled)scores.set(item.key,(scores.get(item.key)||0)+item.weight);
    const chosen=[...enabled].sort((a,b)=>(scores.get(b.key)||0)-(scores.get(a.key)||0)||b.weight-a.weight)[0];
    result.push(chosen.key);
    scores.set(chosen.key,(scores.get(chosen.key)||0)-total);
  }
  return result;
}

function goalForPillar(pillar, goals) {
  const preferred=GOAL_BY_PILLAR[pillar];
  if (goals.includes(preferred)) return preferred;
  if (pillar==='services'&&goals.includes('enquiries')) return 'enquiries';
  if (pillar==='trust'&&goals.includes('enquiries')) return 'enquiries';
  return goals[0] || 'enquiries';
}

export function buildMarketingWeekPlan({ strategy, start_date, existing_plan = [], id_factory = randomUUID, now = new Date() }) {
  if (!validDate(start_date)) throw new Error('Choose a valid plan start date');
  const safe = validateMarketingStrategyInput({ goals: strategy?.goals, pillars: strategy?.pillars, weekly_posts: strategy?.weekly_posts, preferred_time: strategy?.preferred_time });
  const rangeEnd=dateOffset(start_date,6);
  const linked=(Array.isArray(existing_plan)?existing_plan:[]).filter(item=>item&&item.generation_id&&String(item.planned_date)>=start_date&&String(item.planned_date)<=rangeEnd);
  const preserved=linked.slice(0,safe.weekly_posts).map(item=>({...item}));
  const remaining=Math.max(0,safe.weekly_posts-preserved.length);
  const usedDates=new Set(preserved.map(item=>item.planned_date));
  const preferredOffsets=chooseOffsets(safe.weekly_posts);
  const available=[];
  for(const offset of preferredOffsets){const date=dateOffset(start_date,offset);if(!usedDates.has(date)&&!available.includes(date))available.push(date);}
  for(let offset=0;offset<7&&available.length<remaining;offset+=1){const date=dateOffset(start_date,offset);if(!usedDates.has(date)&&!available.includes(date))available.push(date);}
  const pillars=weightedPillars(safe.pillars,remaining);
  const createdAt=now.toISOString();
  const fresh=available.slice(0,remaining).map((plannedDate,index)=>{
    const pillar=pillars[index];
    return {
      id: id_factory(),
      planned_date: plannedDate,
      planned_time: safe.preferred_time,
      pillar,
      goal: goalForPillar(pillar,safe.goals),
      content_type: CONTENT_BY_PILLAR[pillar] || 'social_post',
      platform: 'facebook',
      tone: 'friendly',
      brief: BRIEF_BY_PILLAR[pillar] || BRIEF_BY_PILLAR.services,
      generation_id: null,
      linked_at: null,
      created_at: createdAt
    };
  });
  return [...preserved,...fresh].sort((a,b)=>String(a.planned_date).localeCompare(String(b.planned_date))||String(a.planned_time||'').localeCompare(String(b.planned_time||'')));
}
