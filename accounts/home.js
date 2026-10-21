/* Home flow: a short still splash, then a child login, then a layout pick.
 * Splash is a placeholder. There is no video yet.
 * The splash band uses the paper-shader palette as a CSS gradient, the same
 * fallback the grown-ups page keeps under its one-shot WebGL mesh. The child
 * splash does not start a WebGL context.
 * Layout: one job per screen (superdesign).
 * Motion: Better Design panel-reveal, 16px / 400ms, no blur (repo DESIGN.md).
 * The secret field is a labelled input plus a show control (ui-layouts).
 * Reduced motion and Calm motion remove the reveal.
 * file:// never calls the network. Play without saving writes nothing.
 */
(function (root) {
  'use strict';
  const Store = () => root.LittleWoofStore;
  const Client = () => root.LittleWoofClient;
  let started = false;

  function $(id) { return document.getElementById(id); }
  function served() { return location.protocol !== 'file:'; }
  function guestVisit() {
    try { return sessionStorage.getItem('lw-guest') === '1'; } catch (error) { return false; }
  }
  function status(message, bad) {
    const el = $('login-status');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('bad', !!bad);
  }
  function reduceMotion() {
    return root.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.hasAttribute('data-calm');
  }

  function chooseDefault() {
    const links = [...document.querySelectorAll('#layouts nav a[data-world]')];
    const visible = links.filter(link => !link.hidden);
    const preferred = visible.find(link => link.dataset.world === 'silk') || visible[0] || null;
    for (const link of links) {
      const on = link === preferred;
      link.classList.toggle('is-chosen', on);
      if (on) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    const layouts = $('layouts');
    if (preferred && layouts && !layouts.hidden) preferred.focus({preventScroll: true});
  }

  function show(step) {
    document.body.dataset.home = step;
    const splash = $('splash');
    const login = $('login');
    const layouts = $('layouts');
    if (splash) splash.hidden = step !== 'splash';
    if (login) login.hidden = step !== 'login';
    if (layouts) layouts.hidden = step !== 'layouts';
    if (step === 'layouts') {
      delete document.documentElement.dataset.account;
      chooseDefault();
    } else if (step === 'login') {
      document.documentElement.dataset.account = 'locked';
      const name = $('login-name');
      if (name) name.focus();
    }
  }

  function showGuestLayouts() {
    try { sessionStorage.setItem('lw-guest', '1'); } catch (error) { /* private window */ }
    const store = Store();
    if (store) {
      store.clearActive();
      if (Client()) Client().setLearner(null);
    }
    const name = $('player-name');
    if (name) { name.hidden = true; name.textContent = ''; }
    const done = $('all-done');
    if (done) done.hidden = true;
    show('layouts');
  }

  function activate(person) {
    try { sessionStorage.removeItem('lw-guest'); } catch (error) { /* ignore */ }
    const store = Store();
    const client = Client();
    store.writeActive(person);
    client.setLearner(person.learnerId);
    store.project(store.readState(person.learnerId));
    if (root.GROWN_UPS && root.GROWN_UPS.reload) root.GROWN_UPS.reload();
    const name = $('player-name');
    name.hidden = false;
    name.textContent = `${person.displayName} is playing`;
    $('all-done').hidden = false;
    delete document.documentElement.dataset.account;
    document.dispatchEvent(new CustomEvent('little-woof-applied'));
    if (root.LittleWoof) root.LittleWoof.paint();
    show('layouts');
    client.syncNow().catch(error => status(error.message, true));
  }

  function bind() {
    $('show-secret').addEventListener('click', () => {
      const input = $('login-secret');
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      $('show-secret').textContent = showing ? 'Show' : 'Hide';
      $('show-secret').setAttribute('aria-pressed', String(!showing));
    });
    $('play-guest').addEventListener('click', showGuestLayouts);
    $('child-form').addEventListener('submit', async event => {
      event.preventDefault();
      const raw = $('login-name').value.trim();
      const asEmail = raw.includes('@');
      const loginName = asEmail ? raw : raw.toLowerCase();
      const secret = $('login-secret').value;
      if (!asEmail && !/^[a-z0-9]{2,20}$/.test(loginName)) {
        status('Use the short sign-in name, like maya.', true);
        return;
      }
      if (secret.length < 6) { status('The secret needs at least 6 characters.', true); return; }
      if (!served() || !Client() || !Client().configured()) {
        status('Sign-in needs the served game. You can play without saving.', true);
        return;
      }
      status('Signing in…');
      try {
        const user = asEmail ? await Client().signIn(loginName, secret) : await Client().signInChild(loginName, secret);
        const meta = user.user_metadata || {};
        const role = Client().roleOf(user);
        activate({
          learnerId: user.id,
          displayName: meta.display_name || (role === 'child' ? 'Friend' : 'Grown-up'),
          avatar: meta.avatar || 'garden',
          avatarImage: meta.avatar_image || '',
          loginName: meta.login_name || (asEmail ? '' : loginName),
          role
        });
        status('');
      } catch (error) { status(error.message, true); }
    });
    $('all-done').addEventListener('click', async () => {
      try { sessionStorage.removeItem('lw-guest'); } catch (error) { /* ignore */ }
      const client = Client();
      const store = Store();
      let user = null;
      try { user = served() && client ? await client.sessionUser() : null; } catch (error) { user = null; }
      try { if (client && user) await client.syncNow(); } catch (error) { /* queued progress stays on this device */ }
      if (store) {
        store.clearActive();
        store.clearProjection();
      }
      if (client) client.setLearner(null);
      if (user && client) await client.signOut();
      location.reload();
    });
  }

  async function resume() {
    if (guestVisit()) { showGuestLayouts(); return; }
    if (!served() || !Client() || !Client().configured()) { show('login'); return; }
    let user = null;
    try { user = await Client().sessionUser(); } catch (error) { user = null; }
    if (user) {
      const meta = user.user_metadata || {};
      const saved = Store().readActive();
      const role = Client().roleOf(user);
      activate(saved && saved.learnerId === user.id ? saved : {
        learnerId: user.id,
        displayName: meta.display_name || (role === 'child' ? 'Friend' : 'Grown-up'),
        avatar: meta.avatar || 'garden',
        avatarImage: meta.avatar_image || '',
        loginName: meta.login_name || '',
        role
      });
      return;
    }
    show('login');
  }

  function start() {
    if (started || !$('login')) return;
    started = true;
    bind();
    const safety = $('safety-note');
    try {
      if (safety && sessionStorage.getItem('lw-safety') === '1') {
        safety.hidden = false;
        sessionStorage.removeItem('lw-safety');
      }
    } catch (error) { /* private window */ }
    show('splash');
    const hold = reduceMotion() ? 0 : 700;
    root.setTimeout(() => { resume().catch(error => { status(error.message, true); show('login'); }); }, hold);
  }

  root.LittleWoofHome = {start, chooseDefault};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(typeof globalThis !== 'undefined' ? globalThis : this);
