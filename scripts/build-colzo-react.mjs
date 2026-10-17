import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
const result = await build({ entryPoints: ['src/colzo/entry.jsx'], outfile: 'assets/colzo-react.js', bundle: true,
  minify: true, format: 'iife', target: ['safari15', 'chrome100', 'firefox100'], legalComments: 'eof',
  define: { 'process.env.NODE_ENV': '"production"' }, metafile: true });
console.log(`Colzo React content bundle: ${result.metafile.outputs['assets/colzo-react.js'].bytes} bytes before compression.`);
// Publish an explicit static allowlist, keeping backend code and dependencies
// outside the web output. Vercel discovers the existing root /api separately.
await rm('public', { recursive: true, force: true });
await mkdir('public', { recursive: true });
for (const path of ['index.html','marketing.html','widget.js','manifest.webmanifest','sw.js','assets','legal','site']) {
  await cp(path, `public/${path}`, { recursive: true });
}
