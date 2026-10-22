import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createGestureNavigation,createKpiMotion} from '../src/colzo/interactions.js';
function fixture(){
 const dom=new JSDOM('<section id="root" data-screen="home"><div class="cn-record-inspector"><p>Details</p><input></div><div class="cn-work-calendar">Month</div><section class="cn-work-dialog"><button data-cn-drag-handle>Close</button></section><strong data-cn-kpi="Enquiries">4</strong></section>');
 const root=dom.window.document.querySelector('#root');dom.window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 const send=(target,type,x,y,extra={})=>target.dispatchEvent(Object.assign(new dom.window.Event(type,{bubbles:true}),{pointerId:1,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,...extra}));
 return {dom,root,send};
}
test('touch back ignores inputs and vertical scrolling but accepts a deliberate horizontal swipe',()=>{
 const f=fixture();let back=0;const c=createGestureNavigation(f.root,{onBack:()=>back++});const p=f.root.querySelector('p');
 f.send(p,'pointerdown',90,100);f.send(p,'pointerup',100,240);assert.equal(back,0);
 const input=f.root.querySelector('input');f.send(input,'pointerdown',90,100);f.send(input,'pointerup',220,100);assert.equal(back,0);
 f.send(p,'pointerdown',90,100);f.send(p,'pointerup',220,110);assert.equal(back,1);
 c.disconnect();f.dom.window.close();
});
test('calendar swipes change only one month and cancellation never navigates',()=>{
 const f=fixture(),steps=[];const c=createGestureNavigation(f.root,{onCalendar:n=>steps.push(n)});const calendar=f.root.querySelector('.cn-work-calendar');
 f.send(calendar,'pointerdown',240,100);f.send(calendar,'pointerup',100,105);assert.deepEqual(steps,[1]);
 f.send(calendar,'pointerdown',90,100);f.send(calendar,'pointercancel',200,100);f.send(calendar,'pointerup',200,100);assert.deepEqual(steps,[1]);c.disconnect();f.dom.window.close();
});
test('drag dismissal respects the busy gate and keeps explicit close available',()=>{
 const f=fixture();let closed=0,busy=true;const c=createGestureNavigation(f.root,{onDismiss:()=>closed++,canDismiss:()=>!busy});const handle=f.root.querySelector('button');
 for(const locked of [true,false]){busy=locked;f.send(handle,'pointerdown',150,100);f.send(handle,'pointerup',150,230)}
 assert.equal(closed,1);assert.ok(handle.isConnected);c.disconnect();f.dom.window.close();
});
test('KPI changes keep actual accessible values and finish at the verified number',()=>{
 const f=fixture(),frames=new Map();let next=0;f.dom.window.requestAnimationFrame=fn=>{frames.set(++next,fn);return next};f.dom.window.cancelAnimationFrame=id=>frames.delete(id);f.dom.window.performance.now=()=>0;
 const c=createKpiMotion(f.root),before=c.capture(),value=f.root.querySelector('strong');value.textContent='9';c.update(before);
 assert.equal(value.textContent,'9');const animated=f.root.querySelector('[data-cn-kpi-visual]');assert.ok(animated);assert.equal(animated.getAttribute('aria-hidden'),'true');
 [...frames.values()][0](300);assert.equal(f.root.querySelector('[data-cn-kpi-visual]'),null);assert.equal(value.textContent,'9');assert.equal(value.style.opacity,'');c.disconnect();f.dom.window.close();
});
test('KPI first paint, another screen and reduced motion never count up from invented zero',()=>{
 const f=fixture();let started=0;f.dom.window.requestAnimationFrame=()=>{started++;return 1};f.dom.window.cancelAnimationFrame=()=>{};
 const c=createKpiMotion(f.root);c.update(null);const before=c.capture();f.root.dataset.screen='analytics';f.root.querySelector('strong').textContent='8';c.update(before);assert.equal(started,0);
 const current=c.capture();f.root.classList.add('cn-quiet-motion');f.root.querySelector('strong').textContent='10';c.update(current);assert.equal(started,0);c.disconnect();f.dom.window.close();
});
test('a short drag cannot accidentally activate the close button or steal an OS edge swipe',()=>{
 const f=fixture();let clicked=0,back=0;const c=createGestureNavigation(f.root,{onBack:()=>back++});const handle=f.root.querySelector('button');handle.addEventListener('click',()=>clicked++);
 f.send(handle,'pointerdown',120,100);f.send(handle,'pointerup',120,140);handle.click();assert.equal(clicked,0);
 const p=f.root.querySelector('p');f.send(p,'pointerdown',5,100);f.send(p,'pointerup',160,100);assert.equal(back,0);c.disconnect();f.dom.window.close();
});
test('zero baseline is displayed directly on first data arrival instead of counting up from an unloaded zero',()=>{
 const f=fixture();let started=0;f.dom.window.requestAnimationFrame=()=>{started++;return 1};f.dom.window.cancelAnimationFrame=()=>{};
 const value=f.root.querySelector('strong');value.textContent='0';const c=createKpiMotion(f.root),before=c.capture();value.textContent='9';c.update(before);assert.equal(started,0);assert.equal(value.textContent,'9');c.disconnect();f.dom.window.close();
});
