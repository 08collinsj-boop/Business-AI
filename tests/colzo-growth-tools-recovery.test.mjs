import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const owner=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const settings=readFileSync(new URL('../api/settings.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/colzo-native.css',import.meta.url),'utf8');

test('Growth route has native navigation, supported owner tooling and safe return to More',()=>{
 assert.match(owner,/function growth\(\)/);
 assert.match(owner,/growth:\['more','More'\]/);
 assert.match(owner,/function navigate\(screen\)/);
 assert.match(owner,/'marketing','receptionist','growth','billing','knowledge'/);
 assert.match(owner,/if\(screen==='growth'\)loadGrowth\(\)/);
 assert.match(owner,/\['growth','↗','Growth & sharing'/);
});
test('Growth reads tenant-scoped existing settings and public profile, plus owner-only referrals',()=>{
 assert.match(owner,/Promise\.allSettled\(\[api\('\/api\/settings'\),api\('\/api\/business-profile'\),api\('\/api\/referrals'\)\]\)/);
 assert.match(settings,/can_manage: \['owner','admin'\]\.includes\(auth\.role\)/);
 assert.match(owner,/state\.growthCanManage=settled\[0\]\.value\.can_manage===true/);
 assert.match(owner,/state\.growthReferral=settled\[2\]\.status==='fulfilled'/);
});
test('Review and follow-up changes use separate explicit save actions and never send messages',()=>{
 const x=owner.slice(owner.indexOf('async function saveGrowthSettings'),owner.indexOf('function growth(){'));
 assert.match(x,/review_requests_enabled=fd\.get\('review_enabled'\)==='on'/);
 assert.match(x,/review_google_url/);
 assert.match(x,/review_facebook_url/);
 assert.match(x,/automatic_follow_up_enabled=fd\.get\('followup_enabled'\)==='on'/);
 assert.match(x,/!\[24,48,72\]\.includes/);
 assert.match(x,/window\.confirm\(/);
 assert.match(x,/api\('\/api\/settings',\{method:'PATCH'/);
 assert.match(x,/The server did not confirm the saved settings/);
 assert.doesNotMatch(x,/api\/(?:enquiry|email|send|messag|marketing|voice)/);
});
test('Links and QR code are based only on server-returned valid public slug',()=>{
 const x=owner.slice(owner.indexOf('function growth(){'),owner.indexOf('async function loadVoiceStatus'));
 assert.match(x,/const slug=String\(profile\.public_slug\|\|''\)/);
 assert.match(x,/validSlug=\/\^\[a-z0-9\]/);
 assert.match(x,/new URL\('\/customer',window\.location\.origin\)/);
 assert.match(x,/\/api\/qr-code\?business=/);
 assert.match(x,/new URL\('\/widget\.js',window\.location\.origin\)/);
 assert.match(x,/Development links are for testing only/);
 assert.match(x,/id="cnGrowthReferralLink"/);
});
test('Read-only roles do not receive review/follow-up save buttons or referral data',()=>{
 assert.match(owner,/state\.growthCanManage/);
 assert.match(owner,/canManage\?'<button class="cn-primary" type="submit"/);
 assert.match(owner,/referralCode=typeof r\?\.code/);
 assert.match(owner,/!canManage\?'disabled'/);
 assert.match(css,/#colzoOwner \.cn-growth-toggle/);
 assert.doesNotMatch(css,/#authScreen|#customerPortalScreen/);
});
