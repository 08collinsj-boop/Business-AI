/* Offline browser acceptance for the Colzo persisted inbox.
 * The browser serves local synthetic fixtures only. No real credentials or external requests.
 */
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const assert = require('node:assert/strict');
const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    server.close(() => resolve(port));
  });
});
(async () => {
  const port = await freePort();
  const base = 'http://127.0.0.1:' + port;
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: 'ignore', detached: process.platform !== 'win32'
  });
  let browser;
  try {
    await new Promise(resolve => setTimeout(resolve, 350));
    browser = await chromium.launch({headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
    for (const [width, height] of [[375,812], [390,844], [430,932], [1366,768]]) {
      const page = await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600,serviceWorkers:'block'});
      const externalRequests = [];
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('request', request => {
        if (!request.url().startsWith(base + '/')) externalRequests.push(request.url());
      });
      await page.goto(base + '/tests/fixtures/colzo-whatsapp-persistent-browser.html',{waitUntil:'networkidle',timeout:15000});
      assert.match(await page.locator('.cn-wa-demo-notice').innerText(),/Demo only/);
      assert.equal(await page.locator('.cn-wa-title-line span').innerText(),'Local preview');
      assert.equal(await page.locator('[data-wa-action^="send"]').count(),0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2),false, 'overflow '+width);
      await page.getByRole('button',{name:'Save fictional chats'}).click();
      await page.locator('.cn-wa-demo-notice').getByText('Saved fictional conversations').waitFor();
      assert.match(await page.locator('.cn-wa-title-line').innerText(),/Saved demo/);
      assert.equal(await page.locator('.cn-wa-thread').count(),3);
      await page.getByRole('button',{name:/Sample customer A/}).click();
      await page.getByRole('button',{name:'Mark for human'}).click();
      await page.locator('.cn-wa-handover-text').waitFor();
      assert.equal(await page.evaluate(() => window.fixture.getRows('owner-a').find(t => t.fixture_key==='demo-a').state), 'human');

      await page.evaluate(() => window.fixture.switchAccount('owner-b'));
      assert.match(await page.locator('.cn-wa-demo-notice').innerText(),/Demo only/);
      await page.getByRole('button',{name:'Load saved demo'}).click();
      await page.getByText(/saved demo is unavailable or empty/i).waitFor();
      assert.doesNotMatch(await page.locator('.cn-wa-conversation').innerText(),/assigned to a person/i);
      await page.getByRole('button',{name:'Save fictional chats'}).click();
      await page.locator('.cn-wa-demo-notice').getByText('Saved fictional conversations').waitFor();
      assert.equal(await page.evaluate(() => window.fixture.getRows('owner-b').find(t => t.fixture_key==='demo-a').state), 'review');
      await page.evaluate(() => window.fixture.switchAccount('owner-a'));
      await page.getByRole('button',{name:'Load saved demo'}).click();
      await page.locator('.cn-wa-demo-notice').getByText('Saved fictional conversations').waitFor();
      assert.equal(await page.locator('.cn-wa-handover-text').count(),1);

      await page.evaluate(() => window.fixture.switchAccount('owner-c'));
      await page.evaluate(() => window.fixture.setMfa(false));
      await page.getByRole('button',{name:'Save fictional chats'}).click();
      await page.getByText(/multi-factor authentication is required/i).waitFor();
      assert.equal(await page.evaluate(() => window.fixture.getRows('owner-c').length),0);
      await page.evaluate(() => window.fixture.setMfa(true));
      await page.getByRole('button',{name:'Save fictional chats'}).click();
      await page.locator('.cn-wa-demo-notice').getByText('Saved fictional conversations').waitFor();
      await page.evaluate(() => window.fixture.setMfa(false));
      await page.getByRole('button',{name:'Mark for human'}).click();
      await page.getByText(/multi-factor authentication is required/i).waitFor();
      assert.equal(await page.evaluate(() => window.fixture.getRows('owner-c').find(t=>t.fixture_key==='demo-a').state),'review');

      await page.evaluate(() => window.fixture.switchAccount('owner-a'));
      await page.evaluate(() => window.fixture.holdNextRead());
      await page.getByRole('button',{name:'Load saved demo'}).click();
      await page.evaluate(() => window.fixture.switchAccount('owner-b'));
      await page.evaluate(() => window.fixture.releaseHeldRead());
      await page.waitForTimeout(60);
      assert.match(await page.locator('.cn-wa-demo-notice').innerText(),/Demo only/);
      assert.doesNotMatch(await page.locator('.cn-wa-conversation').innerText(),/assigned to a person/i);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2),false);
      assert.equal(externalRequests.length,0);
      assert.deepEqual(pageErrors,[]);
      console.log('PASS ' + width + 'x' + height + ' synthetic saved inbox, 2 tenants, MFA, logout race, no external requests');
      await page.close();
    }
  } finally {
    if (browser) await browser.close();
    try {
      if(process.platform==='win32') server.kill('SIGTERM');else process.kill(-server.pid,'SIGTERM');
    } catch(error) { if(error.code!=='ESRCH') throw error; }
  }
})().catch(error => {console.error(error.stack||error); process.exitCode=1;});
