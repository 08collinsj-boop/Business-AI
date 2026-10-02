import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
const read=async path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
test('Marketing access check has a visible loading, timeout and retry state',async()=>{const [html,js,css]=await Promise.all([read('index.html'),read('assets/marketing.js'),read('assets/marketing.css')]);assert.match(html,/id="marketingAccessState"/);assert.match(html,/id="marketingAccessRetry"/);assert.match(js,/withMarketingTimeout/);assert.match(js,/setMarketingAccessState\('loading'\)/);assert.match(js,/marketingAccessRetry/);assert.match(js,/Promise\.allSettled\(\[loadHistory\(\),loadMeta\(\),loadPublications\(\),loadSchedules\(\),loadAutomation\(\)\]\)/);assert.match(css,/marketing-access-state/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);});
test('Marketing bundle contains no mojibake markers',async()=>{const js=await read('assets/marketing.js');assert.equal(/[ÂâÃ]/.test(js),false);assert.match(js,/£/);assert.match(js,/Checking your Marketing access/);});
