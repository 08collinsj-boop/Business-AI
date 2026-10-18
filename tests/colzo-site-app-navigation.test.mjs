import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const script=readFileSync('assets/colzo-public-site.js','utf8');
const app='https://business-ai-git-feature-colzo-complete-ui-m-5f0407-buisness-ai1.vercel.app/';
function render(target='') {
 const dom=new JSDOM(`<meta name="colzo-app-preview-url" content="${target}"><a data-colzo-app-link href="https://app.getbusiness-ai.com/">Open Colzo</a>`,{runScripts:'outside-only',url:'https://business-ai-site-synthetic.vercel.app/'});
 dom.window.eval(script);return dom;
}
test('independent website Preview opens the explicitly configured app Preview instead of itself',()=>{
 const dom=render(app);assert.equal(dom.window.document.querySelector('a').href,app);dom.window.close();
});
test('unconfigured website Preview shows an unavailable link instead of opening Production or itself',()=>{
 const dom=render();const a=dom.window.document.querySelector('a');assert.equal(a.hasAttribute('href'),false);assert.equal(a.getAttribute('aria-disabled'),'true');assert.match(a.textContent,/unavailable/i);dom.window.close();
});
test('website Preview refuses an arbitrary external app target',()=>{
 for(const url of ['https://evil.example/','https://user:password@app.vercel.app/','http://app.vercel.app/']){
  const dom=render(url);assert.equal(dom.window.document.querySelector('a').hasAttribute('href'),false);dom.window.close();
 }
});
