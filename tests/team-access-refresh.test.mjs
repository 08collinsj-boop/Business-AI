import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('Team controls recover after delayed owner loading and remain hidden for staff',async()=>{
  const source=await readFile(new URL('../assets/final-showcase.js',import.meta.url),'utf8');
  const code=source.slice(source.indexOf('function polishTeamAccess()'),source.indexOf('function polishSettingsLabels()'));
  const invite={hidden:false},titleInvite={hidden:false},card={hidden:true};
  let note=null;const list={textContent:'Team access is available to the business owner.',replaceChildren(){this.textContent='';}};
  const head={insertAdjacentElement(position,node){note=node;}};
  const view={};const bodyClasses=new Set();
  const context={authenticatedBusinessRole:null,q(selector){if(selector==='.mock-invite-card')return invite;if(selector==='.final-title-row>button')return titleInvite;if(selector==='.final-team-access-note')return note;if(selector==='.mock-team-head')return head;return null;},
    document:{getElementById(id){return {teamView:view,teamPrivacyCard:card,mockTeamList:list}[id];},createElement(){return {remove(){note=null;}};},body:{classList:{toggle(name,on){on?bodyClasses.add(name):bodyClasses.delete(name);}}}},
    renderTeam(){list.textContent='Owner owner access';return 'rendered';}};
  vm.createContext(context);vm.runInContext(code,context);
  context.polishTeamAccess();assert.equal(invite.hidden,true);assert.ok(note);
  context.authenticatedBusinessRole='owner';card.hidden=false;
  assert.equal(context.renderTeam(),'rendered');assert.equal(invite.hidden,false);assert.equal(titleInvite.hidden,false);assert.equal(note,null);assert.equal(bodyClasses.has('final-team-readonly'),false);
  context.authenticatedBusinessRole='member';card.hidden=true;
  context.renderTeam();assert.equal(invite.hidden,true);assert.equal(titleInvite.hidden,true);assert.ok(note);assert.equal(bodyClasses.has('final-team-readonly'),true);
});
