import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

for (const appTarget of ['', 'https://colzo-app-synthetic.vercel.app/']) test('separate public-site Preview builds its static Colzo website without esbuild: ' + (appTarget ? 'configured app' : 'no app target'), () => {
  const dir = mkdtempSync(join(tmpdir(), 'colzo-site-build-'));
  try {
    mkdirSync(join(dir, 'scripts'), { recursive: true });
    cpSync('scripts/build-colzo-react.mjs', join(dir, 'scripts/build-colzo-react.mjs'));
    cpSync('site', join(dir, 'site'), { recursive: true });
    cpSync('legal', join(dir, 'legal'), { recursive: true });
    for (const file of ['colzo-public-site.css', 'colzo-public-site.js', 'colzo-surfaces.css', 'icons/colzo-mark.svg']) {
      mkdirSync(join(dir, 'assets', file.includes('/') ? 'icons' : ''), { recursive: true });
      cpSync('assets/' + file, join(dir, 'assets', file));
    }
    const res = spawnSync(process.execPath, ['scripts/build-colzo-react.mjs'], {
      cwd: dir, encoding: 'utf8',
      env: { ...process.env, VERCEL_ENV: 'preview', VERCEL_PROJECT_ID: '',
        VERCEL_URL: 'business-ai-site-qa-buisness-ai1.vercel.app', COLZO_APP_PREVIEW_URL: appTarget },
    });
    assert.equal(res.status, 0, res.stderr);
    for (const file of ['index.html', 'marketing.html', 'site/site.css', 'site/site.js',
      'assets/colzo-public-site.css', 'assets/colzo-public-site.js', 'assets/colzo-surfaces.css',
      'assets/icons/colzo-mark.svg', 'legal/privacy.html', 'contact/index.html', 'pilot/index.html']) {
      assert.ok(existsSync(join(dir, 'site', 'public', file)), file);
    }
    assert.equal(existsSync(join(dir, 'public')), false, 'output must be under site root');
    const html=readFileSync(join(dir, 'site/public/index.html'), 'utf8');
    if(appTarget) {
      assert.ok(html.includes('<meta name="colzo-app-preview-url" content="'+appTarget+'">'));
      for(const page of ['index.html','marketing.html','site/index.html']) assert.equal(readFileSync(join(dir,'site/public',page),'utf8'),html);
    } else assert.equal(html,readFileSync('site/index.html','utf8'));
    for (const forbidden of ['api', 'lib', 'node_modules', 'src', 'tests', 'assets/colzo-react.js']) {
      assert.equal(existsSync(join(dir, 'site', 'public', forbidden)), false, forbidden);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('owner-app build must not silently fall back to static site when esbuild is unavailable', () => {
  const dir = mkdtempSync(join(tmpdir(), 'colzo-owner-build-'));
  try {
    mkdirSync(join(dir, 'scripts'), { recursive: true });
    cpSync('scripts/build-colzo-react.mjs', join(dir, 'scripts/build-colzo-react.mjs'));
    const res = spawnSync(process.execPath, ['scripts/build-colzo-react.mjs'], {
      cwd: dir, encoding: 'utf8',
      env: { ...process.env, VERCEL_ENV: 'preview', VERCEL_PROJECT_ID: '',
        VERCEL_URL: 'business-qa-buisness-ai1.vercel.app' },
    });
    assert.notEqual(res.status, 0);
    assert.equal(existsSync(join(dir, 'site/public/index.html')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
