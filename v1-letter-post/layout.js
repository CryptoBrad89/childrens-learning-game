'use strict';
window.createLetterLayout = ({pool, visited, post, main, ico, grown, saved=()=>false}) => {
  document.body.classList.add('layout-built');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let page = 0, albumOpen = false, pendingCompletion = null;
  const pages = Math.ceil(pool.length / 6);
  const badge = () => '<span class="done-badge" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m5 12 4.5 4.5L19 7" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
  const cards = () => pool.slice(page * 6, page * 6 + 6).map((letter, index) => `<button data-letter="${letter.letter}" aria-label="Play letter ${letter.letter}${visited.has(letter.letter) ? saved() ? ', completed' : ', completed this visit' : ''}" style="--i:${index};--tilt:${[-3,2,-2,2,-2,3][index]}deg"><span class="letter-decoration" aria-hidden="true"></span><span class="pick-glyph">${letter.letter}<small>${letter.letter.toLowerCase()}</small></span><span class="pick-caption">${visited.has(letter.letter) ? 'Done' : post ? 'OPEN ME' : 'explore'}</span>${visited.has(letter.letter) ? badge() : ''}</button>`).join('');
  const range = () => `${pool[page * 6].letter}–${pool[Math.min(pool.length - 1, page * 6 + 5)].letter}`;
  function pickers(type) {
    return `<div class="picker-shelf ${type}-shelf" role="region" aria-label="Choose a letter"><div class="letter-list ${type}" aria-label="Choose a letter">${cards()}</div></div><nav class="pager" aria-label="Letter pages"><button data-action="letters-previous" aria-label="Previous six letters"${page === 0 ? ' disabled' : ''}>${ico('back')}</button><div><strong class="page-range" aria-live="polite">${range()}</strong><span class="page-number">Page ${page + 1} of ${pages}</span></div><button data-action="letters-next" aria-label="Next six letters"${page === pages - 1 ? ' disabled' : ''}>${ico('arrow')}</button></nav>`;
  }
  function collection() {
    return `<details class="collection-preview"${albumOpen ? ' open' : ''}><summary><span class="collection-symbol">${ico(post ? 'paw' : 'star')}</span><span class="collection-heading"><strong>${post ? 'Your stamp album' : 'Your constellation'}</strong><small>${pool.filter(letter=>visited.has(letter.letter)).length} of ${pool.length} collected · ${saved()?'saved progress':'this visit'}</small></span><span class="collection-toggle"><span class="when-closed">Open</span><span class="when-open">Close</span><span class="chevron">⌄</span></span></summary><div class="album-content"><p>${post ? 'A stamp for each sound you deliver.' : 'A star for each sound you explore.'} Your whole alphabet, together.</p><div class="collection-slots album-grid">${pool.map(letter => `<div class="collection-slot album-slot ${visited.has(letter.letter) ? 'collected' : ''}" data-collection-letter="${letter.letter}" aria-label="${letter.letter}, ${visited.has(letter.letter) ? saved() ? 'completed' : 'completed this visit' : 'ready to explore'}">${visited.has(letter.letter) ? badge() : `<span>${ico('star')}</span>`}<b>${letter.letter}</b><small>${visited.has(letter.letter) ? 'Done' : 'Ready'}</small></div>`).join('')}</div><p class="album-note">${post ? 'Your sound deliveries.' : 'Your little sound discoveries.'} ${saved()?'Saved across all games.':'Yours for this visit.'}</p></div></details>`;
  }
  function home(pic) {
    const intro = post
      ? `<div class="post-intro"><p class="eyebrow"><span class="tiny-star">✳</span> A special delivery of sounds</p><h1>Lucy’s<br>Letter <em>Post.</em></h1><p class="lead">Little letters.<br>Very big adventures.</p><div class="route-card"><span>YOUR LITTLE MISSION</span><p>${ico('sound')} Listen <b>→</b> ${ico('star')} Find <b>→</b> ${ico('check')} Deliver</p></div></div>`
      : `<div class="captain-panel"><p class="eyebrow">Small steps. Cosmic discoveries.</p><h1>Lucy’s<br><em>Moonboat</em></h1><p class="lead">A whole sky of little sounds.</p><div class="captain">${pic('default','Ready, little explorer?')}<span class="captain-label">CAPTAIN LUCY · READY TO GO</span></div></div>`;
    const panel = post
      ? `<div class="post-office"><div class="office-top">${pic('default','A letter for you!')}<span class="office-number" aria-hidden="true">№ 01<br>✳</span></div><div class="sorting-shelf"><div class="shelf-title"><span>Pick a letter to open</span>${ico('back')}</div>${pickers('envelopes')}</div></div>`
      : `<div class="star-map"><div class="map-heading"><span>THE SOUND CONSTELLATION</span><span class="map-mark">✦</span><span>${pool.length} LITTLE ${pool.length === 1 ? 'WORLD' : 'WORLDS'}</span></div><div class="map-orbit" aria-hidden="true"></div><div class="map-orbit second" aria-hidden="true"></div><div class="map-caption">Tap a world. Find its sound.</div>${pickers('planets')}</div>`;
    return `<section class="screen home"><div class="home-layout ${post ? 'post-home' : 'space-home'}">${intro}${panel}</div>${collection()}</section>`;
  }
  function renderPage() {
    main.querySelector('.letter-list').innerHTML = cards();
    main.querySelector('.page-range').textContent = range();
    main.querySelector('.page-number').textContent = `Page ${page + 1} of ${pages}`;
    main.querySelector('[data-action=letters-previous]').disabled = page === 0;
    main.querySelector('[data-action=letters-next]').disabled = page === pages - 1;
  }
  function cancelSettles() {
    document.getAnimations().filter(animation => animation.effect?.target.matches('.done-badge')).forEach(animation => animation.cancel());
  }
  reduced.addEventListener('change', event => { if (event.matches) cancelSettles(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelSettles(); });
  main.addEventListener('toggle', event => {
    if (event.target.matches('.collection-preview') && main.contains(event.target)) albumOpen = event.target.open;
  }, true);
  return {
    home, pickers, collection,
    refresh() {
      const focused=main.querySelector('.letter-list :focus')?.dataset.letter;
      const summaryFocused=document.activeElement===main.querySelector('.collection-preview summary');
      if(main.querySelector('.letter-list'))renderPage();
      const album=main.querySelector('.collection-preview');
      if(album){albumOpen=album.open;album.outerHTML=collection();}
      if(focused)main.querySelector(`[data-letter="${focused}"]`)?.focus({preventScroll:true});
      else if(summaryFocused)main.querySelector('.collection-preview summary')?.focus({preventScroll:true});
    },
    select(letter) { page = Math.floor(pool.findIndex(item => item.letter === letter) / 6); },
    complete(letter) { pendingCompletion = letter; },
    enter(screen) {
      cancelSettles();
      if (screen !== 'home' || !pendingCompletion) return;
      const letter = pendingCompletion;
      pendingCompletion = null;
      if (grown.calm || reduced.matches || document.hidden) return;
      main.querySelectorAll(`[data-letter="${letter}"] .done-badge,.collection-preview[open] [data-collection-letter="${letter}"] .done-badge`).forEach(node => {
        node.animate([{transform:'scale(.85)'},{transform:'scale(1.08)',offset:.65},{transform:'scale(1)'}], {duration:220,easing:'ease-out'});
      });
    },
    click(button) {
      if (!['letters-previous','letters-next'].includes(button.dataset.action)) return false;
      page += button.dataset.action === 'letters-next' ? 1 : -1;
      renderPage();
      // The end-page button becomes disabled, so keep keyboard focus in the pager.
      if (button.disabled) main.querySelector(`[data-action=letters-${page === 0 ? 'next' : 'previous'}]`).focus({preventScroll:true});
      return true;
    },
    keydown(event) {
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key) || !event.target.closest('.letter-list')) return false;
      event.preventDefault();
      const index = pool.findIndex(letter => letter.letter === event.target.dataset.letter);
      const next = (index + (['ArrowLeft','ArrowUp'].includes(event.key) ? -1 : 1) + pool.length) % pool.length;
      if (page !== Math.floor(next / 6)) { page = Math.floor(next / 6); renderPage(); }
      main.querySelector(`[data-letter="${pool[next].letter}"]`).focus({preventScroll:true});
      return true;
    }
  };
};
