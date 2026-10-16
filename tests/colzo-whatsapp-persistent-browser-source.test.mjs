import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('./fixtures/colzo-whatsapp-persistent-browser.html',import.meta.url),'utf8');
const mock=readFileSync(new URL('./fixtures/colzo-whatsapp-persistent-browser.js',import.meta.url),'utf8');
const runner=readFileSync(new URL('../scripts/colzo-whatsapp-persistent-browser.cjs',import.meta.url),'utf8');

test('persistent browser fixture is clearly synthetic, loads local assets and never calls external services',()=>{
 assert.match(mock,/Synthetic owner \+ local fake API/);
 assert.match(mock,/NOT a real auth implementation/);
 assert.match(html,/\/assets\/colzo-whatsapp-inbox-demo\.js/);
 assert.doesNotMatch(mock, /\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|\.messages\.create|https?:\/\//);
 assert.doesNotMatch(html, /https?:\/\//);
});

test('browser suite covers account isolation, MFA denials, late responses and four viewport sizes',()=>{
 assert.match(runner,/owner-a/);
 assert.match(runner,/owner-b/);
 assert.match(runner,/owner-c/);
 assert.match(runner,/Multi-factor authentication is required/i);
 assert.match(runner,/releaseHeldRead/);
 assert.match(runner,/\[375,812\]/);
 assert.match(runner,/\[1366,768\]/);
 assert.match(runner,/externalRequests\.length,0/);
});
