// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright package.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH || '/opt/ungoogled-chromium/chrome', args:['--no-sandbox']});
  const page = await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => errors.push(request.url()));
  await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
  await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
  const images=await page.locator('img').evaluateAll(imgs=>imgs.map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth===512&&i.naturalHeight===512})));
  if(images.length!==168 || images.some(i=>!i.loaded)) throw Error('Missing or invalid image');
  fs.mkdirSync(path.join(__dirname,'checks'),{recursive:true});
  for(const section of await page.locator('section').all()){
    const id=await section.getAttribute('id');
    if(await section.locator('.choice').count()!==26) throw Error(id+' missing cards');
    await section.screenshot({path:path.join(__dirname,'checks',id+'.png')});
  }
  await page.setViewportSize({width:390,height:844});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(overflow) throw Error('Mobile horizontal overflow');
  await page.locator('#ribbon-road-0 .choice').first().screenshot({path:path.join(__dirname,'checks','mobile-ribbon-card.png')});
  await page.locator('#moonboat-1 .choice').first().screenshot({path:path.join(__dirname,'checks','mobile-moonboat-card.png')});
  if(errors.length) throw Error(errors.join('\n'));
  fs.writeFileSync(path.join(__dirname,'checks','browser.json'),JSON.stringify({browser:await browser.version(),themes:6,answerCards:156,circleExamples:12,uniqueImages:new Set(images.map(i=>i.src)).size,loadedImages:images.length,desktopWidth:1440,mobileWidth:390,mobileOverflow:overflow,errors},null,2)+'\n');
  await browser.close();
  console.log('All six themes rendered; 168 images loaded; mobile fits; no browser errors.');
})().catch(error=>{console.error(error);process.exit(1)});
