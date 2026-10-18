import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { createSurfaceMotion } from '../src/colzo/motion.js';
const source=readFileSync('assets/colzo-native.js','utf8');
test('nested records, enquiry forms and customer profiles retain their parent tab',()=>{
 const start=source.indexOf(' const primaryScreens=');const end=source.indexOf(' const allowMotion=',start);
 const context=vm.createContext({state:{colzoDetail:{resource:'clients'}}});
 vm.runInContext(source.slice(start,end)+';globalThis.position=navPosition;',context);
 assert.equal(context.position('colzoDetail'),3);
 for(const resource of ['projects','quotes']){context.state.colzoDetail.resource=resource;assert.equal(context.position('colzoDetail'),4)}
 assert.equal(context.position('leadForm'),1);assert.equal(context.position('customer'),3);
});
function surface(){
 const dom=new JSDOM('<section id="root"><section class="cn-command-panel"></section></section>');
 const root=dom.window.document.querySelector('#root'),element=root.firstElementChild,animations=[];
 dom.window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 element.animate=(frames,options)=>{const a={frames,options,cancel(){this.oncancel?.()}};animations.push(a);return a};
 return {dom,root,element,animations,controller:createSurfaceMotion(root)};
}
test('surface stays mounted until exit finishes and completes dismissal only once',()=>{
 const f=surface();let closed=0;
 f.controller.leave(f.element,()=>closed++);assert.equal(closed,0);
 f.animations.at(-1).onfinish();assert.equal(closed,1);
 f.controller.disconnect();assert.equal(closed,1);f.dom.window.close();
});
test('reopening a closing surface cancels stale dismissal',()=>{
 const f=surface();let closed=0;
 f.controller.leave(f.element,()=>closed++);const exit=f.animations.at(-1),staleFinish=exit.onfinish;
 f.controller.enter(f.element);staleFinish();assert.equal(closed,0);
 f.controller.disconnect();f.dom.window.close();
});
test('session reduced motion immediately completes exits without animation',()=>{
 const f=surface();f.root.classList.add('cn-quiet-motion');let closed=0;
 f.controller.leave(f.element,()=>closed++);assert.equal(closed,1);assert.equal(f.animations.length,0);
 f.controller.disconnect();f.dom.window.close();
});

test('explicit tool entrance and observer share one animation',async()=>{
 const f=surface();f.controller.enter(f.element);f.element.classList.add('visible');
 await new Promise(resolve=>setTimeout(resolve,0));assert.equal(f.animations.length,1);
 f.controller.disconnect();f.dom.window.close();
});
test('repeated close requests finish exactly once',()=>{
 const f=surface();let closed=0;f.controller.leave(f.element,()=>closed++);f.controller.leave(f.element,()=>closed++);
 assert.equal(f.animations.length,1);f.animations[0].onfinish();assert.equal(closed,1);
 f.controller.disconnect();f.dom.window.close();
});
test('auth teardown cannot run a detached surface navigation callback',()=>{
 const f=surface();let navigated=0;f.controller.leave(f.element,()=>navigated++);
 f.element.remove();f.root.hidden=true;f.controller.cancel();assert.equal(navigated,0);
 f.controller.disconnect();f.dom.window.close();
});
