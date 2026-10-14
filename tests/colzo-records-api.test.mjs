import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Colzo records API is tenant scoped and restricts mutations to authenticated admins", async () => {
 const js=await readFile(new URL("../lib/colzo-records-handler.js", import.meta.url),"utf8");
 const ops=await readFile(new URL("../api/operations.js", import.meta.url),"utf8");
 assert.match(ops,/"colzo-records": colzoRecordsHandler/);
 assert.match(js,/requireBusinessMember\(req\)/);
 assert.match(js,/requireBusinessAdmin\(req\)/);
 assert.match(js,/auth\.businessId/);
 assert.match(js,/business_id=eq/);
 assert.match(js,/business_id: auth\.businessId/);
 assert.match(js,/Unsupported fields in request/);
 assert.match(js,/Record was|Record could not be confirmed/);
 assert.match(js,/colzo_clients/);
 assert.match(js,/colzo_projects/);
 assert.match(js,/colzo_quotes/);
 assert.match(js,/MFA|sendAuthError/);
 assert.doesNotMatch(js,/req\.body\.business_id/);
 assert.doesNotMatch(js,/\*\s*\}/);
});
