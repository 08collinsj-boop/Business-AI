import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const read=p=>readFileSync(p,'utf8');
test('public site links stay on Dev previews and retain the established app domain elsewhere',()=>{
 for(const hostname of ['business-example.vercel.app','localhost','www.getbusiness-ai.com']){
  const dom=new JSDOM('<a data-colzo-app-link href="https://app.getbusiness-ai.com/">Open Colzo</a>',{runScripts:'outside-only',url:`https://${hostname}/marketing.html`});
  dom.window.eval(read('assets/colzo-public-site.js'));
  assert.equal(new URL(dom.window.document.querySelector('a').href).hostname,hostname==='www.getbusiness-ai.com'?'app.getbusiness-ai.com':hostname);
  dom.window.close();
 }
});
test('every deployed entry loads Colzo surface styling after its older styles',()=>{
 for(const file of ['index.html','marketing.html','site/index.html',...['index','terms','privacy','dpa','data-deletion','storage','acceptable-use','subprocessors'].map(p=>`legal/${p}.html`)]){
  const dom=new JSDOM(read(file));const links=[...dom.window.document.querySelectorAll('link[rel="stylesheet"]')];
  const customerEntries=new Set(['index.html','legal/index.html','legal/dpa.html','legal/data-deletion.html','legal/storage.html','legal/subprocessors.html']);
  if(customerEntries.has(file)){
   assert.match(links.at(-2)?.getAttribute('href')||'',/colzo-surfaces\.css/,file);
   assert.match(links.at(-1)?.getAttribute('href')||'',/colzo-customer-stitch\.css/,file);
  }else assert.match(links.at(-1)?.getAttribute('href')||'',/colzo-(surfaces|public-site)\.css/,file);
  assert.doesNotMatch(dom.window.document.title,/Business AI/,file);
  for(const img of dom.window.document.querySelectorAll('img'))assert.doesNotMatch(img.getAttribute('src')||'',/business-ai-(mascot|icon|mark)/,file);
  dom.window.close();
 }
});
test('product copy and dynamic fallback logos cannot reintroduce the Business AI shell',()=>{
 for(const file of ['index.html','assets/customer-portal.js','assets/final-showcase.js','assets/marketing.js','assets/knowledge-verification.js','widget.js']){
  assert.doesNotMatch(read(file),/Business AI|Business <(?:strong|span)>AI<\/(?:strong|span)>|business-ai-mascot/,file);
 }
 // URL, storage, widget deduplication and legal acceptance identifiers remain compatible.
 assert.match(read('widget.js'),/business-ai-widget-/);
 assert.match(read('marketing.html'),/support@getbusiness-ai\.com/);
});
test('public site assets resolve from their actual deployed directory',()=>{
 const dom=new JSDOM(read('site/index.html'));
 for(const el of dom.window.document.querySelectorAll('link[rel="stylesheet"],script[src],img[src]')){
  const path=el.getAttribute('href')||el.getAttribute('src');if(!path?.startsWith('/'))continue;
  assert.ok(existsSync(path.split('?')[0].slice(1)),path);
 }
 assert.doesNotMatch(read('site/index.html'),/data-shot=.*\/howto\//);
 dom.window.close();
});
test('widget presents Colzo while keeping business routing and deduplication intact',()=>{
 const dom=new JSDOM('<script src="https://dev.invalid/widget.js" data-business="qa-business"></script>',{runScripts:'outside-only',url:'https://client.invalid/'});
 const w=dom.window,script=w.document.querySelector('script');Object.defineProperty(w.document,'currentScript',{value:script});w.eval(read('widget.js'));
 const node=w.document.querySelector('[data-business-ai-widget]'),root=node.shadowRoot||node;
 assert.equal(root.querySelector('.bai-panel-head span').textContent,'Colzo');
 assert.equal(root.querySelector('iframe').title,'Colzo customer assistant');
 root.querySelector('.bai-launcher').click();
 assert.equal(new URL(root.querySelector('iframe').src).origin,'https://dev.invalid');
 w.eval(read('widget.js'));assert.equal(w.document.querySelectorAll('[data-business-ai-widget]').length,1);w.close();
});
