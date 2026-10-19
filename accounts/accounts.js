(() => {
'use strict';
const config = window.ACCOUNT_CONFIG;
const SESSION_KEY = 'little-woof-session-v1', TARGET_KEY = 'little-woof-target-v1';
const listeners = new Set();
function requireHostedAccounts(){
  if(location.protocol==='file:')throw new Error('Open Letters with Lucy from a web address to sign in. You can play without saving here.');
}
const GUEST_KEY = 'letters-with-lucy-guest';
let guest = new URL(location.href).searchParams.get('mode') === 'guest';
try { guest ||= sessionStorage.getItem(GUEST_KEY) === '1'; } catch {}
let db, records = [], session = read(SESSION_KEY), self = session?.profile || null;
let owner = self, status = 'Sign in to keep your adventures.', syncing = null, refreshPromise = null;
let lastOrder = Date.now();
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('little-woof-accounts') : null;
function read(key, storage) {
  try { return JSON.parse((storage || localStorage).getItem(key)); } catch { return null; }
}
function emit() {
  for (const fn of listeners) fn();
  window.dispatchEvent(new Event('accountchange'));
}
function message(text) { status = text; emit(); }
function persistSession(next) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  session = next; self = next?.profile || null;
}
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('little-woof-accounts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('operations', {keyPath: 'id'});
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function transaction(mode, action) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('operations', mode), store = tx.objectStore('operations');
    const result = action(store, tx);
    tx.oncomplete = () => resolve(result?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Storage transaction interrupted.'));
  });
}
async function reloadRecords() { records = await transaction('readonly', store => store.getAll()); }
function snapshotFor(id) {
  const own = guest ? [] : records.filter(r => r.user_id === id);
  const accepted = own.filter(r => !r.pending).sort((a,b) => Number(a.seq)-Number(b.seq));
  const pending = own.filter(r => r.pending).sort((a,b) => a.local_order-b.local_order || a.id.localeCompare(b.id));
  const settings = {}, themes = {post:0,space:0,silk:0}, rounds = [];
  for (const event of [...accepted, ...pending]) {
    const p = event.payload;
    if (event.kind === 'round') rounds.push({id:event.id,...p});
    else if (p.field.startsWith('theme.')) themes[p.field.slice(6)] = p.value;
    else settings[p.field] = p.value;
  }
  const letters = new Set(rounds.map(r => r.letter));
  const achievements = [];
  if (rounds.length) achievements.push('First sound');
  if (letters.size >= 5) achievements.push('Five different sounds');
  if (letters.size === 26) achievements.push('All 26 sounds');
  for (const [world,label] of Object.entries({post:'Letter Post',space:'Moonboat',silk:'Ribbon Road'})) {
    if (new Set(rounds.filter(r=>r.world===world).map(r=>r.letter)).size === 26) achievements.push(label+' explorer');
  }
  return {settings:window.GROWN_UPS ? window.GROWN_UPS.normalize(settings) : settings, themes, rounds, achievements, count:rounds.length};
}
async function network(path, {method='GET', body, token, headers={}} = {}) {
  const controller = new AbortController(), timeout = setTimeout(()=>controller.abort(), 12000);
  try {
    const response = await fetch(config.url+path, {method, signal:controller.signal,
      headers:{apikey:config.key, ...(token?{Authorization:'Bearer '+token}:{}), ...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},
      ...(body===undefined?{}:{body:JSON.stringify(body)})});
    const value = response.status===204 ? null : await response.json();
    if (!response.ok) {
      const error = new Error(value?.msg || value?.message || value?.error_description || value?.error || 'The service could not finish that request.');
      error.status = response.status; throw error;
    }
    return value;
  } finally { clearTimeout(timeout); }
}
async function token() {
  if (guest || !session) throw new Error('Sign in first.');
  const latest = read(SESSION_KEY);
  if (!latest || latest.user.id !== session.user.id) throw new Error('Sign in again to sync. Your saved play is waiting.');
  session = latest;
  if ((session.expires_at || 0) > Date.now()/1000+60) return session.access_token;
  if (!refreshPromise) {
    const refresh = async () => {
      const saved = read(SESSION_KEY);
      if (!saved || saved.user.id !== session.user.id) throw new Error('Sign in again to sync. Your saved play is waiting.');
      if (saved.expires_at > Date.now()/1000+60) { session=saved; return saved.access_token; }
      const refreshProfile = self;
      const result = await network('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:saved.refresh_token}});
      if (!session || session.user.id!==saved.user.id || read(SESSION_KEY)?.user?.id!==saved.user.id) throw new Error('Signed out. Your saved play is waiting.');
      persistSession({...result,expires_at:Date.now()/1000+result.expires_in,profile:refreshProfile});
      return result.access_token;
    };
    refreshPromise = (navigator.locks ? navigator.locks.request('little-woof-token', refresh) : refresh()).finally(()=>{refreshPromise=null;});
  }
  return refreshPromise;
}
async function rest(path, options={}) {
  const access = await token();
  return network('/rest/v1/'+path.replace(/^\//,''),{...options,token:access,headers:{Prefer:'return=representation',...options.headers}});
}
async function manage(action, fields={}) {
  requireHostedAccounts();
  if (!self || self.role !== 'grownup') throw new Error('Sign in as a grown-up administrator first.');
  return network('/functions/v1/accounts',{method:'POST',body:{...fields,action},token:await token()});
}
async function signIn(handle, password, {role} = {}) {
  requireHostedAccounts();
  await ready;
  await syncing;
  if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(handle.trim().toLowerCase())) throw new Error('Use your username, with 3 to 32 letters, numbers, underscores or hyphens.');
  const result = await network('/auth/v1/token?grant_type=password',{method:'POST',body:{email:handle.trim().toLowerCase()+'@accounts.littlewoof.invalid',password}});
  const profiles = await network('/rest/v1/profiles?id=eq.'+result.user.id+'&select=*',{token:result.access_token});
  if (!profiles.length) throw new Error('This account is not ready. Ask your grown-up for help.');
  if (role && profiles[0].role !== role) throw new Error(role === 'child' ? 'This is a grown-up login. Use Are you a grown-up? below.' : 'This is a child login. Sign in from the game home page.');
  guest=false;try { sessionStorage.removeItem(GUEST_KEY); } catch {}
  persistSession({...result,expires_at:Date.now()/1000+result.expires_in,profile:profiles[0]});
  owner=self; sessionStorage.removeItem(TARGET_KEY); emit();
  await sync();
}
async function signOut() {
  guest=false;try { sessionStorage.removeItem(GUEST_KEY); } catch {}
  const previous = session;
  persistSession(null); owner=null; sessionStorage.removeItem(TARGET_KEY); message('Signed out. Saved play stays with its account.');
  if (previous && navigator.onLine) {
    try { await network('/auth/v1/logout?scope=local',{method:'POST',token:previous.access_token}); } catch { /* Local sign-out already removed the session. */ }
  }
}
async function selectOwner(profile) {
  await ready;
  await syncing;
  if (guest || !session) throw new Error('Sign in first.');
  if (profile.id !== self.id) {
    if (self.role !== 'grownup') throw new Error('A grown-up needs to choose this child.');
    const allowed = await rest('/guardians?adult_id=eq.'+self.id+'&child_id=eq.'+profile.id+'&select=child_id');
    if (!allowed.length) throw new Error('Link this child to your account first.');
  }
  owner=profile; sessionStorage.setItem(TARGET_KEY,JSON.stringify({actor:self.id,profile})); emit(); await sync();
}
async function append(kind, payload, id=crypto.randomUUID(), user=owner?.id) {
  if (guest) return false;
  await ready;
  if (!user) return false;
  const event = {id,user_id:user,kind,payload,pending:true,local_order:lastOrder=Math.max(Date.now(),lastOrder+1,...records.filter(r=>r.pending).map(r=>r.local_order+1))};
  try {
    await transaction('readwrite',(store,tx)=>{
      const prior=store.get(id);
      prior.onsuccess=()=>{
        if (!prior.result) store.add(event);
        else if(prior.result.user_id!==user || prior.result.kind!==kind || JSON.stringify(prior.result.payload)!==JSON.stringify(payload)) tx.abort();
      };
    });
    await reloadRecords(); emit(); channel?.postMessage('changed');
    void sync(); return true;
  } catch (error) {
    message('Could not save on this browser. Keep this page open and free some storage.'); throw error;
  }
}
async function setSetting(field,value) { return append('setting',{field,value}); }
async function setSettings(next) {
  const user=owner?.id;
  const before = snapshotFor(user).settings;
  for (const [field,value] of Object.entries(next)) {
    if (JSON.stringify(before[field]) !== JSON.stringify(value)) await append('setting',{field,value},crypto.randomUUID(),user);
  }
}
async function recordRound(world, letter, misses, id) { return append('round',{world,letter,misses},id); }
async function sync() {
  if (guest || !session || !owner || !db) return;
  if (syncing) return syncing;
  if (!navigator.onLine) { message('Offline. Your play is saved here and will sync when connected.'); return; }
  const account = owner.id, actor = self.id;
  syncing = (async()=>{
    try {
      message('Syncing your adventures…');
      await reloadRecords();
      const pending = records.filter(r=>r.user_id===account && r.pending).sort((a,b)=>a.local_order-b.local_order || a.id.localeCompare(b.id));
      for (let i=0;i<pending.length;i+=100) {
        if (self?.id!==actor) return;
        await rest('/rpc/sync_batch',{method:'POST',body:{p_owner:account,p_events:pending.slice(i,i+100).map(({id,kind,payload})=>({id,kind,payload}))}});
      }
      const remote = [];
      for (let offset=0;;offset+=500) {
        const batch = await rest('/operations?user_id=eq.'+account+'&select=id,seq,user_id,kind,payload&order=seq.asc&offset='+offset+'&limit=500');
        remote.push(...batch);
        if (batch.length<500) break;
      }
      await transaction('readwrite',store=>{ for (const event of remote) store.put({...event,pending:false}); });
      await reloadRecords(); channel?.postMessage('changed');
      const remaining = records.filter(r=>r.user_id===account && r.pending).length;
      message(remaining ? remaining+' changes saved here. Syncing again shortly.' : 'All adventures are synced.');
    } catch (error) {
      message(error.status===401 ? 'Sign in again to sync. Your saved play is waiting.' : 'Saved here. Sync will retry when the connection is ready. '+error.message);
    }
  })().finally(()=>{syncing=null;});
  return syncing;
}
const ready = (async()=>{
  if (location.protocol==='file:') return;
  try {
    db=await openDB(); await reloadRecords();
    const target=read(TARGET_KEY,sessionStorage);
    if (self && target?.actor===self.id) owner=target.profile;
    emit();
  } catch (error) { message('Account storage is unavailable. Open a normal browser window before playing.'); throw error; }
})();
window.ACCOUNTS = {ready,
  startGuest(){
    if(session)void signOut().catch(()=>{});guest=true;
    try { sessionStorage.setItem(GUEST_KEY,'1'); } catch {}
    emit();
  },
  get guest(){return guest;}, signIn,signOut,selectOwner,setSetting,setSettings,recordRound,sync,rest,manage,
  async changePassword(password) { if([...password].length<6)throw new Error('Use at least 6 characters.'); return network('/auth/v1/user',{method:'PUT',token:await token(),body:{password}}); },
  get session(){return guest?null:session;},get profile(){return guest?null:self;},get owner(){return guest?null:owner;},get status(){return status;},
  get snapshot(){return snapshotFor(guest?null:owner?.id);},get pending(){if(guest)return 0;return records.filter(r=>r.pending && r.user_id===owner?.id).length;},
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}
};
channel && (channel.onmessage=async()=>{if(db){await reloadRecords();emit();}});
window.addEventListener('online',()=>void sync());
window.addEventListener('storage',event=>{
  if(event.key===SESSION_KEY && read(SESSION_KEY)?.user?.id!==self?.id) location.reload();
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void sync();});
setInterval(()=>{if(!document.hidden)void sync();},15000);
ready.then(()=>void sync()).catch(()=>{});
})();
