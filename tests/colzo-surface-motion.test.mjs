import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createSurfaceMotion} from '../src/colzo/motion.js';
function fixture(reduced=false){
 const dom=new JSDOM('<section id="root"></section>');const root=dom.window.document.querySelector('#root');
 let onChange;dom.window.matchMedia=()=>({matches:reduced,addEventListener(_event,fn){onChange=fn},removeEventListener(){}});
 let started=0,cancelled=0;dom.window.HTMLElement.prototype.animate=function(){started++;return {cancel(){cancelled++}}};
 const controller=createSurfaceMotion(root);return {dom,root,controller,stats:()=>({started,cancelled}),reduce:()=>onChange({matches:true})};
}
test('dialog entrances use transform/opacity and cancel immediately when system reduces motion',()=>{
 const f=fixture();const sheet=f.dom.window.document.createElement('section');f.root.append(sheet);f.controller.enter(sheet);
 assert.equal(f.stats().started,1);f.reduce();assert.equal(f.stats().cancelled,1);f.controller.disconnect();f.dom.window.close();
});
test('system and session reduce-motion preferences suppress surface animation',()=>{
 for(const reduced of [true,false]){const f=fixture(reduced);if(!reduced)f.root.classList.add('cn-quiet-motion');const sheet=f.dom.window.document.createElement('section');f.root.append(sheet);f.controller.enter(sheet);assert.equal(f.stats().started,0);f.controller.disconnect();f.dom.window.close();}
});
