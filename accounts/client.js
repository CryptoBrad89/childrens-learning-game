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
const DEFAULTS_KEY='lwl-game-defaults', OVERRIDES_KEY='lwl-child-overrides';
let gameDefaults=read(DEFAULTS_KEY)||{}, childOverrides=read(OVERRIDES_KEY)||{};
let ending=false, sessionCheck=null, lastTouch=0, settingsRevision=0;
const writes=new Set();
const base=new URL('../',document.currentScript.src);
function cacheSettings(){
  localStorage.setItem(DEFAULTS_KEY,JSON.stringify(gameDefaults));
  localStorage.setItem(OVERRIDES_KEY,JSON.stringify(childOverrides));
}
function effectiveSettings(id){
  const result={...gameDefaults,...(id?childOverrides[id]||{}:{})};
  if(id)for(const event of records.filter(r=>r.user_id===id&&r.pending&&r.kind==='setting').sort((a,b)=>a.local_order-b.local_order)){
    if(Object.hasOwn(result,event.payload.field))result[event.payload.field]=event.payload.value;
  }
  return result;
}
async function refreshSettings(){
  const revision=settingsRevision;
  const rows=await network('/rest/v1/game_settings?select=settings');
  if(revision!==settingsRevision)return;
  if(rows[0])gameDefaults=rows[0].settings;
  if(session&&!guest){
    const actor=self.id;
    const children=await allRows('child_settings?select=child_id,overrides');
    if(revision!==settingsRevision)return;
    if(self?.id===actor){childOverrides={};for(const row of children)childOverrides[row.child_id]=row.overrides;}
  }
  cacheSettings();emit();
}
async function applySettings(childIds,patch,{reset=false}={}){
  settingsRevision++;
  const result=await manage(childIds.length?'patch-child-settings':'patch-game-settings',childIds.length?{child_ids:childIds,patch,reset}:{patch});
  if(childIds.length){
    await refreshSettings();
    const failed=(result.results||[]).filter(row=>!row.ok);
    if(failed.length)throw new Error('Settings could not be applied to: '+failed.map(row=>row.id+' ('+(row.reason||'failed')+')').join(', '));
  }else gameDefaults=result.settings;
  cacheSettings();emit();return result;
}
function localDeadline(){
  if(session?.safety_expires_at)return session.safety_expires_at*1000;
  // Old saved credentials are rechecked at the server before use.
  return ((session?.expires_at||0)-(session?.expires_in||3600)+(self?.role==='child'?21600:1800))*1000;
}
async function expireSession(){
  if(ending||!session)return;
  ending=true;
  const role=self?.role;
  await signOut({expired:true});
  location.replace(new URL(role==='grownup'?'accounts/index.html?expired=1':'index.html?expired=1',base).href);
}
async function sessionStatus({touch=false}={}){
  if(!session||guest)return;
  if(Date.now()>=localDeadline()){void expireSession();throw new Error('Signed out for safety. Your saved play is waiting.');}
  if(sessionCheck){await sessionCheck;if(!touch)return;}
  const actor=self.id;
  sessionCheck=(async()=>{
    const result=await network('/rest/v1/rpc/session_status',{method:'POST',body:{p_touch:touch},token:await token()});
    if(self?.id!==actor)return;
    persistSession({...session,safety_expires_at:result.expires_at});
    if(Date.now()>=localDeadline())void expireSession();
    return result;
  })().catch(error=>{if([401,403].includes(error.status))void expireSession();throw error;}).finally(()=>{sessionCheck=null;});
  return sessionCheck;
}
function activity(){
  if(!session||guest)return;
  if(Date.now()>=localDeadline()){void expireSession();return;}
  if(self.role==='grownup'&&Date.now()-lastTouch>30000){lastTouch=Date.now();void sessionStatus({touch:true}).catch(()=>{});}
}
for(const event of ['pointerdown','keydown','touchstart','scroll'])window.addEventListener(event,activity,{passive:true});
setInterval(()=>{if(session&&!guest&&Date.now()>=localDeadline())void expireSession();},1000);
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
function snapshotFor(id, source = records) {
  const own = guest ? [] : source.filter(r => r.user_id === id);
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
  const resolved=effectiveSettings(id);
  return {settings:window.GROWN_UPS ? window.GROWN_UPS.normalize(resolved) : resolved, themes, rounds, achievements, count:rounds.length};
}
async function network(path, {method='GET', body, token, headers={}, timeoutMs=12000} = {}) {
  const controller = new AbortController(), timeout = setTimeout(()=>controller.abort(), timeoutMs);
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
  if(!ending&&Date.now()>=localDeadline()){void expireSession();throw new Error('Signed out for safety.');}
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
      persistSession({...saved,...result,expires_at:Date.now()/1000+result.expires_in,profile:refreshProfile});
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
function bulkSessionId() {
  try { return JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).session_id; }
  catch { return session.user.id; }
}
function canonical(value) {
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
}
async function manage(action, fields={}) {
  requireHostedAccounts();
  if (!self || self.role !== 'grownup') throw new Error('Sign in as a grown-up administrator first.');
  const bulk=['delete-children','delete-grownups','reset-children-progress','reset-grownups-progress','patch-child-settings','transfer-child','transfer-children'].includes(action);
  const storageKey='lwl-pending-bulk-v1', actor=self.id, sessionId=bulkSessionId();
  const safeFields=Object.fromEntries(Object.entries(fields).filter(([key])=>!['current_password','password','new_password'].includes(key)));
  const fingerprint=JSON.stringify(canonical({action,fields:safeFields}));
  let saved;
  if(bulk){
    try{saved=JSON.parse(sessionStorage.getItem(storageKey));}catch{}
    if(saved?.actor!==actor||saved?.session!==sessionId)saved={actor,session:sessionId,jobs:{}};
  }
  let pending=bulk?saved.jobs[fingerprint]:null;
  if(bulk&&!pending){pending={request_id:crypto.randomUUID(),action,fields:safeFields};saved.jobs[fingerprint]=pending;sessionStorage.setItem(storageKey,JSON.stringify(saved));}
  const persist=()=>{if(bulk)sessionStorage.setItem(storageKey,JSON.stringify(saved));};
  const clear=()=>{if(bulk){delete saved.jobs[fingerprint];persist();}};
  let result;
  if(!pending?.job_id){
    try{
      result=await network('/functions/v1/accounts',{method:'POST',body:{...fields,action,...(pending?{request_id:pending.request_id}:{})},token:await token(),timeoutMs:60000});
    }catch(error){
      if([400,401,403,404].includes(error.status))clear();
      else if(bulk)error.message='Your action is saved. Retry to continue.';
      throw error;
    }
    if(!result?.job_id){clear();return result;}
    if(pending){pending.job_id=result.job_id;persist();}
  }
  const job=pending?.job_id||result.job_id;
  do {
    for(let attempt=0;;attempt++){
      try{
        result=await network('/functions/v1/accounts',{method:'POST',body:{action:'run-bulk',job_id:job},token:await token(),timeoutMs:60000});
        break;
      }catch(error){
        if(attempt>=2||[400,401,403,404].includes(error.status)){
          const failure=new Error('Your action is saved. Retry to continue. '+([401,403].includes(error.status)?'Sign in again if needed.':''));
          failure.status=error.status;throw failure;
        }
        await new Promise(resolve=>setTimeout(resolve,300*(attempt+1)));
      }
    }
    if(!result.done)await new Promise(resolve=>setTimeout(resolve,350));
  }while(!result.done);
  clear();return {results:result.results||[]};
}

async function allRows(path) {
  const query = new URL(path.replace(/^\//,''), 'https://rows.invalid/');
  query.searchParams.delete('offset'); query.searchParams.delete('limit');
  const ordering = query.searchParams.get('order');
  const tie = query.pathname === '/guardians' ? 'adult_id.asc,child_id.asc' : query.pathname === '/child_settings' ? 'child_id.asc' : 'id.asc';
  query.searchParams.set('order', ordering ? ordering + ',' + tie : tie);
  const rows = [];
  for (let offset = 0;; offset += 200) {
    query.searchParams.set('offset', String(offset)); query.searchParams.set('limit', '200');
    const page = await rest(query.pathname + query.search);
    rows.push(...page);
    if (page.length < 200) return rows;
  }
}
async function readProgress(id) {
  const remote = [];
  for(let offset=0;;offset+=500){
    const batch = await rest('operations?user_id=eq.'+encodeURIComponent(id)+'&select=id,seq,user_id,kind,payload&order=seq.asc&offset='+offset+'&limit=500');
    remote.push(...batch); if(batch.length<500)break;
  }
  return {snapshot:snapshotFor(id,remote),checkedAt:new Date().toISOString()};
}
async function editProfile(fields) {
  const {profile} = await manage('edit-profile', fields);
  if (!profile || profile.id!==self?.id) throw new Error('Profile could not update.');
  const wasSelf=owner?.id===self.id;
  persistSession({...session,profile}); if(wasSelf)owner=profile; emit();
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
  owner=self; ending=false; sessionStorage.removeItem(TARGET_KEY);
  await sessionStatus({touch:true});emit();
  await sync();
}
async function signOut({expired=false}={}) {
  await Promise.allSettled([...writes]);
  if(!expired)await Promise.race([sync(),new Promise(resolve=>setTimeout(resolve,2500))]);
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
  if (profile.id !== self.id && !self.is_master) {
    if (self.role !== 'grownup') throw new Error('A grown-up needs to choose this child.');
    const allowed = await rest('/guardians?adult_id=eq.'+self.id+'&child_id=eq.'+profile.id+'&select=child_id');
    if (!allowed.length) throw new Error('Link this child to your account first.');
  }
  owner=profile; sessionStorage.setItem(TARGET_KEY,JSON.stringify({actor:self.id,profile})); emit(); await sync();
}
function append(...args){
  const write=appendOperation(...args);writes.add(write);write.finally(()=>writes.delete(write)).catch(()=>{});return write;
}
async function appendOperation(kind, payload, id=crypto.randomUUID(), user=owner?.id) {
  if (guest) return false;
  await ready;
  if (!user) return false;
  const event = {id,user_id:user,kind,payload,progress_version:owner?.progress_version || 0,pending:true,local_order:lastOrder=Math.max(Date.now(),lastOrder+1,...records.filter(r=>r.pending).map(r=>r.local_order+1))};
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
  const before=window.GROWN_UPS.normalize(effectiveSettings(owner?.role==='child'?owner.id:null));
  const patch=Object.fromEntries(Object.entries(next).filter(([key,value])=>JSON.stringify(value)!==JSON.stringify(before[key])));
  if(Object.keys(patch).length)await applySettings(owner?.role==='child'?[owner.id]:[],patch);
}
async function recordRound(world, letter, misses, id) { return append('round',{world,letter,misses},id); }
async function sync() {
  if (guest || !session || !owner || !db) return;
  if (syncing) {
    await syncing;
    if (navigator.onLine && records.some(r=>r.pending && r.user_id===owner?.id)) return sync();
    return;
  }
  if (!navigator.onLine) { message('Offline. Your play is saved here and will sync when connected.'); return; }
  const account = owner.id, actor = self.id;
  syncing = (async()=>{
    try {
      message('Syncing your adventures…');
      await sessionStatus();
      await refreshSettings();
      await reloadRecords();
      const profiles = await rest('/profiles?id=eq.'+account+'&select=*');
      if (!profiles.length) throw new Error('This account is no longer available.');
      if (self?.id!==actor || read(SESSION_KEY)?.user?.id!==actor) return;
      const version = profiles[0].progress_version || 0;
      if (owner?.id === account) owner = profiles[0];
      if (self?.id === account) persistSession({...session, profile:profiles[0]});
      await transaction('readwrite',store=>{for(const event of records)if(event.user_id===account && event.pending && event.kind==='round' && (event.progress_version||0)!==version)store.delete(event.id);});
      await reloadRecords();
      const pending = records.filter(r=>r.user_id===account && r.pending).sort((a,b)=>a.local_order-b.local_order || a.id.localeCompare(b.id));
      for (let i=0;i<pending.length;i+=100) {
        if (self?.id!==actor) return;
        await rest('/rpc/sync_batch',{method:'POST',body:{p_owner:account,p_progress_version:version,p_events:pending.slice(i,i+100).map(({id,kind,payload})=>({id,kind,payload}))}});
      }
      const remote = [];
      for (let offset=0;;offset+=500) {
        const batch = await rest('/operations?user_id=eq.'+account+'&select=id,seq,user_id,kind,payload&order=seq.asc&offset='+offset+'&limit=500');
        remote.push(...batch);
        if (batch.length<500) break;
      }
      await transaction('readwrite',store=>{
        for (const event of records) if(event.user_id===account && (!event.pending || pending.some(p=>p.id===event.id))) store.delete(event.id);
        for (const event of remote) store.put({...event,pending:false});
      });
      await reloadRecords(); await refreshSettings(); channel?.postMessage('changed');
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
    if(session)try{
      await sessionStatus();
      const profiles=await rest('/profiles?id=eq.'+self.id+'&select=*');
      if(profiles.length){const own=owner?.id===self.id;persistSession({...session,profile:profiles[0]});if(own)owner=self;}
    }catch(error){if([401,403].includes(error.status))throw error;}
    try{await refreshSettings();}catch{}
    emit();
  } catch (error) { message('Account storage is unavailable. Open a normal browser window before playing.'); throw error; }
})();
window.ACCOUNTS = {ready,
  async startGuest(){
    if(session)await signOut();guest=true;
    try { sessionStorage.setItem(GUEST_KEY,'1'); } catch {}
    emit();
  },
  get gameDefaults(){return {...gameDefaults};},get childOverrides(){return structuredClone(childOverrides);},effectiveSettings,refreshSettings,applySettings,sessionStatus,expireSession,
  get guest(){return guest;}, signIn,signOut,selectOwner,setSetting,setSettings,recordRound,sync,rest,allRows,manage,readProgress,editProfile,
  async changePassword(password,current_password) { if([...password].length<6)throw new Error('Use at least 6 characters.'); return manage('change-own-password',{password,current_password}); },
  get session(){return guest?null:session;},get profile(){return guest?null:self;},get owner(){return guest?null:owner;},get status(){return status;},
  get snapshot(){return snapshotFor(guest?null:owner?.id);},get pending(){if(guest)return 0;return records.filter(r=>r.pending && r.user_id===owner?.id).length;},
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}
};
channel && (channel.onmessage=async()=>{if(db){await reloadRecords();emit();}});
window.addEventListener('online',()=>void sync());
window.addEventListener('storage',event=>{
  if(event.key===SESSION_KEY){
    const next=read(SESSION_KEY);
    if(next?.user?.id!==self?.id)location.reload();
    else if(next)session=next;
  }
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void sync();});
setInterval(()=>{if(!document.hidden)void sync();},15000);
ready.then(()=>void sync()).catch(()=>{});
})();
