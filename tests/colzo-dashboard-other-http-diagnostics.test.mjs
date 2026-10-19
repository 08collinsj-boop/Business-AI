import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
const start=html.indexOf("function annotateColzoDashboardFailure(");
const end=html.indexOf("\nasync function loadAll(",start);
function check(path,status,reason,preview=true){
  assert.ok(start!==-1&&end>start,"safe dashboard failure helpers must exist");
  const err={message:"Fixture error"};
  return runInNewContext(html.slice(start,end)+
    "\nconst err=annotateColzoDashboardFailure(error,path,status,reason,preview);"+
    "\ncolzoDashboardFailureLabel(err,preview)", {error:err,path,status,reason,preview});
}
test("Preview classifies which initial Dashboard API failed with a safe status",()=>{
  assert.equal(check("/api/settings",503,"service-unavailable")," [Diagnostic: /api/settings HTTP 503, service-unavailable]");
  assert.equal(check("/api/leads",500,"server-error")," [Diagnostic: /api/leads HTTP 500, server-error]");
  assert.equal(check("/api/pipeline",404,"route-unavailable")," [Diagnostic: /api/pipeline HTTP 404, route-unavailable]");
  assert.equal(check("/api/leads",403,"permission-denied")," [Diagnostic: /api/leads HTTP 403, permission-denied]");
});
test("Preview preserves existing 401 distinction",()=>{
  assert.equal(check("/api/settings",401,"backend-session-unverified")," [Diagnostic: /api/settings HTTP 401, backend-session-unverified]");
  assert.equal(check("/api/leads",401,"backend-token-rejected")," [Diagnostic: /api/leads HTTP 401, backend-token-rejected]");
});
test("Preview never displays arbitrary paths, reasons, non-errors or Production diagnostics",()=>{
  assert.equal(check("/api/settings",503,"my_secret_bearer"),"");
  assert.equal(check("/api/other",503,"service-unavailable"),"");
  assert.equal(check("/api/leads",503,"service-unavailable",false),"");
  assert.equal(check("/api/pipeline",200,"service-unavailable"),"");
  assert.equal(check("/api/pipeline",NaN,"service-unavailable"),"");
  assert.equal(check("/api/pipeline",500,"backend-session-unverified"),"");
});
test("Non-401 fetch failures retain safe response route and status, not tokens",()=>{
 assert.match(html,/if\(window\.colzoPreviewAuthTransportEnabled\)throw annotateColzoDashboardFailure\(error,requestUrl\.pathname,response\.status/);
 assert.match(html,/colzoApiStatus=status/);
 assert.match(html,/colzoDashboardFailureLabel\(error,window\.colzoPreviewAuthTransportEnabled\)/);
 assert.doesNotMatch(html,/colzoApi(?:Path|Status|Reason)\s*=\s*.*access_token/);
});

