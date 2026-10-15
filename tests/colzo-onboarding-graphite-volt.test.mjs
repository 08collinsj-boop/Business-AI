import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../assets/colzo-mfa-theme.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function rule(selector){
 const first=css.indexOf(selector+' {');
 assert.ok(first>=0,'Missing graphite wizard rule '+selector);
 const start=css.indexOf('{',first)+1;
 const end=css.indexOf('}',start);
 return css.slice(start,end);
}
test('AI setup has explicit graphite instead of inherited navy option cards',()=>{
 const s=rule('body.colzo-interface #configurationOnboardingScreen .onboarding-ai-option');
 assert.match(s,/background:\s*#252e33\s*!important/i);
 assert.match(s,/border(?:-color)?:[^;]*#4a5654\s*!important/i);
 assert.match(s,/box-shadow:\s*none\s*!important/i);
});
test('Checked option uses Volt lime, neutral radio dot and accessible focus',()=>{
 const selected=rule('body.colzo-interface #configurationOnboardingScreen .onboarding-ai-option:has(input:checked)');
 assert.match(selected,/border-color:\s*#c8ff2e\s*!important/i);
 assert.match(selected,/background:\s*#2a352e\s*!important/i);
 const dot=rule('body.colzo-interface #configurationOnboardingScreen .onboarding-ai-option:has(input:checked) .onboarding-ai-dot');
 assert.match(dot,/border-color:\s*#c8ff2e\s*!important/i);
 assert.match(rule('body.colzo-interface #configurationOnboardingScreen .onboarding-ai-option:focus-within'),/outline:\s*3px solid #c8ff2e\s*!important/i);
});
test('Recommended and ordinary badges have non-blue Colzo colours',()=>{
 const recommended=rule('body.colzo-interface #configurationOnboardingScreen .onboarding-ai-option.recommended small');
 assert.match(recommended,/color:\s*#dfff91\s*!important/i);
 assert.match(recommended,/background:\s*#35412d\s*!important/i);
 const other=rule('body.colzo-interface #configurationOnboardingScreen .onboarding-ai-option small');
 assert.match(other,/background:\s*#374045\s*!important/i);
});
test('All wizard steps have neutral subtitles and action separators with mobile layout',()=>{
 assert.match(rule('body.colzo-interface #configurationOnboardingScreen .wizard-step > p'),/color:\s*#b7c2c7\s*!important/i);
 assert.match(rule('body.colzo-interface #configurationOnboardingScreen .wizard-actions'),/border-top-color:\s*#45525a\s*!important/i);
 assert.match(css,/@media\s*\(max-width:\s*520px\)[\s\S]*#configurationOnboardingScreen \.onboarding-ai-option/);
 assert.match(html,/name="o_ai_handling_mode" value="balanced" checked/);
 assert.match(html,/id="onboardingNext"/);
});
