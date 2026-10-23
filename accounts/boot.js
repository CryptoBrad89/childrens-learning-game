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

  function startSessionGuard() {
    const Session = window.LittleWoofSession;
    if (!Session) return;
    let startedAt = 0;
    let lastActiveAt = 0;
    let known = false;
    let dirty = false;
    let touched = 0;
    let leaving = false;
    const remember = row => {
      if (!row) return;
      if (row.started_at) { startedAt = Date.parse(row.started_at) || startedAt; known = true; }
      if (row.last_active_at) { lastActiveAt = Date.parse(row.last_active_at) || lastActiveAt; known = true; }
    };
    const leave = async () => {
      if (leaving) return;
      leaving = true;
      try { await Client.syncNow(); } catch (error) { /* the queued copy stays */ }
      try { await Client.signOut(); } catch (error) { /* already signed out */ }
      try { sessionStorage.setItem('lw-safety', '1'); } catch (error) { /* private window */ }
      Store.clearActive();
      Store.clearProjection();
      location.href = grownPage ? 'index.html' : '/index.html';
    };
    const check = async () => {
      let user = null;
      try { user = await Client.sessionUser(); } catch (error) { user = null; }
      if (!user) return;
      const role = Client.roleOf(user);
      if (known) {
        const decision = Session.assess({role, startedAt, lastActiveAt, now: Date.now()});
        if (!decision.ok) { await leave(); return; }
      }
      if (!dirty || Date.now() - touched < 60000) return;
      dirty = false;
      touched = Date.now();
      const row = await Client.touchActivity();
      remember(row);
      if (row && row.ok === false && row.reason === 'safety') await leave();
    };
    const mark = () => {
      lastActiveAt = Date.now();
      dirty = true;
      if (!known) { startedAt = lastActiveAt; known = true; }
      check().catch(() => {});
    };
    ['pointerdown', 'keydown'].forEach(type => window.addEventListener(type, mark));
    if (Client.peekSession) {
      Client.peekSession().then(async row => {
        remember(row);
        if (row && row.ok === false && row.reason === 'safety') await leave();
      }).catch(() => {});
    }
    setInterval(() => { check().catch(() => {}); }, 15000);
  }

  window.LittleWoof = {
    learnerName() { return active() ? active().displayName : ''; },
    letters(world) { return active() ? Merge.lettersOf(Store.readState(active().learnerId), world) : []; },
    doneLetters() {
      const person = active();
      if (!person) return [];
      const state = Store.readState(person.learnerId);
      const found = new Set();
      for (const world of Merge.WORLDS) {
        for (const letter of Merge.lettersOf(state, world)) found.add(letter);
      }
      return [...found].sort();
    },
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
    if ('serviceWorker' in navigator) {
      let reloading = false;
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (reloading) return;
          reloading = true;
          location.reload();
        });
      }
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    paintKept();
    const beat = () => { if (navigator.onLine) Client.syncNow().catch(() => {}); };
    beat();
    setInterval(beat, 4000);
    window.addEventListener('online', beat);
    startSessionGuard();
  });
})();
