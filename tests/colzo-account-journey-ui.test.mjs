import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const cssPath=new URL('../assets/colzo-account-journey.css',import.meta.url);
const css=()=>readFileSync(cssPath,'utf8');
const segment=(a,b)=>{const start=html.indexOf(a);return start<0?'':html.slice(start,html.indexOf(b,start));};

test('Colzo account journey stylesheet loads after existing owner visual themes',()=>{
 assert.ok(html.includes('/assets/colzo-account-journey.css'));
 assert.ok(html.indexOf('/assets/colzo-account-journey.css')>html.indexOf('/assets/colzo-approved-functional.css'));
 assert.match(css(),/body\.colzo-interface/);
 assert.match(css(),/#signUpForm/);
 assert.match(css(),/#businessSetupScreen/);
 assert.match(css(),/#configurationOnboardingScreen/);
});
test('business signup and creation use actual Colzo mark and clear journey stages',()=>{
 const signup=segment('<form id="signUpForm"','</form>');
 const business=segment('<form id="businessSetupForm"','</form>');
 for(const part of [signup,business])assert.match(part,/\/assets\/icons\/colzo-mark\.svg/);
 assert.match(signup,/Account setup.*Step 1 of 3/s);
 assert.match(business,/Business setup.*Step 2 of 3/s);
 assert.match(signup,/id="signUpLegalAccept"/);
 assert.match(business,/id="businessSetupSubmit"/);
});
test('onboarding progress is an accessible real-time seven step indicator',()=>{
 const wizard=segment('<form id="configurationOnboardingForm"','</form>');
 assert.match(wizard,/id="onboardingStepCaption"/);
 assert.match(wizard,/role="progressbar" aria-valuemin="1" aria-valuemax="7" aria-valuenow="1"/);
 assert.match(html,/onboardingProgress\.setAttribute\('aria-valuenow',String\(onboardingWizardIndex\+1\)\)/);
 assert.match(html,/onboardingStepCaption/);
 assert.match(html,/Saved\. You can leave and return at any time\./);
});
test('new account visual layer honours viewport safe areas, hidden forms and reduced motion',()=>{
 const style=css();
 assert.match(style,/env\(safe-area-inset-bottom\)/);
 assert.match(style,/@media\s*\(max-width:\s*520px\)/);
 assert.match(style,/prefers-reduced-motion:\s*reduce/);
 assert.doesNotMatch(style,/#(?:signUpForm|businessSetupForm)\s*\{[^}]*display\s*:\s*block/);
 assert.match(style,/:focus-visible/);
});
