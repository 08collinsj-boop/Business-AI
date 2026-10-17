import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../scripts/'+file,import.meta.url),'utf8');
test('Native projects browser acceptance waits for its async fixture data before asserting rows',()=>{
 const browser=read('colzo-native-browser.cjs');
 assert.match(browser,/waitForFunction\(\(\)=>document\.querySelectorAll\('\.cf-project-card'\)\.length===2/);
 assert.match(browser,/assert\.equal\(await page\.locator\('\.cf-project-card'\)\.count\(\),2\)/);
});
test('Colzo saved-record QA selects the Edit button without accidentally matching Add note',()=>{
 const browser=read('colzo-records-save-browser.cjs');
 assert.doesNotMatch(browser,/page\.locator\('\[data-colzo-edit="clients"\]'\)\.click\(\)/);
 assert.match(browser,/getByRole\('button',\{name:'Edit',exact:true\}\)\.click\(\)/);
 assert.match(browser,/body\.business_id,undefined/);
});
