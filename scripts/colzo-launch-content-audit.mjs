/* Read-only source content audit. No network, database, credentials, or writes. */
import {readFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const LEGAL=['index','terms','privacy','dpa','acceptable-use','storage','subprocessors','data-deletion'];
const MARKETING_FLAGS=[
 {id:'booking-confirmation',pattern:/Booking confirmed/i,why:'A customer booking request is not a confirmed appointment'},
 {id:'automatic-followup',pattern:/Follow up automatically/i,why:'A follow-up action is not proof of a sent customer message'},
 {id:'priority-support',pattern:/Priority support/i,why:'Support availability and SLA have not been approved'},
 {id:'unqualified-availability',pattern:/Your business,[\s\S]{0,160}always available/i,why:'Unqualified availability could imply live phone or continuous service'}
];
const read=(root,file)=>readFileSync(path.join(root,file),'utf8');
const occurrences=(text,phrase)=>[...text.matchAll(new RegExp(phrase,'gi'))].length;
function localLinks(root,rel,html){
 const missing=[];
 for(const match of html.matchAll(/<a\b[^>]*?\bhref=["']([^"']+)["']/gi)){
  const href=match[1];
  if(/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(href))continue;
  let dest;
  try{dest=new URL(href,'https://audit.invalid/'+rel)}catch{missing.push({source:rel,href});continue}
  if(dest.hostname!=='audit.invalid')continue;
  const destPath=decodeURIComponent(dest.pathname);
  const target=destPath.endsWith('/')?destPath+'index.html':destPath;
  if(!existsSync(path.join(root,target.replace(/^\/+/,''))))missing.push({source:rel,href});
 }
 return missing;
}
const priceValues=text=>[...new Set([...text.matchAll(/£\s*(\d+\.\d{2})/g)].map(x=>x[1]))].sort((a,b)=>Number(a)-Number(b));

export function auditLaunchContent({root}){
 if(!root||typeof root!=='string')throw TypeError('A source root is required');
 const pages=LEGAL.map(name=>{
  const rel='legal/'+name+'.html',present=existsSync(path.join(root,rel)),html=present?read(root,rel):'';
  return {path:rel,present,
   legacyBrandMentions:present?occurrences(html,'Business AI'):0,
   colzoMentions:present?occurrences(html,'Colzo'):0,
   title:html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]||'',
   versions:[...new Set([...html.matchAll(/\bVersion\s+(\d+\.\d+)/g)].map(x=>x[1]))],
   missingLocalLinks:present?localLinks(root,rel,html):[]};
 });
 const marketing=read(root,'marketing.html'),
  priceDocs=read(root,'docs/STRIPE_BILLING_PILOT_SETUP.md'),
  addOnDocs=read(root,'docs/ADDONS_MARKETING.md');
 const missingLocalLinks=pages.flatMap(p=>p.missingLocalLinks);
 const legal={pages,missingLocalLinks,totalLegacyBrandMentions:pages.reduce((a,p)=>a+p.legacyBrandMentions,0),
  status:pages.some(p=>!p.present||p.legacyBrandMentions>0||p.missingLocalLinks.length)?'REVIEW_REQUIRED':'BRAND_REVIEW_PENDING'};
 return {meta:{mode:'read-only-source-audit',productionChanged:false,rootIncluded:false},
  legal,marketing:{flags:MARKETING_FLAGS.map(({id,pattern,why})=>({id,present:pattern.test(marketing),reason:why})),
   legacyBrandMentions:occurrences(marketing,'Business AI'),
   ctaDestinations:[...new Set([...marketing.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)].map(m=>m[1]))]},
  pricing:{marketingPriceValues:priceValues(marketing),internalPlanValues:priceValues(priceDocs),
   internalAddOnValues:priceValues(addOnDocs),trialIsPaid:marketing.includes('£3.99'),
   optionalMarketingPriceVisible:marketing.includes('£19.99')}};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+path.resolve(process.argv[1])).href){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 console.log(JSON.stringify(auditLaunchContent({root}),null,2));
}
