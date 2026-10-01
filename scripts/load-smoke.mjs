const baseRaw=process.env.LOAD_TEST_BASE_URL||'https://business-ai-pilot.vercel.app';
const base=new URL(baseRaw);
if(!/^https?:$/.test(base.protocol))throw new Error('LOAD_TEST_BASE_URL must use http or https');
const total=Math.min(200,Math.max(1,Number.parseInt(process.env.LOAD_TEST_REQUESTS||'25',10)||25));
const concurrency=Math.min(20,Math.max(1,Number.parseInt(process.env.LOAD_TEST_CONCURRENCY||'5',10)||5));
const slug=String(process.env.LOAD_TEST_BUSINESS_SLUG||'').trim().toLowerCase();
const targets=[new URL('/api/health',base)];
if(slug){
  if(!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(slug))throw new Error('LOAD_TEST_BUSINESS_SLUG is invalid');
  const publicBusiness=new URL('/api/public-business',base);publicBusiness.searchParams.set('business',slug);targets.push(publicBusiness);
}
const durations=[];let failures=0,next=0;
async function worker(){
  while(true){
    const id=next++;if(id>=total)return;
    const target=targets[id%targets.length];const started=performance.now();
    try{const response=await fetch(target,{headers:{Accept:'application/json'},redirect:'error'});if(!response.ok)failures++;await response.arrayBuffer();}
    catch{failures++;}
    durations.push(performance.now()-started);
  }
}
await Promise.all(Array.from({length:Math.min(concurrency,total)},worker));
durations.sort((a,b)=>a-b);
const percentile=p=>durations[Math.min(durations.length-1,Math.floor((durations.length-1)*p))]||0;
const report={base:base.origin,requests:total,concurrency,targets:targets.map(x=>x.pathname),failures,p50_ms:Math.round(percentile(.5)),p95_ms:Math.round(percentile(.95)),max_ms:Math.round(durations.at(-1)||0)};
console.log(JSON.stringify(report,null,2));
if(failures)process.exitCode=1;
