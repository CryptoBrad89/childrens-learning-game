/* Network half of accounts. Reads and writes go through the local store first.
 * Sync sends the whole local state; the database merges it and cannot delete
 * a letter or a play that is already recorded.
 */
(function (root) {
  'use strict';
  const Merge = root.LittleWoofMerge;
  const Store = root.LittleWoofStore;
  const Config = () => root.LITTLE_WOOF_CONFIG;
  let client = null;
  let syncing = false;
  let again = false;
  let timer = 0;
  let learnerId = null;
  const pending = new Set();

  function configured() {
    const config = Config();
    return !!(config && config.url && config.key && root.supabase && root.supabase.createClient);
  }
  function supabase() {
    if (!configured()) throw new Error('Supabase is not configured.');
    if (!client) {
      const config = Config();
      client = root.supabase.createClient(config.url, config.key, {
        auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: false}
      });
    }
    return client;
  }
  function childEmail(loginName) {
    return `${loginName}@${Config().childDomain}`;
  }
  async function invoke(name, body) {
    const {data, error} = await supabase().functions.invoke(name, {body});
    if (error) {
      let message = error.message || 'The request failed.';
      try {
        const context = await error.context?.json?.();
        if (context && context.error) message = explainMessage(context.error);
      } catch (parseError) { /* the body was not JSON */ }
      throw new Error(message);
    }
    if (data && (data.error === 'not-linked' || data.code === 'not-linked')) {
      throw new Error('That child is not linked to you.');
    }
    if (data && data.error) throw new Error(data.error);
    return data;
  }
  function explainMessage(message) {
    if (message === 'not-linked') return 'That child is not linked to you.';
    if (message === 'signed out for safety') return 'You were signed out for safety.';
    return message;
  }
  async function sessionUser() {
    const {data, error} = await supabase().auth.getSession();
    if (error) throw new Error(error.message);
    return data.session ? data.session.user : null;
  }
  // The stored session is read asynchronously. A request made before that
  // finishes is anonymous and the server rejects it.
  async function sessionReady() {
    const user = await sessionUser();
    if (!user) throw new Error('Sign in before syncing.');
    return user;
  }
  function roleOf(user) {
    return user && user.app_metadata && user.app_metadata.role || '';
  }
  async function signIn(email, password) {
    const {data, error} = await supabase().auth.signInWithPassword({email, password});
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'That secret did not match.' : error.message);
    try { await supabase().rpc('touch_session', {p_start: true}); } catch (sessionError) { /* the limit is also checked on the next call */ }
    return data.user;
  }
  async function signInChild(loginName, password) {
    return signIn(childEmail(loginName), password);
  }
  async function signOut() {
    await supabase().auth.signOut();
  }
  async function lookupClass(code) {
    const {data, error} = await supabase().rpc('lookup_classroom', {p_code: code.trim().toUpperCase()});
    if (error) throw new Error(error.message);
    return data;
  }
  async function roster() {
    await sessionReady();
    const {data, error} = await supabase().rpc('my_roster');
    if (error) throw new Error(error.message);
    return data;
  }
  async function createClass(name, code) {
    await sessionReady();
    const {data, error} = await supabase().rpc('create_classroom', {p_name: name, p_code: code || ''});
    if (error) throw new Error(error.message);
    return data;
  }
  function activeLearner() {
    return learnerId;
  }
  function setLearner(id) { learnerId = id; }
  async function pull(id) {
    await sessionReady();
    const local = Store.readState(id);
    const {data, error} = await supabase().rpc('merge_learner_state', {p_user_id: id, p_state: local});
    if (error) throw new Error(error.message);
    const during = Store.readState(id);
    const merged = Merge.mergeState(data, during);
    Store.writeState(id, merged);
    if (!Merge.sameState(merged, data)) again = true;
    return merged;
  }
  async function syncNow() {
    if (learnerId) pending.add(learnerId);
    if (!pending.size || (root.navigator && root.navigator.onLine === false)) return null;
    if (syncing) { again = true; return null; }
    syncing = true;
    let latest = null;
    try {
      for (const id of [...pending]) {
        pending.delete(id);
        latest = await pull(id);
        if (id === learnerId) {
          // The games listen on document. A window event would not reach them.
          const target = root.document || root;
          target.dispatchEvent(new CustomEvent('little-woof-progress'));
          target.dispatchEvent(new CustomEvent('little-woof-settings'));
        }
      }
      return latest;
    } finally {
      syncing = false;
      if (again || pending.size) { again = false; await syncNow(); }
    }
  }
  function scheduleSync(id) {
    const target = id || learnerId;
    if (target) pending.add(target);
    if (timer) root.clearTimeout(timer);
    timer = root.setTimeout(() => {
      timer = 0;
      syncNow().catch(error => (root.document || root).dispatchEvent(new CustomEvent('little-woof-sync-error', {detail: error.message})));
    }, 400);
  }
  function noteSettings(id, flat) {
    const now = new Date().toISOString();
    const state = Store.readState(id);
    state.settings = Store.stampSettings(state.settings, flat, now);
    Store.writeState(id, state);
    scheduleSync(id);
  }
  function noteTheme(id, world, value) {
    const state = Store.readState(id);
    state.themes = Merge.mergeState(state, {themes: {[world]: {v: value, t: new Date().toISOString()}}}).themes;
    Store.writeState(id, state);
    scheduleSync(id);
  }
  function resetProgress(id) {
    const now = new Date().toISOString();
    const state = Store.readState(id);
    state.progress = Merge.emptyProgress();
    state.achievements = {};
    state.progressEpoch = {v: now, t: now};
    Store.writeState(id, state);
    scheduleSync(id);
    return state;
  }
  async function touchActivity() {
    try {
      const {data, error} = await supabase().rpc('touch_session', {p_start: false, p_peek: false});
      if (error || !data) return {ok: true, reason: ''};
      return data;
    } catch (error) {
      return {ok: true, reason: ''};
    }
  }
  async function peekSession() {
    try {
      const {data, error} = await supabase().rpc('touch_session', {p_start: false, p_peek: true});
      if (error || !data) return {ok: true, reason: ''};
      return data;
    } catch (error) {
      return {ok: true, reason: ''};
    }
  }
  function earn(id, world, letter) {
    const now = new Date().toISOString();
    const state = Store.readState(id);
    if (!state.progress[world].letters[letter]) state.progress[world].letters[letter] = now;
    const replica = Store.replicaId();
    const counts = state.progress[world].counts;
    counts[replica] = Math.min(1000000, (counts[replica] || 0) + 1);
    const earned = Merge.withAchievements(state, now);
    Store.writeState(id, earned);
    scheduleSync(id);
    return earned;
  }

  root.LittleWoofClient = {
    configured, supabase, childEmail, invoke, sessionUser, roleOf, signIn, signInChild, signOut,
    lookupClass, roster, createClass, activeLearner, setLearner, pull, syncNow, scheduleSync,
    noteSettings, noteTheme, earn, resetProgress, touchActivity, peekSession
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
