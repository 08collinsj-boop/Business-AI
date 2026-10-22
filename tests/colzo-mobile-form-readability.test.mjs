import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync('assets/colzo-native.css','utf8');
const functional=readFileSync('assets/colzo-approved-functional.css','utf8');
test('iPhone editable form text is at least 16px so focusing fields does not trigger unwanted Safari zoom',()=>{
 assert.match(css,/#colzoOwner \.cn-colzo-record-form :is\(input:not\(\[type=range\]\),select,textarea\)\{font-size:16px/);
 assert.match(functional,/#colzoOwner \.cn-approved-form-group :is\(input,textarea\)\{font-size:16px/);
});
test('small-phone project and quote forms use reduced padding without horizontal overflow',()=>{
 assert.match(css,/@media\(max-width:380px\)\{#colzoOwner \.cn-colzo-record-form\{padding:14px/);
 assert.match(css,/#colzoOwner \.cn-colzo-record-form \.cn-form-actions\{flex-wrap:wrap/);
});
test('existing Graphite and Volt colours and accepted customer form remain preserved',()=>{
 assert.match(css,/#colzoOwner \.cn-colzo-record-form \.cn-primary\{flex:1;border:0;background:var\(--cn-volt/);
 assert.match(functional,/#colzoOwner \.cn-approved-form-group input,/);
});
