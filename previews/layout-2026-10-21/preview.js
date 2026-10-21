(() => {
  'use strict';
  const post = document.body.dataset.world === 'post';
  const alphabet = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
  const collected = new Set(['A', 'B', 'C', 'D']);
  const art = post ? 'v1-letter-post' : 'v3-moonboat';
  let page = 0;
  const portrait = line => `<figure class="lucy"><div class="speech">${line}</div><div class="lucy-portrait"><img src="../../${art}/assets/lucy-default.jpg" alt="Lucy the golden retriever"><span class="lucy-paw">${ico('paw')}</span></div><figcaption>${ico('paw')} LUCY</figcaption></figure>`;
  const themes = post ? ['Air mail', 'Candy post', 'Dark'] : ['Dark', 'Cloud day', 'Plum dusk'];
  document.querySelector('#header').innerHTML = `<a class="brand" href="${post ? 'letter-post' : 'moonboat'}.html"><span class="brand-mark">${ico(post ? 'paw' : 'star')}</span><span>Letters with Lucy<small>Little Sounds Big Discovery</small></span></a><div class="controls"><span class="preview-label">Layout preview</span><div class="theme-control"><label for="theme" aria-label="Color theme">${ico('palette')}</label><select id="theme" aria-label="Color theme">${themes.map((theme, index) => `<option value="${index}">${theme}</option>`).join('')}</select></div></div>`;
  document.querySelector('#theme').addEventListener('change', event => {
    document.body.dataset.theme = event.target.value;
  });
  const intro = post
    ? `<div class="post-intro"><p class="eyebrow"><span class="tiny-star">✳</span> A special delivery of sounds</p><h1>Lucy’s<br>Letter <em>Post.</em></h1><p class="lead">Little letters.<br>Very big adventures.</p><div class="route-card"><span>YOUR LITTLE MISSION</span><p>${ico('sound')} Listen <b>→</b> ${ico('star')} Find <b>→</b> ${ico('check')} Deliver</p></div></div>`
    : `<div class="captain-panel"><p class="eyebrow">Small steps. Cosmic discoveries.</p><h1>Lucy’s<br><em>Moonboat</em></h1><p class="lead">A whole sky of little sounds.</p><div class="captain">${portrait('Ready, little explorer?')}<span class="captain-label">CAPTAIN LUCY · READY TO GO</span></div></div>`;
  const picker = `<div class="picker-shelf"><div id="letters" class="letter-list ${post ? 'envelopes' : 'planets'}" role="group" aria-label="Choose a letter"></div></div><nav class="pager" aria-label="Letter pages"><button id="previous" aria-label="Previous six letters">${ico('back')}</button><div><strong id="range" aria-live="polite"></strong><span id="page-number"></span></div><button id="next" aria-label="Next six letters">${ico('arrow')}</button></nav>`;
  const panel = post
    ? `<div class="post-office"><div class="office-top"><div class="open-sign">OPEN FOR<br><strong>PLAY!</strong></div>${portrait('A letter for you!')}<span class="office-number">№ 01<br>✳</span></div><div class="sorting-shelf"><div class="shelf-title"><span>Pick a letter to open</span>${ico('back')}</div>${picker}</div></div>`
    : `<div class="star-map"><div class="map-heading"><span>THE SOUND CONSTELLATION</span><span class="map-mark">✦</span><span>26 LITTLE WORLDS</span></div><div class="map-orbit" aria-hidden="true"></div><div class="map-orbit second" aria-hidden="true"></div><div class="map-caption">Tap a world. Find its sound.</div>${picker}</div>`;
  document.querySelector('#main').innerHTML = `<section class="preview-home ${post ? 'post-home' : 'space-home'}">${intro}${panel}</section><details class="collection-preview"><summary><span class="collection-symbol">${ico(post ? 'paw' : 'star')}</span><span><strong>${post ? 'Your stamp album' : 'Your constellation'}</strong><small>4 of 26 collected · example progress</small></span><span class="collection-toggle"><span class="when-closed">Open</span><span class="when-open">Close</span><span class="chevron">⌄</span></span></summary><div class="album-content"><p>${post ? 'A stamp for each sound you deliver.' : 'A star for each sound you explore.'} Your whole alphabet, together.</p><div class="album-grid">${alphabet.map(letter => `<div class="album-slot ${collected.has(letter) ? 'collected' : ''}" aria-label="${letter}, ${collected.has(letter) ? 'collected' : 'ready to explore'}"><span>${ico(collected.has(letter) ? (post ? 'paw' : 'star') : 'star')}</span><b>${letter}</b><small>${collected.has(letter) ? 'Collected' : 'Ready'}</small></div>`).join('')}</div><p class="album-note">Example collection for this preview. Opening and closing it keeps your place in the letters.</p></div></details>`;
  function renderPage() {
    const letters = alphabet.slice(page * 6, page * 6 + 6);
    document.querySelector('#letters').innerHTML = letters.map((letter, index) => `<button data-letter="${letter}" aria-label="Preview letter ${letter}" style="--tilt:${[-3, 2, -2, 2, -2, 3][index]}deg"><span class="letter-decoration" aria-hidden="true"></span><span class="pick-glyph">${letter}<small>${letter.toLowerCase()}</small></span><span class="pick-caption">${post ? 'OPEN ME' : 'explore'}</span>${collected.has(letter) ? `<span class="visited" aria-label="collected">${ico('check')}</span>` : ''}</button>`).join('');
    document.querySelector('#range').textContent = `${letters[0]}–${letters.at(-1)}`;
    document.querySelector('#page-number').textContent = `Page ${page + 1} of 5`;
    document.querySelector('#previous').disabled = page === 0;
    document.querySelector('#next').disabled = page === 4;
  }
  document.querySelector('#previous').addEventListener('click', () => { page--; renderPage(); });
  document.querySelector('#next').addEventListener('click', () => { page++; renderPage(); });
  document.querySelector('#letters').addEventListener('click', event => {
    const button = event.target.closest('[data-letter]');
    if (!button) return;
    document.querySelectorAll('[data-letter]').forEach(letter => letter.removeAttribute('aria-pressed'));
    button.setAttribute('aria-pressed', 'true');
    document.querySelector('#announcer').textContent = `Letter ${button.dataset.letter} selected. This preview demonstrates the layout only.`;
  });
  renderPage();
})();
