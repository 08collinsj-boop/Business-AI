import { build } from 'esbuild';
const result = await build({ entryPoints: ['src/colzo/entry.jsx'], outfile: 'assets/colzo-react.js', bundle: true,
  minify: true, format: 'iife', target: ['safari15', 'chrome100', 'firefox100'], legalComments: 'eof',
  define: { 'process.env.NODE_ENV': '"production"' }, metafile: true });
console.log(`Colzo React content bundle: ${result.metafile.outputs['assets/colzo-react.js'].bytes} bytes before compression.`);
