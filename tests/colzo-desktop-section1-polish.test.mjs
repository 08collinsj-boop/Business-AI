import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../assets/colzo-connected-workspace.css',import.meta.url),'utf8');
const block=css.slice(css.indexOf('/* Section 1 desktop refinement'));
test('desktop style refinements remain strictly owner-authenticated and preserve mobile',()=>{
 assert.match(block,/@media \(min-width:1100px\)/);
 assert.match(block,/body\.colzo-owner-enabled\.auth-ready:not\(\.colzo-legacy-mode\) #colzoOwner/);
 assert.match(block,/\.cn-nav \.cn-desktop-workspace-context/);
 assert.match(block,/:focus-visible/);
 assert.doesNotMatch(block,/#dashboardApp/);
});
test('V02 readable KPIs, briefing and reduced motion variants exist',()=>{
 assert.match(block,/\.cn-dash-metric strong/);
 assert.match(block,/font-variant-numeric:tabular-nums/);
 assert.match(block,/\.cn-dash-briefing p/);
 assert.match(block,/min-height:44px/);
 assert.match(block,/@media \(prefers-reduced-motion:reduce\)/);
 assert.match(block,/@media \(min-width:1100px\) and \(max-width:1199px\)/);
});
