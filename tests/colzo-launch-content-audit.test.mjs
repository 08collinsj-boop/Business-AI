import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditLaunchContent} from '../scripts/colzo-launch-content-audit.mjs';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test('audits all eight legal pages without hiding Business AI branding blockers',()=>{
 const result=auditLaunchContent({root});
 assert.equal(result.legal.pages.length,8);
 assert.ok(result.legal.pages.every(p=>p.present));
 assert.ok(result.legal.pages.every(p=>p.legacyBrandMentions>0));
 assert.equal(result.legal.status,'REVIEW_REQUIRED');
 assert.deepEqual(result.legal.missingLocalLinks,[]);
});

test('detects real marketing promises and distinguishes paid trial from optional add-on',()=>{
 const result=auditLaunchContent({root});
 for(const id of ['booking-confirmation','automatic-followup','priority-support','unqualified-availability']){
  assert.equal(result.marketing.flags.find(f=>f.id===id)?.present,true,id);
 }
 for(const price of ['3.99','34.99','79.99','159.99']){
  assert.ok(result.pricing.marketingPriceValues.includes(price),price);
  assert.ok(result.pricing.internalPlanValues.includes(price),price);
 }
 assert.ok(result.pricing.internalAddOnValues.includes('19.99'));
 assert.equal(result.pricing.marketingPriceValues.includes('19.99'),false);
});

test('audit performs no network calls, no customer writes and has deterministic summaries',()=>{
 const result=auditLaunchContent({root});
 assert.equal(result.meta.mode,'read-only-source-audit');
 assert.ok(result.legal.totalLegacyBrandMentions>=8);
 assert.equal(result.meta.productionChanged,false);
 assert.equal(result.legal.status,'REVIEW_REQUIRED');
});
