import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
test('mobile QA loads the actual same-origin app without credentials, proxying or device claims',()=>{
 const html=readFileSync('qa/colzo-mobile.html','utf8');const dom=new JSDOM(html,{url:'https://preview.example/colzo-qa-mobile.html'});
 const frame=dom.window.document.querySelector('iframe');assert.equal(frame.getAttribute('src'),'/');
 assert.equal(frame.getAttribute('title'),'Colzo real app in an iPhone-sized CSS viewport');
 assert.equal(dom.window.document.querySelectorAll('script').length,0);
 assert.match(html,/390px/);assert.match(html,/375px/);assert.match(html,/844px/);assert.match(html,/450px/);
 assert.match(dom.window.document.body.textContent,/not native Safari|does not emulate native Safari/i);dom.window.close();
});
test('ordinary local build does not publish the Development mobile QA page',()=>assert.equal(existsSync('public/colzo-qa-mobile.html'),false));
