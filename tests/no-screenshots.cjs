/* Preload that turns Playwright screenshots into no-ops, so the existing
 * browser suites can run without writing any image files:
 *   node -r ./tests/no-screenshots.cjs tests/browser_smoke.cjs
 * Every assertion still runs; only page.screenshot() and
 * locator.screenshot() return an empty buffer. */
'use strict';
const Module = require('node:module');
const load = Module._load;
const patched = new WeakSet();
const empty = async () => Buffer.alloc(0);
function patchPage(page) {
  const proto = Object.getPrototypeOf(page);
  if (!patched.has(proto)) { proto.screenshot = empty; patched.add(proto); }
  const locator = page.locator('html'), lproto = Object.getPrototypeOf(locator);
  if (!patched.has(lproto)) { lproto.screenshot = empty; patched.add(lproto); }
  return page;
}
function patchContext(ctx) {
  const newPage = ctx.newPage.bind(ctx);
  ctx.newPage = async (...a) => patchPage(await newPage(...a));
  ctx.on('page', patchPage);
  ctx.pages().forEach(patchPage);
  return ctx;
}
function patchBrowser(browser) {
  const newContext = browser.newContext.bind(browser), newPage = browser.newPage.bind(browser);
  browser.newContext = async (...a) => patchContext(await newContext(...a));
  browser.newPage = async (...a) => patchPage(await newPage(...a));
  return browser;
}
Module._load = function (request, ...rest) {
  const mod = load.call(this, request, ...rest);
  if (/(^|\/)playwright(-core)?$/.test(request) && mod && mod.chromium && !patched.has(mod.chromium)) {
    const {chromium} = mod, launch = chromium.launch.bind(chromium), persistent = chromium.launchPersistentContext.bind(chromium);
    chromium.launch = async (...a) => patchBrowser(await launch(...a));
    chromium.launchPersistentContext = async (...a) => patchContext(await persistent(...a));
    patched.add(chromium);
  }
  return mod;
};
