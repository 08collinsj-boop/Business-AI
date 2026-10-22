import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../assets/colzo-native.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/colzo-native.css',import.meta.url),'utf8');
const server=readFileSync(new URL('../lib/business-profile-handler.js',import.meta.url),'utf8');

test('profile media upload uses existing private server prepare and verified finalise contract',()=>{
 const from=ui.indexOf('async function uploadNativeProfileMedia');
 const until=ui.indexOf('async function removeNativeProfileMedia',from);
 const flow=ui.slice(from,until);
 assert.ok(from>0&&until>from);
 assert.match(flow,/state\.publicProfileData\?\.can_edit!==true/);
 assert.match(flow,/8\*1024\*1024/);
 assert.match(flow,/file\.size<1/);
 assert.match(flow,/mime!==file\.type/);
 assert.match(flow,/action:'prepare_upload'/);
 assert.match(flow,/prepared\?\.bucket!=='business-profile-media'/);
 assert.match(flow,/uploadToSignedUrl\(prepared\.path,prepared\.token,file,\{contentType:mime\}\)/);
 assert.match(flow,/if\(result\?\.error\)throw/);
 assert.match(flow,/action:'finalize_upload',path:prepared\.path/);
 assert.match(flow,/confirmed\.profile\[column\]!==prepared\.path/);
});
test('removal requires human confirmation and server-confirmed cleared profile image',()=>{
 const from=ui.indexOf('async function removeNativeProfileMedia');
 const until=ui.indexOf('function publicProfile()',from);
 const flow=ui.slice(from,until);
 assert.match(flow,/window\.confirm\(/);
 assert.match(flow,/action:'remove_media',slot/);
 assert.match(flow,/if\(!result\?\.profile\|\|result\.profile\[column\]\)/);
 assert.match(server,/requireBusinessAdmin\(req\)/);
 assert.match(server,/detectedMime\(bytes\) !== input\.mimeType/);
});
test('native public profile displays both slots for authorised owner/admin only',()=>{
 assert.match(ui,/data-public-media-upload="avatar"/);
 assert.match(ui,/data-public-media-upload="banner"/);
 assert.match(ui,/data-public-media-remove="avatar"/);
 assert.match(ui,/data-public-media-remove="banner"/);
 assert.match(ui,/canEdit\?'<input type="file" id="cnPublicMediaInput"/);
 assert.match(ui,/id="cnPublicProfileForm"/);
 assert.match(css,/#colzoOwner \.cn-profile-media-controls/);
 assert.doesNotMatch(css,/#authScreen|#customerPortalScreen/);
});
test('file input and removal are explicit actions protected against losing unsaved profile changes',()=>{
 assert.match(ui,/confirmUnsaved\(\(\)=>\{state\.publicMediaSlot=slot/);
 assert.match(ui,/confirmUnsaved\(\(\)=>removeNativeProfileMedia\(slot\)\)/);
 assert.match(ui,/if\(e\.target\.id==='cnPublicMediaInput'\)/);
 assert.match(ui,/if\(file\)uploadNativeProfileMedia\(file,slot\)/);
 assert.doesNotMatch(ui.slice(ui.indexOf('async function uploadNativeProfileMedia'),ui.indexOf('function publicProfile()')),/marketing-generation|send-message|payment|checkout/);
});
