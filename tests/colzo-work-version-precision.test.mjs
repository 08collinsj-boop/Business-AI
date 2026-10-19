import test from "node:test";
import assert from "node:assert/strict";
import {sameWorkVersion} from "../lib/colzo-work-version.js";

test("saved versions compare PostgreSQL microseconds exactly",()=>{
 assert.equal(sameWorkVersion("2026-10-19T12:00:00.123456+00:00","2026-10-19T12:00:00.123457Z"),false);
 assert.equal(sameWorkVersion("2026-10-19T12:00:00.123456+00:00","2026-10-19T12:00:00.123456Z"),true);
 assert.equal(sameWorkVersion("2026-10-19T12:00:00.123456Z","2026-10-19T13:00:00.123456+01:00"),true);
 assert.equal(sameWorkVersion("2026-10-19T12:00:00.123Z","2026-10-19T12:00:00.123000+00:00"),true);
 assert.equal(sameWorkVersion("2026-10-19T12:00:00.123Z","2026-10-19T12:00:00.123001+00:00"),false);
});
test("invalid and inconsistent version values never match",()=>{
 assert.equal(sameWorkVersion("garbage","garbage"),false);
 assert.equal(sameWorkVersion(null,null),false);
 assert.equal(sameWorkVersion("2026-10-19T12:00:00.001Z","2026-10-19T12:00:00.002Z"),false);
});
