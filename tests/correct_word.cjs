'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {staticServer, playwright} = require('./accounts_sync.cjs');

const out = 'reports/correct-word';
const layouts = ['v1-letter-post', 'v3-moonboat', 'v4-silk-thread'];
const sizes = [{width:1024,height:576}, {width:768,height:1024}, {width:1920,height:1080}];
fs.mkdirSync(out, {recursive:true});

(async () => {
  const local = await staticServer();
  const browser = await playwright().chromium.launch({executablePath:'/usr/bin/google-chrome', args:['--no-sandbox','--disable-dev-shm-usage']});
  const results = process.argv.includes('--resume') ? JSON.parse(fs.readFileSync(`${out}/timings.json`, 'utf8')) : [];
  try {
    for (const viewport of sizes) for (const layout of layouts) for (let run=0; run<5; run++) {
      if (results.some(e => e.layout===layout && e.viewport.width===viewport.width && e.run===run)) continue;
      const letter = run%2 ? 'H' : 'A', word = letter==='H' ? 'hat' : 'apple';
      const context = await browser.newContext({viewport, serviceWorkers:'block', reducedMotion:'no-preference'});
      let blocked = 0;
      await context.route('**/*', route => {
        if (!route.request().url().startsWith(local.url+'/')) { blocked++; return route.abort(); }
        return route.continue();
      });
      await context.addInitScript(() => {
        window.correctEvidence = {clips:[], tap:null, motion:[]};
        document.addEventListener('click', e => {
          if (e.target.closest('[data-answer]')) window.correctEvidence.tap = performance.now();
        }, true);
        const play = HTMLMediaElement.prototype.play, animate = Element.prototype.animate;
        HTMLMediaElement.prototype.play = function () {
          const entry = {src:this.src, requested:performance.now()};
          window.correctEvidence.clips.push(entry);
          this.addEventListener('playing', () => entry.started=performance.now(), {once:true});
          this.addEventListener('ended', () => entry.ended=performance.now(), {once:true});
          this.addEventListener('error', () => entry.error=this.error?.message, {once:true});
          return play.call(this).catch(e => {entry.error=e.message; throw e;});
        };
        Element.prototype.animate = function (frames, options) {
          window.correctEvidence.motion.push({at:performance.now(), duration:options.duration});
          return animate.call(this, frames, options);
        };
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(local.url+'/');
      await page.locator('#play-unsaved').click();
      await page.goto(`${local.url}/${layout}/`);
      await page.waitForFunction(() => document.body.dataset.screen==='home');
      if (letter==='H' && await page.locator('[data-action=letters-next]').count()) await page.locator('[data-action=letters-next]').click();
      await page.locator(`[data-letter="${letter}"]`).click();
      await page.waitForFunction(() => document.body.dataset.screen==='listen' && !document.body.classList.contains('talking') && !document.body.dataset.effect);
      await page.locator('[data-action=match]').click();
      await page.waitForFunction(() => document.body.dataset.screen==='match' && !document.body.dataset.effect);
      await page.evaluate(() => {correctEvidence.clips=[]; correctEvidence.motion=[];});
      await page.locator(`[data-answer="${letter}"]`).click();
      try {
        await page.waitForFunction(() => correctEvidence.clips.some(e => e.src.includes('lucy-cheer') && e.ended));
      } catch (error) {
        fs.writeFileSync(`${out}/failed-playback.json`, JSON.stringify({layout,viewport,run,errors,...await page.evaluate(() => ({...correctEvidence,hidden:document.hidden,screen:document.body.dataset.screen}))},null,2)+'\n');
        throw error;
      }
      const evidence = await page.evaluate(() => correctEvidence);
      const [spoken, cheer] = evidence.clips;
      assert.equal(evidence.clips.length, 2, 'Exactly the tapped word and one cheer');
      assert(spoken.src.endsWith(`-${word}.mp3`));
      assert(cheer.src.includes('lucy-cheer'));
      assert(spoken.started && spoken.ended && cheer.started && cheer.ended, 'Both real MP3s play fully');
      const wordDelay = spoken.started-evidence.tap, cheerGap = cheer.started-spoken.ended;
      assert(wordDelay>=0 && wordDelay<300, `Immediate word: ${wordDelay} ms`);
      assert(cheerGap>=0 && cheerGap<300, `Natural cheer gap: ${cheerGap} ms`);
      assert(evidence.clips.every(e => !e.error));
      assert.deepEqual(errors, []);
      await page.waitForFunction(() => document.body.dataset.screen==='celebrate' && !document.body.dataset.effect);
      if (run===0) await page.screenshot({path:`${out}/correct-${layout}-${viewport.width}.png`,fullPage:true});
      results.push({layout,viewport,run,letter,word,wordDelay,cheerGap,externalBlocked:blocked,errors,...evidence});
      console.log(`PASS ${layout} ${viewport.width} run ${run+1} ${word}: word ${wordDelay.toFixed(1)} ms; cheer gap ${cheerGap.toFixed(1)} ms`);
      await context.close();
    }
  } finally {
    fs.writeFileSync(`${out}/timings.json`, JSON.stringify(results,null,2)+'\n');
    await browser.close();
    local.server.close();
  }
})().catch(e => {console.error(e); process.exitCode=1;});
