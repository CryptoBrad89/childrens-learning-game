'use strict';
// Rerunnable live probe of the premise: a linked child's button selects their progress page.
// Uses existing accounts; creates no users and changes no saved settings.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const playwright = require(process.env.PLAYWRIGHT_MODULE || '/usr/local/lib/pnpm/5/.pnpm/node_modules/playwright');
const recent=JSON.parse(fs.readFileSync('reports/accounts-test-logins.json','utf8'));
const adult = process.env.SELECTION_ADULT || recent.grownup.handle;
const child = process.env.SELECTION_CHILD || recent.child.handle;
const password = process.env.SELECTION_PASSWORD || '7234ab';
async function run() {
  const server = http.createServer((req, res) => {
    let file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
    try {
      if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css'};
      res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store'}).end(fs.readFileSync(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await playwright.chromium.launch({headless:true, executablePath:process.env.CHROMIUM_EXECUTABLE || '/usr/bin/google-chrome', args:['--no-sandbox']});
    const page = await browser.newPage();
    const pageerrors = [];
    page.on('pageerror', error => pageerrors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/accounts/`);
    assert.equal(await page.evaluate(() => ACCOUNT_CONFIG.url), 'https://ixjbgshhzeaosrzavssr.supabase.co');
    await page.locator('#signin-form [name=handle]').fill(adult);
    await page.locator('#signin-form [name=password]').fill(password);
    await page.locator('#signin-form button[type=submit]').click();
    await page.waitForFunction(handle => ACCOUNTS.profile?.handle === handle, adult);
    const row = page.locator('#children-list li').filter({hasText:child});
    await row.waitFor();
    const before = await page.evaluate(async handle => ({
      profile:ACCOUNTS.profile.handle, owner:ACCOUNTS.owner.handle,
      notice:document.getElementById('account-status').textContent,
      inert:document.getElementById('settings-link').inert,
      guardians:await ACCOUNTS.rest('guardians?adult_id=eq.' + ACCOUNTS.profile.id + '&select=child_id'),
      child:(await ACCOUNTS.rest('profiles?handle=eq.' + handle + '&select=id,handle'))[0]
    }), child);
    console.log('Before click:', JSON.stringify(before));
    await row.locator('button').click();
    try {
      await page.waitForFunction(handle => ACCOUNTS.owner?.handle === handle && !document.getElementById('settings-link').inert, child, {timeout:8000});
    } catch { /* Capture the observable failure before asserting it. */ }
    const after = await page.evaluate(() => ({profile:ACCOUNTS.profile.handle, owner:ACCOUNTS.owner.handle,
      notice:document.getElementById('account-status').textContent, inert:document.getElementById('settings-link').inert}));
    console.log('After click:', JSON.stringify({...after, pageerrors}));
    assert.deepEqual(pageerrors, [], 'Click must not raise a page error');
    assert.equal(after.owner, child, 'Click must select the linked child');
    assert.equal(after.profile, adult, 'Selection keeps the adult signed in');
    assert.equal(after.inert, false, 'Settings navigation unlocks after selection');
    await page.locator('#child-settings-link').click();
    await page.waitForFunction(handle => ACCOUNTS.owner?.handle === handle, child);
    assert.equal(await page.evaluate(() => ACCOUNTS.profile.handle), adult);
    console.log('PASS LIVE: linked child button selects progress page and settings navigation preserves adult identity and selected child');
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
