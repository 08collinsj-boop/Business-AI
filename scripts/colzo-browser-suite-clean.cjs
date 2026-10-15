/* Repeatable, synthetic-only Chromium smoke runner for Colzo.
 * Spawns each existing fixture script in a new process group and uses a fresh
 * local port, preventing orphaned test HTTP servers causing false failures.
 * No credentials, customer data, external API writes or deployments.
 * Requires locally available Playwright Chromium. Optional --only=file1,file2.
 */
const {spawn}=require('node:child_process');
const net=require('node:net');
const path=require('node:path');
const fs=require('node:fs');

const TESTS=[
 ['colzo-auth-browser.cjs','COLZO_AUTH_QA_PORT'],
 ['colzo-mfa-browser.cjs','COLZO_MFA_QA_PORT'],
 ['colzo-records-save-browser.cjs','COLZO_RECORDS_QA_PORT'],
 ['colzo-lead-save-browser.cjs','COLZO_LEADS_QA_PORT'],
 ['colzo-security-methods-browser.cjs','COLZO_SECURITY_QA_PORT'],
 ['colzo-native-browser.cjs','COLZO_NATIVE_QA_PORT'],
 ['colzo-settings-browser.cjs','COLZO_SETTINGS_QA_PORT'],
 ['colzo-workflows-browser.cjs','COLZO_WORKFLOWS_QA_PORT'],
 ['colzo-safe-shell-browser.cjs','COLZO_SAFE_QA_PORT'],
 ['colzo-motion-browser.cjs','COLZO_MOTION_QA_PORT'],
 ['colzo-owner-visual-smoke.cjs','COLZO_OWNER_VISUAL_PORT'],
 ['colzo-auth-colour-browser.cjs','COLZO_AUTH_COLOUR_QA_PORT']
];
const all=new Map(TESTS);
const arg=process.argv.find(x=>x.startsWith('--only='));
const selected=arg?arg.slice('--only='.length).split(',').map(x=>x.trim()).filter(Boolean):TESTS.map(x=>x[0]);
if(process.argv.includes('--list')){console.log(TESTS.map(([n])=>n).join('\n'));process.exit(0);}
if(!selected.length||selected.some(x=>!all.has(x))){console.error('Invalid --only selection, use --list');process.exit(2);}
for(const name of selected){
 if(!fs.existsSync(path.join(__dirname,name))){console.error('Missing fixture '+name);process.exit(2);}
}
try{require.resolve('playwright');}catch{
 console.error('Playwright is not installed. Install locally for isolated QA; do not install or invoke production credentials.');
 process.exit(2);
}
const timeoutMs=Number(process.env.COLZO_BROWSER_TIMEOUT_MS||90000);
if(!Number.isInteger(timeoutMs)||timeoutMs<10000||timeoutMs>180000)throw Error('Invalid browser QA timeout');

async function freePort(){
 return await new Promise((resolve,reject)=>{
  const server=net.createServer();
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>{
   const port=server.address().port;
   server.close(error=>error?reject(error):resolve(port));
  });
 });
}
function killGroup(child,signal){
 if(!child.pid)return;
 try{
  if(process.platform==='win32')child.kill(signal);
  else process.kill(-child.pid,signal);
 }catch(error){if(error.code!=='ESRCH')throw error;}
}
async function runFixture(name,variable){
 const port=await freePort(),start=Date.now();
 const env={...process.env,[variable]:String(port)};
 const child=spawn(process.execPath,[path.join(__dirname,name)],{
  cwd:path.resolve(__dirname,'..'),env,stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'
 });
 let output='',errors='',expired=false;
 child.stdout.on('data',chunk=>{output=(output+chunk.toString()).slice(-3800);});
 child.stderr.on('data',chunk=>{errors=(errors+chunk.toString()).slice(-2300);});
 const result=await new Promise(resolve=>{
  let settled=false;
  const finish=(code,error)=>{
   if(settled)return;settled=true;clearTimeout(timer);
   // The fixture's local Python server belongs to the same process group.
   // Clean it even if Node exits without killing its server process.
   killGroup(child,'SIGTERM');
   resolve({ok:!expired&&!error&&code===0,name,ms:Date.now()-start,
    summary:output.trim().split('\n').slice(-2).join(' | '),
    error:error?String(error):(expired?'timeout':errors.trim().slice(-500))});
  };
  const timer=setTimeout(()=>{
   expired=true;killGroup(child,'SIGTERM');
   setTimeout(()=>{if(!settled)killGroup(child,'SIGKILL');},1500).unref();
  },timeoutMs);
  child.once('error',error=>finish(-1,error));
  child.once('close',code=>finish(code,null));
 });
 return result;
}
(async()=>{
 let pass=0;
 for(const name of selected){
  const result=await runFixture(name,all.get(name));
  console.log(JSON.stringify(result));
  if(result.ok)pass++;
 }
 console.log('COLZO_SYNTHETIC_BROWSER_SUMMARY '+pass+'/'+selected.length+' PASS');
 if(pass!==selected.length)process.exitCode=1;
})().catch(e=>{console.error('QA runner failed: '+e.message);process.exitCode=2});
