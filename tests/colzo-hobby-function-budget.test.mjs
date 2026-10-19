import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";

test("Vercel Hobby remains within 12 physical API functions", async () => {
  const apiFiles = (await readdir(new URL("../api/", import.meta.url)))
    .filter(name => name.endsWith(".js"));
  assert.ok(apiFiles.length <= 12, "Hobby deployment has " + apiFiles.length + " physical API functions");
});

test("Colzo lead fixes remain an internal dispatcher handler, not a new physical function", async () => {
  const dispatcher = await readFile(new URL("../api/operations.js", import.meta.url), "utf8");
  assert.match(dispatcher, /from "\.\.\/lib\/colzo-leads-handler\.js"/);
  const handler = await readFile(new URL("../lib/colzo-leads-handler.js", import.meta.url), "utf8");
  assert.match(handler, /confirmedSavedLead/);
});

