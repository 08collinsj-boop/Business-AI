/* Run with --candidate https://a-preview.vercel.app (or COLZO_RELEASE_CANDIDATE_URL).
 * Pure GET preflight; never promotes, deploys, mutates or touches customer records. */
import {checkCutover} from '../lib/colzo-release-gate.js';
const flag=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1]||null};
const live=flag('--live')||'https://app.getbusiness-ai.com';
const candidate=flag('--candidate')||process.env.COLZO_RELEASE_CANDIDATE_URL;
if(!candidate){console.error('Supply a Vercel candidate URL with --candidate. No changes were made.');process.exit(2)}
try{
 const result=await checkCutover({live,candidate});
 for(const check of result.checks)console.log(`${check.pass?'PASS':'BLOCK'} | ${check.name} | HTTP ${check.http??'unavailable'}`);
 console.log(result.pass?'GATE PASS — only public, data-free preflight; authenticated QA, backup and rollback sign-off still required.':'GATE BLOCKED — do not promote this candidate to production.');
 if(!result.pass)process.exitCode=1;
}catch(e){console.error('GATE BLOCKED:',e.message);process.exitCode=2}
