'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/usr/local/lib/pnpm/5/.pnpm/node_modules/playwright');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'reports/layout-build');
const sizes = [[1024,576],[1280,720],[1366,768],[1440,900],[768,1024],[1920,1080]];
const results = [];
let browser;
async function open(game, width, height, {reduced=true, calm=false, letters=null} = {}) {
  const context = await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference'});
  const errors = [], external = [];
  await context.route(/^https?:/, route => {external.push(route.request().url()); return route.abort();});
  if (calm || letters) await context.addInitScript(({calm,letters}) => {
    localStorage.setItem('little-woof-grown-ups', JSON.stringify({calm,...(letters?{letters}:{})}));
  }, {calm,letters});
  await context.addInitScript(() => {
    window.badgeAnimations = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function(...args) {
      const animation = animate.apply(this,args);
      if (this.matches('.done-badge')) window.badgeAnimations.push({animation,duration:animation.effect.getTiming().duration,frames:animation.effect.getKeyframes()});
      return animation;
    };
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const screen = name => page.waitForFunction(name => document.body.dataset.screen === name, name);
  const settled = () => page.waitForFunction(() => !document.body.dataset.effect && !document.body.classList.contains('talking'));
  await page.goto(pathToFileURL(path.join(root,game,'index.html')).href);
  await screen('home');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  await settled();
  await page.locator('#mute').click();
  return {context,page,screen,settled,errors,external};
}
async function bounds(page) {
  const measurements = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('.home h1,[data-letter],.pager,.collection-preview summary,#header,#footer')].map(node => {
      const box = node.getBoundingClientRect();
      return {element:node.className||node.id,top:box.top,bottom:box.bottom,left:box.left,right:box.right};
    });
    return {width:innerWidth,height:innerHeight,pageHeight:document.documentElement.scrollHeight,pageWidth:document.documentElement.scrollWidth,boxes};
  });
  assert(measurements.pageHeight <= measurements.height && measurements.pageWidth <= measurements.width, 'Collapsed home scrolls');
  for (const box of measurements.boxes) assert(box.top >= -1 && box.bottom <= measurements.height+1 && box.left >= -1 && box.right <= measurements.width+1, `Outside viewport: ${JSON.stringify(box)}`);
  return measurements;
}
async function answerRound(session, letter, correct) {
  const {page,screen,settled} = session;
  await page.locator(`[data-letter=${letter}]`).click();
  await screen('listen'); await settled();
  await page.locator('[data-action=match]').click();
  await screen('match'); await settled();
  await page.locator(correct ? `[data-answer=${letter}]` : `.choice:not([data-answer=${letter}])`).first().click();
  if (correct) await screen('celebrate');
  else await page.waitForFunction(() => !document.querySelector('.choice[aria-disabled=true]'));
}
async function home(session) {
  await session.page.keyboard.press('Escape');
  await session.screen('home');
}
async function checkBadges(page, size) {
  const badges = await page.locator('[data-letter] .done-badge').evaluateAll(nodes => nodes.map(node => {
    const style=getComputedStyle(node), box=node.getBoundingClientRect(), glyph=node.closest('button').querySelector('.pick-glyph').getBoundingClientRect();
    const map=node.closest('.star-map')?.getBoundingClientRect();
    return {size:parseFloat(style.width),color:style.backgroundColor,rim:style.borderTopColor,opacity:style.opacity,clear:box.right<=glyph.left||box.left>=glyph.right||box.bottom<=glyph.top||box.top>=glyph.bottom,inMap:!map||box.left>=map.left&&box.right<=map.right&&box.top>=map.top&&box.bottom<=map.bottom};
  }));
  assert.equal(badges.length,1);
  for (const badge of badges) {
    assert.equal(badge.size,size); assert.equal(badge.color,'rgb(23, 107, 58)'); assert.equal(badge.rim,'rgb(255, 255, 255)');
    assert.equal(badge.opacity,'1'); assert(badge.clear&&badge.inMap,'Badge covers a glyph or is clipped by the map');
  }
}
(async () => {
  fs.mkdirSync(output,{recursive:true});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/google-chrome',args:['--no-sandbox']});
  try {
    for (const game of ['v1-letter-post','v3-moonboat']) for (const [width,height] of sizes) {
      const session=await open(game,width,height), {page}=session;
      for (let theme=0;theme<3;theme++) {
        await page.selectOption('#theme',String(theme));
        assert.equal(await page.locator('[data-letter]').count(),6);
        assert.equal(await page.locator('.done-badge').count(),0);
        assert.equal(await page.getByText(/simulate correct answer/i).count(),0);
        const measured=await bounds(page), seen=[];
        const prefix=`${game}-${width}x${height}-theme${theme}`;
        const capture=[1024,768,1920].includes(width);
        if(capture) await page.screenshot({path:path.join(output,prefix+'-home.png')});
        const pagerY=await page.locator('.pager').evaluate(node=>node.getBoundingClientRect().top);
        for (let index=0;index<5;index++) {
          seen.push(...await page.locator('[data-letter]').evaluateAll(nodes=>nodes.map(node=>node.dataset.letter)));
          assert(Math.abs(await page.locator('.pager').evaluate(node=>node.getBoundingClientRect().top)-pagerY)<1);
          if(index<4) await page.locator('[data-action=letters-next]').click();
        }
        assert.deepEqual(seen,[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']);
        await page.locator('[data-letter=Z]').focus(); await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator(':focus').getAttribute('data-letter'),'A');
        await page.locator('[data-letter=A]').click(); await session.screen('listen'); await session.settled();
        await home(session);
        assert.equal(await page.locator('.done-badge').count(),0,'Opening alone must not complete a letter');
        await answerRound(session,'A',false); await home(session);
        assert.equal(await page.locator('.done-badge').count(),0,'A wrong answer must not complete a letter');
        await answerRound(session,'A',true); await home(session);
        await checkBadges(page,width===1920?44:game==='v3-moonboat'&&width===1024?32:36);
        assert.equal(await page.locator('[data-letter=A] .pick-caption').innerText(),'Done');
        assert(await page.locator('[data-letter=A]').isEnabled());
        assert.match(await page.locator('.collection-heading').innerText(),/1 of 26/);
        assert.equal(await page.evaluate(()=>badgeAnimations.length),0,'Reduced motion must be static');
        await bounds(page);
        if(capture) await page.screenshot({path:path.join(output,prefix+'-done.png')});
        await page.locator('summary').focus(); await page.keyboard.press('Enter');
        assert(await page.locator('.collection-preview').evaluate(node=>node.open));
        assert.equal(await page.locator('[data-collection-letter]').count(),26);
        assert.equal(await page.locator('[data-collection-letter=A] .done-badge').count(),1);
        assert(await page.locator('.album-grid').evaluate(node=>node.scrollWidth<=node.clientWidth));
        if(capture) await page.screenshot({path:path.join(output,prefix+'-album.png'),fullPage:true});
        await page.locator('summary').click();
        results.push({game,width,height,theme,collapsed:measured,correctOnly:true,paging:'A–Z',badges:'matched preview'});
        // Reload clears only this isolated browser context's visit, as before.
        await page.reload(); await session.screen('home'); await session.settled();
        await page.locator('#mute').click();
      }
      assert.deepEqual(session.errors,[]);assert.deepEqual(session.external,[]);
      await session.context.close();
      console.log(`PASS ${game} ${width}x${height}: all themes, fit, pages, correct-only badges, album`);
    }
    for(const game of ['v1-letter-post','v3-moonboat']) {
      for(const mode of ['motion','calm','reduced']) {
        const session=await open(game,1024,576,{reduced:mode==='reduced',calm:mode==='calm'}),{page}=session;
        await answerRound(session,'B',true); await home(session);
        if(mode==='motion') {
          assert.equal(await page.evaluate(()=>badgeAnimations.length),1);
          const timing=await page.evaluate(()=>({duration:badgeAnimations[0].duration,frames:badgeAnimations[0].frames.map(frame=>frame.transform)}));
          assert.equal(timing.duration,220); assert.deepEqual(timing.frames,['scale(0.85)','scale(1.08)','scale(1)']);
          await page.evaluate(()=>Promise.all(badgeAnimations.map(record=>record.animation.finished)));
          await page.locator('[data-action=letters-next]').click(); await page.locator('[data-action=letters-previous]').click();
          await answerRound(session,'B',true); await home(session);
          assert.equal(await page.evaluate(()=>badgeAnimations.length),1,'Retapping and recompleting must not replay the badge settle');
          await page.locator('summary').click();
          await answerRound(session,'C',true); await home(session);
          assert.equal(await page.evaluate(()=>badgeAnimations.length),3,'A new card badge and visible collection badge settle together');
          await page.emulateMedia({reducedMotion:'reduce'});
          await page.waitForFunction(()=>document.getAnimations().filter(animation=>animation.effect?.target.matches('.done-badge')).length===0);
        } else assert.equal(await page.evaluate(()=>badgeAnimations.length),0);
        assert.deepEqual(session.errors,[]);assert.deepEqual(session.external,[]);
        await session.context.close();
        console.log(`PASS ${game} completion motion: ${mode}`);
      }
      for(const letters of [['T'],['A','I','N','P','S','T'],['A','B','C','D','E','F','Z']]) {
        const session=await open(game,1024,576,{letters}),{page}=session;
        assert.equal(await page.locator('[data-letter]').count(),Math.min(6,letters.length));
        assert.match(await page.locator('.collection-heading').innerText(),new RegExp(`0 of ${letters.length}`));
        await bounds(page);
        await answerRound(session,letters[0],true); await home(session);
        assert.match(await page.locator('.collection-heading').innerText(),new RegExp(`1 of ${letters.length}`));
        assert.deepEqual(session.errors,[]);assert.deepEqual(session.external,[]);
        await session.context.close();
      }
      console.log(`PASS ${game} restricted pools: one, six, seven letters`);
    }
    fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(results,null,2)+'\n');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
