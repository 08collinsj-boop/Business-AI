import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
function diagnostic(error,enabled=true){
 const begin=html.indexOf("function colzoDashboardFailureLabel(");
 const end=html.indexOf("\nasync function loadAll(",begin);
 assert.ok(begin>=0&&end>begin,"Preview-only dashboard diagnosis helper must exist");
 return runInNewContext(html.slice(begin,end)+"\ncolzoDashboardFailureLabel(error,enabled)",{error,enabled});
}
test("Preview failure reports only a known initial dashboard route and safe 401 category",()=>{
 assert.equal(diagnostic({colzoApiPath:"/api/pipeline",colzoApiStatus:401,colzoApiReason:"backend-session-unverified"})," [Diagnostic: /api/pipeline HTTP 401, backend-session-unverified]");
 assert.equal(diagnostic({colzoApiPath:"/api/leads",colzoApiStatus:401,colzoApiReason:"vercel-protection"})," [Diagnostic: /api/leads HTTP 401, vercel-protection]");
});
test("Preview helper is silent outside Colzo and strips untrusted routes and reasons",()=>{
 assert.equal(diagnostic({colzoApiPath:"/api/settings",colzoApiStatus:401,colzoApiReason:"backend-token-rejected"},false),"");
 assert.equal(diagnostic({colzoApiPath:"/api/customer-portal",colzoApiStatus:401,colzoApiReason:"unclassified"}),"");
 assert.equal(diagnostic({colzoApiPath:"/api/settings",colzoApiStatus:401,colzoApiReason:"secret-token-value"})," [Diagnostic: /api/settings HTTP 401, unclassified]");
 assert.equal(diagnostic({colzoApiPath:"/api/pipeline",colzoApiStatus:500,colzoApiReason:"backend-session-unverified"}),"");
});
test("Valid-sign-in rejection retains safe request identity and dashboard displays diagnosis",()=>{
 assert.match(html,/colzoApiPath\s*=\s*requestUrl\.pathname/);
 assert.match(html,/colzoApiStatus\s*=\s*401/);
 assert.match(html,/colzoDashboardFailureLabel\(error,window\.colzoPreviewAuthTransportEnabled\)/);
 assert.doesNotMatch(html,/colzoApi(?:Path|Status|Reason)\s*=\s*.*access_token/);
});

