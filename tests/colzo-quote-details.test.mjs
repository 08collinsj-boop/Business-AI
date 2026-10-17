import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const start=source.indexOf(' function colzoRecordDetail(){');
const end=source.indexOf(' async function loadMarketingDrafts(',start);
const render=new Function('state','records','safe','day','empty','contact',source.slice(start,end)+'; return colzoRecordDetail();');
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function screen(status='draft',enquiries=[{id:42,name:'QA Customer',job_type:'Inspection'}]){
 return render({colzoDetail:{resource:'quotes',id:'qa'},colzoRecords:{quotes:[{id:'qa',title:'QA estimate',amount_gbp:12.5,status,lead_id:42,notes:'<script>unsafe</script>'}]}},()=>({enquiries}),safe,()=> '17 Oct',safe,l=>l.name);
}
test('quote detail uses accepted estimate hierarchy with actual saved amount and notes',()=>{
 const html=screen();
 assert.match(html,/cn-approved-quote-detail/);
 assert.match(html,/Price estimate/);
 assert.match(html,/£12\.50/);
 assert.match(html,/&lt;script&gt;unsafe&lt;\/script&gt;/);
 assert.doesNotMatch(html,/<script>/);
});
test('quote links only an available real enquiry',()=>{
 assert.match(screen(),/data-cn-lead="42"/);
 const missing=screen('draft',[]);
 assert.doesNotMatch(missing,/data-cn-lead=/);
 assert.match(missing,/No matching enquiry/);
});
test('sent and accepted quote terms retain the existing edit lock',()=>{
 for(const status of ['sent','accepted']){
  const html=screen(status);
  assert.doesNotMatch(html,/data-colzo-edit=/);
  assert.match(html,/Quote terms are locked/);
  assert.doesNotMatch(html,/Draft · Not sent/);
 }
 assert.match(screen(),/data-colzo-edit="quotes"/);
});
test('enquiry detail accurately describes persistent draft quotes without delivery',()=>{
 assert.doesNotMatch(source,/Draft quotes are not saved or sent/);
 assert.match(source,/Draft quotes are saved to this business and are not sent automatically/);
});
