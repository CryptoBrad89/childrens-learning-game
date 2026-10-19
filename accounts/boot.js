/* Runs before the games read settings. On a served page it projects the
 * signed-in learner into the key the games already use. file:// keeps the
 * original per-browser settings so the local checks stay intact.
 */
(function () {
  'use strict';
  if (location.protocol === 'file:') return;
  const Store = window.LittleWoofStore;
  const Merge = window.LittleWoofMerge;
  const Client = window.LittleWoofClient;
  if (!Store || !Merge || !Client || !Client.configured()) return;

  const grownPage = /\/grown-ups\//.test(location.pathname);
  function settingsChild() {
    try { return sessionStorage.getItem('lw-settings-child') || ''; } catch (error) { return ''; }
  }
  function active() { return Store.readActive(); }

  function guestVisit() {
    try { return sessionStorage.getItem('lw-guest') === '1'; } catch (error) { return false; }
  }

  if (guestVisit()) {
    Store.clearActive();
    Client.setLearner(null);
  } else if (grownPage) {
    const child = settingsChild();
    if (child) Store.project(Store.readState(child));
    else Store.clearProjection();
  } else if (Store.authPresent() && active()) {
    Store.project(Store.readState(active().learnerId));
    Client.setLearner(active().learnerId);
  } else {
    Store.clearActive();
    Store.clearProjection();
    document.documentElement.dataset.account = 'locked';
  }

  function paintKept() {
    const el = document.getElementById('kept');
    const stars = document.getElementById('stars');
    const person = active();
    if (!el || !person) return;
    const state = Store.readState(person.learnerId);
    const list = [...Merge.distinctLetters(state)].sort();
    el.hidden = false;
    el.dataset.letters = list.join(' ');
    el.textContent = list.length ? `Sounds kept: ${list.join(' ')}` : 'Sounds kept: none yet';
    if (stars) {
      const names = Object.keys(state.achievements).sort();
      stars.hidden = names.length === 0;
      stars.dataset.stars = names.join(' ');
      stars.textContent = names.length ? `Stars: ${names.map(name => name.replaceAll('-', ' ')).join(', ')}` : '';
    }
  }

  window.LittleWoof = {
    learnerName() { return active() ? active().displayName : ''; },
    letters(world) { return active() ? Merge.lettersOf(Store.readState(active().learnerId), world) : []; },
    earn(world, letter) {
      const person = active();
      if (!person) return;
      Client.earn(person.learnerId, world, letter);
      paintKept();
    },
    theme(world, value) {
      const person = active();
      if (!person) return;
      Client.noteTheme(person.learnerId, world, value);
    },
    sync: () => Client.syncNow(),
    paint: paintKept
  };

  document.addEventListener('little-woof-progress', () => {
    if (!grownPage && active()) {
      Store.project(Store.readState(active().learnerId));
      if (window.GROWN_UPS && window.GROWN_UPS.reload) window.GROWN_UPS.reload();
      document.dispatchEvent(new CustomEvent('little-woof-applied'));
    }
    paintKept();
  });

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('kept') && document.getElementById('footer')) {
      const kept = document.createElement('p');
      kept.id = 'kept';
      kept.hidden = true;
      const stars = document.createElement('p');
      stars.id = 'stars';
      stars.hidden = true;
      document.getElementById('footer').prepend(stars);
      document.getElementById('footer').prepend(kept);
    }
    if (document.getElementById('login') && window.LittleWoofHome) window.LittleWoofHome.start();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    paintKept();
    const beat = () => { if (navigator.onLine) Client.syncNow().catch(() => {}); };
    beat();
    setInterval(beat, 4000);
    window.addEventListener('online', beat);
  });
})();
