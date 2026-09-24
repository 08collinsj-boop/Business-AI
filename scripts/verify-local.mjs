import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, relative } from 'node:path';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const rootPath = root.pathname;
const ignored = new Set(['node_modules', '.git']);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

function fail(message) {
  console.error(`VERIFY FAILED: ${message}`);
  process.exitCode = 1;
}

const files = await walk(rootPath);
const jsFiles = files.filter(file => /\.(?:m?js)$/.test(file));
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) fail(`${relative(rootPath, file)} syntax error\n${result.stderr || result.stdout}`);
}

const html = await readFile(join(rootPath, 'index.html'), 'utf8');
const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .filter(match => !/\bsrc\s*=/.test(match[0]))
  .map(match => match[1]);
for (const [index, source] of inlineScripts.entries()) {
  try { new vm.Script(source, { filename: `index-inline-${index + 1}.js` }); }
  catch (error) { fail(`index.html inline script ${index + 1}: ${error.message}`); }
}

const textFiles = files.filter(file => /\.(?:js|mjs|html|json|md|sql|webmanifest|example)$/.test(file));
const secretPatterns = [
  /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
  /\bsk-proj-[A-Za-z0-9_-]{16,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g
];
for (const file of textFiles) {
  const text = await readFile(file, 'utf8').catch(() => '');
  for (const pattern of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) fail(`possible real secret pattern in ${relative(rootPath, file)}`);
  }
}

const todoMatches = [];
const verifierPath = join(rootPath, 'scripts', 'verify-local.mjs');
for (const file of textFiles) {
  // The verifier necessarily contains the marker names it searches for, so do not scan itself.
  if (file === verifierPath) continue;
  const text = await readFile(file, 'utf8').catch(() => '');
  if (/\b(?:TODO|FIXME|HACK|XXX)\b/.test(text)) todoMatches.push(relative(rootPath, file));
}
if (todoMatches.length) fail(`temporary markers remain in: ${todoMatches.join(', ')}`);

if (!process.exitCode) {
  console.log(`Verified ${jsFiles.length} JavaScript files, ${inlineScripts.length} inline script(s), secret patterns and temporary markers.`);
}
