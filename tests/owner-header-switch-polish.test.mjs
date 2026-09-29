import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("owner header uses the polished responsive composition", () => {
  assert.match(html, /body\.auth-ready \.topbar\{/);
  assert.match(html, /grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(html, /body\.auth-ready \.owner-avatar\{/);
  assert.match(html, /aspect-ratio:1\/1/);
  assert.match(html, /border-radius:50%/);
  assert.match(html, /class="logout-icon"/);
  assert.match(html, /class="logout-label"/);
});

test("settings switches suppress the native Safari control and keep the knob inside the track", () => {
  assert.match(html, /input\.switch\{/);
  assert.match(html, /-webkit-appearance:none/);
  assert.match(html, /width:48px!important/);
  assert.match(html, /height:28px!important/);
  assert.match(html, /input\.switch:checked:before\{transform:translateX\(20px\)\}/);
  assert.match(html, /\.directory-visibility-row\{/);
});
