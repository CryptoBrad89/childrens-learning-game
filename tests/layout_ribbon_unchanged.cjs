'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/usr/local/lib/pnpm/5/.pnpm/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const before=execFileSync('git',['show','ea2d8a5:v1-letter-post/app.js'],{cwd:root,encoding:'utf8'}).replaceAll('${draw(l.word)}', '${wordPicture(l.word)}').replaceAll('${draw(current.word)}', '${wordPicture(current.word)}');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/google-chrome',args:['--no-sandbox']});
  const results=[];
  try {
    for(const [width,height] of [[390,844],[1180,900],[1920,1080]]) {
      const signatures=[];
      for(const baseline of [true,false]) {
        const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
        await context.route(/^https?:/,route=>route.abort());
        if(baseline) await context.route('**/v1-letter-post/app.js',route=>route.fulfill({body:before,contentType:'application/javascript'}));
        await context.addInitScript(()=>{Math.random=()=>.37});
        const page=await context.newPage();
        await page.goto(pathToFileURL(path.join(root,'v4-silk-thread/index.html')).href);
        const screen=name=>page.waitForFunction(name=>document.body.dataset.screen===name,name);
        const settle=()=>page.waitForFunction(()=>!document.body.dataset.effect&&!document.body.classList.contains('talking'));
        const shots={};
        async function capture(name) {
          await page.evaluate(()=>document.fonts.ready);
          await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
          await page.mouse.move(0,0);
          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
          const pixels=await page.screenshot({fullPage:true});
          fs.writeFileSync(`/tmp/layout-ribbon-${width}-${baseline?'before':'after'}-${name}.png`,pixels);
          const rendered=await page.evaluate(()=>({html:document.querySelector('.app').outerHTML,styles:[...document.querySelectorAll('.app *')].map(node=>{
            const rect=node.getBoundingClientRect(),style=getComputedStyle(node);
            return [rect.x,rect.y,rect.width,rect.height,style.color,style.backgroundColor,style.fontFamily,style.fontSize,style.fontWeight];
          }),select:(()=>{const rect=document.querySelector('.controls').getBoundingClientRect();return [Math.floor(rect.left),Math.floor(rect.top),Math.ceil(rect.right),Math.ceil(rect.bottom)]})()}));
          shots[name]={hash:crypto.createHash('sha256').update(pixels).digest('hex'),...rendered};
        }
        await screen('home');await page.locator('#mute').click();await settle();await capture('home');
        assert.equal(await page.locator('[data-letter]').count(),26);
        await page.locator('[data-letter=B]').click();await screen('listen');await settle();await capture('listen');
        await page.locator('[data-action=match]').click();await screen('match');await settle();await capture('match');
        await page.locator('[data-answer=B]').click();await screen('celebrate');await settle();await capture('reward');
        await page.keyboard.press('Escape');await screen('home');await settle();await capture('completedHome');
        assert.equal(await page.locator('.visited').count(),1);
        signatures.push(shots);
        await context.close();
      }
      const screens={};
      for(const name of Object.keys(signatures[0])) {
        const a=signatures[0][name],b=signatures[1][name];
        assert.equal(b.html,a.html,`${name}: Ribbon Road markup changed`);
        assert.deepEqual(b.styles,a.styles,`${name}: Ribbon Road geometry or styles changed`);
        let controlRasterRounding=null;
        if(a.hash!==b.hash) {
          // Chrome's header-control rasterization can vary by one RGB level.
          const check=JSON.parse(execFileSync('python3',['-c',
            'import json,sys;from PIL import Image,ImageChops;a=Image.open(sys.argv[1]).convert("RGB");b=Image.open(sys.argv[2]).convert("RGB");assert a.size==b.size;d=ImageChops.difference(a,b);print(json.dumps({"bbox":d.getbbox(),"maxChannelDifference":max(pair[1] for pair in d.getextrema())}))',
            `/tmp/layout-ribbon-${width}-before-${name}.png`,`/tmp/layout-ribbon-${width}-after-${name}.png`],{encoding:'utf8'}));
          const [left,top,right,bottom]=b.select,box=check.bbox;
          assert(check.maxChannelDifference<=1&&box[0]>=left&&box[1]>=top&&box[2]<=right&&box[3]<=bottom,`${name}: rendered pixels changed beyond header-control rounding`);
          controlRasterRounding=check;
        }
        screens[name]={beforeHash:a.hash,afterHash:b.hash,pixelIdentical:a.hash===b.hash,controlRasterRounding};
      }
      results.push({width,height,baseline:'ea2d8a5',screens,markupStylesAndGeometryIdentical:true});
      console.log(`PASS Ribbon Road ${width}x${height}: five screens unchanged, allowing one-level header-control raster rounding`);
    }
    fs.mkdirSync(path.join(root,'reports/layout-build'),{recursive:true});
    fs.writeFileSync(path.join(root,'reports/layout-build/ribbon-unchanged.json'),JSON.stringify(results,null,2)+'\n');
  } finally {await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
