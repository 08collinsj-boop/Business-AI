import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const operations=readFileSync(new URL('../api/operations.js',import.meta.url),'utf8');
const vercel=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));

test('persistent inbox reuses authenticated dispatcher and consumes no new serverless function',()=>{
 assert.match(operations,/import colzoWhatsAppInboxHandler from '\.\.\/lib\/colzo-whatsapp-persistent-handler\.js'/);
 assert.match(operations,/["']colzo-whatsapp-inbox["']: colzoWhatsAppInboxHandler/);
 assert.ok(vercel.rewrites.some(r=>r.source==='/api/colzo-whatsapp-inbox'&&r.destination==='/api/operations?operation=colzo-whatsapp-inbox'));
 assert.equal(vercel.rewrites.filter(r=>r.source==='/api/colzo-whatsapp-inbox').length,1);
});
test('persistent inbox is NOT wired to a live WhatsApp provider webhook or cron',()=>{
 assert.ok(!vercel.rewrites.some(r=>/whatsapp-inbound/i.test(r.source)));
 assert.ok(!vercel.crons.some(c=>/whatsapp/i.test(c.path)));
});
