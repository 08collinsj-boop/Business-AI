import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
test('unsaved decisions are stacked above the editor they protect',()=>{
 const css=['assets/colzo-native.css','assets/colzo-workflows.css'].map(p=>readFileSync(p,'utf8')).join('\n');
 const dom=new JSDOM(`<style>${css}</style><section id="colzoOwner"><div class="cn-work-dialog-backdrop"></div><div class="cn-unsaved-overlay"></div></section>`);
 const win=dom.window;assert.ok(Number(win.getComputedStyle(win.document.querySelector('.cn-unsaved-overlay')).zIndex)>Number(win.getComputedStyle(win.document.querySelector('.cn-work-dialog-backdrop')).zIndex));dom.window.close();
});
