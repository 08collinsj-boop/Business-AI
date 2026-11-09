import { cp, mkdir, rm, readFile, writeFile, readdir } from 'node:fs/promises';

// The independent public website's Vercel project points at site/. It has no
// npm installation step. Keep its static build dependency-free and never let
// it fall back to an incomplete owner app.
const siteProject = process.env.VERCEL_PROJECT_ID === 'prj_BBQqpP9Kx1Q0u6n7WB7sXR65sN3g'
  || /^business-ai-site-[a-z0-9-]+\.vercel\.app$/i.test(process.env.VERCEL_URL || '');
const isVercelBuild = ['preview', 'production'].includes(process.env.VERCEL_ENV || '');

if (siteProject && isVercelBuild) {
  // This Vercel project's configured Root Directory is site/, so its
  // Output Directory 'public' resolves to site/public, not repo-root public.
  const out = 'site/public';
  await rm(out, { recursive: true, force: true });
  await mkdir(out + '/assets/icons', { recursive: true });
  await mkdir(out + '/site', { recursive: true });
  for (const item of ['index.html', 'site.css', 'site.js',
    'business-ai-icon.svg', 'business-ai-mark.webp', 'howto', 'media']) {
    await cp('site/' + item, out + '/site/' + item, { recursive: true });
  }
  if (process.env.VERCEL_ENV === 'preview' && process.env.COLZO_APP_PREVIEW_URL) {
    const url = new URL(process.env.COLZO_APP_PREVIEW_URL);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.vercel.app') || url.hostname.startsWith('business-ai-site-') || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid Colzo app Preview target');
    const html = await readFile(out + '/site/index.html', 'utf8');
    await writeFile(out + '/site/index.html', html.replace('</head>', '<meta name="colzo-app-preview-url" content="' + url.href + '"></head>'));
  }
  // Preserve the standalone free-pilot interest deep link.
  await cp('site/pilot', out + '/pilot', { recursive: true });
  // Preserve legacy search and contact routes so a rebrand never breaks indexed links.
  for (const route of ['about', 'contact', 'resources', 'ai-receptionist', 'ai-for-trades',
    'teesside', 'small-business-ai', 'ai-marketing', 'ai-marketing-small-business',
    'customer-enquiry-management']) {
    await cp('site/' + route, out + '/' + route, { recursive: true });
  }
  for (const file of ['seo.css', 'site.css', 'robots.txt', 'sitemap.xml', 'llms.txt',
    '6a7bc765020b23425780898c1d0d9d18.txt']) {
    await cp('site/' + file, out + '/' + file);
  }
  // Keep older informational pages' script separate from the redesigned homepage.
  await cp('site/legacy-site.js', out + '/legacy-site.js');
  // Public-domain rewrite points at marketing.html; relative paths in the
  // Colzo landing page refer to /site and /assets.
  await cp(out + '/site/index.html', out + '/index.html');
  await cp(out + '/site/index.html', out + '/marketing.html');
  for (const page of ['contact','pilot']) {
    await cp('site/' + page, out + '/' + page, {recursive:true});
  }
  await cp('legal', out + '/legal', { recursive: true });
  for (const asset of ['colzo-public-site.css', 'colzo-public-site.js', 'colzo-surfaces.css', 'colzo-customer-stitch.css']) {
    await cp('assets/' + asset, out + '/assets/' + asset);
  }
  await cp('assets/icons/colzo-mark.svg', out + '/assets/icons/colzo-mark.svg');
  // Preview copies are review environments, never search landing pages.
  // Apply to every emitted HTML page, including legacy routes and aliases.
  if (process.env.VERCEL_ENV === 'preview') {
    async function preventIndexing(dir) {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = dir + '/' + entry.name;
        if (entry.isDirectory()) await preventIndexing(path);
        else if (entry.name.endsWith('.html')) {
          const html = await readFile(path, 'utf8');
          await writeFile(path, html.replace(/<meta\b[^>]*name=["']robots["'][^>]*>/gi, '')
            .replace('</head>', '<meta name="robots" content="noindex, nofollow"></head>'));
        }
      }
    }
    await preventIndexing(out);
    await writeFile(out + '/robots.txt', 'User-agent: *\nDisallow: /\n');
  }
  console.log('Colzo public-site output prepared at site/public without npm dependencies.');
} else {
  // The authenticated Colzo application MUST have a real compiled React bundle.
  // Import only in this branch: the separate public site deliberately installs
  // no npm modules, while the owner-app project still runs the normal build.
  const { build } = await import('esbuild');
  const result = await build({ entryPoints: ['src/colzo/entry.jsx'], outfile: 'assets/colzo-react.js', bundle: true,
    minify: true, format: 'iife', target: ['safari15', 'chrome100', 'firefox100'], legalComments: 'eof',
    define: { 'process.env.NODE_ENV': '"production"' }, metafile: true });
  console.log('Colzo React content bundle: ' + result.metafile.outputs['assets/colzo-react.js'].bytes + ' bytes before compression.');
  // Explicit static allowlist; backend code and dependencies stay unpublished.
  await rm('public', { recursive: true, force: true });
  await mkdir('public', { recursive: true });
  for (const path of ['index.html','marketing.html','widget.js','manifest.webmanifest','sw.js','assets','legal','site']) {
    await cp(path, 'public/' + path, { recursive: true });
  }
}
