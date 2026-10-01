const SAFE_OPERATION=/^[a-z0-9-]{1,80}$/;
const SAFE_METHOD=/^[A-Z]{3,10}$/;

function thresholdMs(){
  const raw=Number(process.env.OPERATIONS_SLOW_REQUEST_MS||2000);
  return Number.isFinite(raw)&&raw>=500&&raw<=60000?Math.round(raw):2000;
}

function safeName(error){
  const name=typeof error?.name==='string'?error.name:'';
  return /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(name)?name:'Error';
}

export function observeOperation(req,res,operation){
  const started=Date.now();
  const op=SAFE_OPERATION.test(String(operation||''))?String(operation):'unknown';
  const method=SAFE_METHOD.test(String(req?.method||'').toUpperCase())?String(req.method).toUpperCase():'UNKNOWN';
  let completed=false,failed=false;
  const write=(event,extra)=>console.error(JSON.stringify({event,operation:op,method,...extra}));
  const complete=()=>{
    if(completed)return;completed=true;
    const duration=Math.max(0,Date.now()-started);
    const status=Number.isFinite(Number(res?.statusCode))?Number(res.statusCode):200;
    const slow=duration>=thresholdMs();
    if(status>=500||slow)write('operations.request',{status,duration_ms:duration,slow});
  };
  const fail=error=>{
    if(failed)return;failed=true;
    write('operations.unhandled',{error_name:safeName(error)});
  };
  if(typeof res?.once==='function')res.once('finish',complete);
  return {complete,fail};
}
