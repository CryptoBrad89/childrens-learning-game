'use strict';
// Execute the production handler. Transport doubles model Auth and the SQL boundary;
// risky_actions_database.cjs independently exercises the database implementation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../.job/db-tools/node_modules/typescript');
const id = n => `21000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const master = id(1), adult = id(2), kid = id(3), other = id(4), job = id(9000), created = id(9001);
const people = new Map([
  [master, {id:master, role:'grownup', is_master:true, handle:'fixture_master'}],
  [adult, {id:adult, role:'grownup', is_master:false, handle:'fixture_adult'}],
  [kid, {id:kid, role:'child', is_master:false, handle:'fixture_kid'}],
  [other, {id:other, role:'grownup', is_master:false, handle:'fixture_other'}],
]);
let actor = master, calls = [], handler, claim = {done:true, results:[]}, sessionValid = true;
let failDelete = null, failVerify = false;
const current = ' own password ', someoneElse = 'other-person-password';
const ok = body => new Response(JSON.stringify(body), {headers:{'Content-Type':'application/json'}});
const fail = () => new Response(JSON.stringify({message:'Denied'}), {status:403});
const source = ts.transpileModule(fs.readFileSync('supabase/functions/accounts/index.ts', 'utf8'), {
  compilerOptions:{target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.CommonJS},
}).outputText;
vm.runInNewContext(source, {
  exports:{}, Request, Response, console, setTimeout, clearTimeout,
  Deno:{env:{get:name => ({SUPABASE_URL:'https://fixture.invalid', SUPABASE_ANON_KEY:'public', SUPABASE_SERVICE_ROLE_KEY:'private'})[name]}, serve:fn => handler=fn},
  fetch:async (url, options) => {
    const u = new URL(url), body = options.body ? JSON.parse(options.body) : undefined;
    calls.push({path:u.pathname, url, body, options});
    const caller = () => {
      assert.equal(options.headers.Authorization, 'Bearer caller');
      assert.equal(options.headers.apikey, 'public');
    };
    if (u.pathname === '/auth/v1/user') { caller(); return ok({id:actor}); }
    if (u.pathname.endsWith('/session_status')) {
      caller(); assert.deepEqual(body, {p_touch:false}); return sessionValid ? ok({}) : fail();
    }
    if (u.pathname.endsWith('/verify_risky_password')) {
      caller(); assert.deepEqual(Object.keys(body), ['p_password']);
      if (failVerify) throw Error('Unavailable');
      return ok(body.p_password === current);
    }
    if (u.pathname.endsWith('/start_bulk_action')) {
      caller(); assert(!('p_actor' in body));assert('p_request_id' in body);
      if (body.p_action !== 'patch-child-settings' && body.p_password !== current) return fail();
      return ok(job);
    }
    if (u.pathname.endsWith('/claim_bulk_action')) { caller(); assert.deepEqual(body, {p_job:job}); return ok(claim); }
    if (u.pathname.endsWith('/process_bulk_action') || u.pathname.endsWith('/finish_bulk_action')) {
      assert.equal(options.headers.Authorization, 'Bearer private');
      assert.equal(body.p_actor, actor); assert.equal(body.p_job, job); assert.equal(body.p_lease, claim.lease);
      return ok({done:true, results:body.p_results || claim.targets.map(target => ({id:target, ok:true}))});
    }
    if (u.pathname === '/rest/v1/profiles') {
      if (options.method === 'PATCH') return ok(null);
      let rows = [...people.values()];
      for (const field of ['id','role','is_master','handle']) {
        const filter = u.searchParams.get(field);
        if (filter?.startsWith('eq.')) rows = rows.filter(row => String(row[field]) === filter.slice(3));
        if (filter?.startsWith('neq.')) rows = rows.filter(row => String(row[field]) !== filter.slice(4));
      }
      const range=options.headers.Range || options.headers.range;
      const offset=Number(u.searchParams.get('offset') || (range ? range.split('-')[0] : 0));
      const limit=Math.min(1000, Number(u.searchParams.get('limit') || (range ? Number(range.split('-')[1])-offset+1 : 1000)));
      return ok(rows.slice(offset,offset+limit));
    }
    if (u.pathname === '/rest/v1/guardians') return ok(options.method === 'POST' ? null : [{adult_id:adult, child_id:kid}]);
    if (u.pathname === '/auth/v1/admin/users' && options.method === 'POST') return ok({id:created});
    if (u.pathname.startsWith('/auth/v1/admin/users/')) return u.pathname.endsWith(failDelete) ? fail() : ok({});
    if (u.pathname.startsWith('/rest/v1/rpc/')) return ok({ok:true});
    throw Error('Unexpected request: '+url);
  },
});
async function send(action, fields={}, token='caller') {
  calls=[];
  const response=await handler(new Request('https://fixture.invalid/accounts', {
    method:'POST', headers:{'Content-Type':'application/json', ...(token ? {Authorization:'Bearer '+token} : {})},
    body:JSON.stringify({action, ...fields}),
  }));
  return {status:response.status, data:await response.json()};
}
function writes() {
  return calls.filter(call => ['POST','PUT','PATCH','DELETE'].includes(call.options.method) &&
    !['/session_status','/verify_risky_password','/start_bulk_action','/claim_bulk_action'].some(suffix => call.path.endsWith(suffix)));
}
function verifiedBeforeWrite(action) {
  const proof=calls.findIndex(call => call.path.endsWith('/verify_risky_password'));
  assert(proof>=0, action+' verifies password');
  for (const write of writes()) assert(calls.indexOf(write)>proof, action+' verifies before '+write.path);
}
(async () => {
  const risky=[
    ['delete-child',{child_id:kid}], ['delete-grownup',{grownup_id:other}],
    ['reset-child-progress',{child_id:kid}], ['reset-grownup-progress',{grownup_id:other}],
    ['reset-child-password',{child_id:kid,password:'replacement'}], ['reset-grownup-password',{grownup_id:other,password:'replacement'}],
    ['unlink-child',{child_id:kid,grownup_id:adult}],
    ['transfer-child',{child_id:kid,source_id:adult,destination_id:other}],
    ['create-grownup',{handle:'fixture_new',display_name:'New',password:'replacement'}],
    ['register',{handle:'fixture_new',display_name:'New',password:'replacement'}],
    ['edit-child-profile',{child_id:kid,handle:'changed_kid',display_name:'Changed',avatar:'⭐'}],
    ['edit-grownup-profile',{grownup_id:other,handle:'changed_other',display_name:'Changed',avatar:'⭐'}],
  ];
  for (const [action,fields] of risky) {
    actor=master;
    for (const supplied of [undefined,'wrong',someoneElse]) {
      const result=await send(action,{...fields,current_password:supplied,confirm:action,verified:true,p_actor:other});
      assert(result.status>=400,action+' rejects '+String(supplied));
      assert.equal(writes().length,0,action+' wrong/missing password writes nothing');
    }
    const result=await send(action,{...fields,current_password:current,p_actor:other});
    assert.equal(result.status,200,action+': '+JSON.stringify(result.data));
    if(action==='transfer-child') {
      assert.deepEqual(calls.find(c=>c.path.endsWith('/start_bulk_action')).body,{p_action:'transfer-children',p_targets:[kid],p_parameters:{source_id:adult,destination_id:other},p_password:current,p_request_id:null});
      assert.equal(writes().length,0);
    } else verifiedBeforeWrite(action);
  }
  actor=adult;
  for (const action of ['reset-own-progress','change-own-password','edit-profile']) {
    const fields=action==='change-own-password'?{password:'replacement'}:action==='edit-profile'?{handle:'renamed_adult',display_name:'Renamed',avatar:'⭐'}:{};
    for (const current_password of [undefined,'wrong',someoneElse]) {
      const result=await send(action,{...fields,current_password,grownup_id:other,p_actor:other,confirm:action});
      assert(result.status>=400,action+' password refused'); assert.equal(writes().length,0);
    }
    assert.equal((await send(action,{...fields,current_password:current,p_actor:other,grownup_id:other})).status,200);
    verifiedBeforeWrite(action);
    if(action==='edit-profile') assert.deepEqual(calls.find(c=>c.path.endsWith('/edit_confirmed_profile')).body,{p_actor:adult,p_target:adult,p_expected_handle:'fixture_adult',p_handle:'renamed_adult',p_display_name:'Renamed',p_avatar:'⭐'});
    if (action==='reset-own-progress') assert.equal(calls.find(c=>c.path.endsWith('/reset_own_progress')).body.p_actor,adult);
    if (action==='change-own-password') assert.deepEqual(calls.find(c=>c.path.endsWith('/set_account_password')).body,{p_actor:adult,p_target:adult,p_password:'replacement'});
  }
  actor=master;
  for (const [action,fields] of [['reset-grownup-password',{grownup_id:other}],['reset-child-password',{child_id:kid}]]) {
    await send(action,{...fields,password:'replacement',current_password:current});
    assert.deepEqual(calls.find(c=>c.path.endsWith('/set_account_password')).body,{p_actor:master,p_target:action==='reset-child-password'?kid:other,p_password:'replacement'});
    assert(!calls.some(c=>c.path.startsWith('/auth/v1/admin/users/') && c.options.method==='PUT'));
  }
  // Unchanged normalized username needs no proof, even when the display/picture changes.
  for (const [action,fields,who] of [
    ['edit-child-profile',{child_id:kid,handle:' FIXTURE_KID '},master],
    ['edit-grownup-profile',{grownup_id:other,handle:' FIXTURE_OTHER '},master],
    ['edit-profile',{handle:' FIXTURE_ADULT '},adult],
  ]) {
    actor=who; const result=await send(action,{...fields,display_name:'New display',avatar:'⭐'});
    assert.equal(result.status,200,action+' harmless edit');
    assert(!calls.some(c=>c.path.endsWith('/verify_risky_password')),action+' skips needless proof');
    assert.equal(calls.find(c=>c.path.endsWith('/edit_confirmed_profile')).body.p_expected_handle,fields.handle.trim().toLowerCase());
  }
  actor=master;
  for (const [action,fields] of [
    ['create-child',{handle:'fixture_new_kid',display_name:'New kid',password:'replacement',avatar:'🐶'}],
    ['link-child',{child_id:kid,grownup_id:adult}], ['patch-game-settings',{patch:{calm:true}}],
    ['patch-child-settings',{child_ids:[kid],patch:{},reset:true}],
  ]) {
    assert.equal((await send(action,fields)).status,200,action+' no password');
    assert(!calls.some(c=>c.path.endsWith('/verify_risky_password')));
  }
  const explicitRequest=id(7000);
  await send('delete-children',{child_ids:[kid],current_password:current,request_id:explicitRequest});
  assert.equal(calls.find(c=>c.path.endsWith('/start_bulk_action')).body.p_request_id,explicitRequest,'Idempotency key forwarded to session-bound SQL job');
  const ids=Array.from({length:1251},(_,n)=>id(100+n));
  const bulks=[['delete-children','child_ids'],['delete-grownups','grownup_ids'],['reset-children-progress','child_ids'],['reset-grownups-progress','grownup_ids'],['transfer-children','child_ids'],['patch-child-settings','child_ids']];
  for (const [action,field] of bulks) {
    const parameters=action==='transfer-children'?{source_id:adult,destination_id:other}:action==='patch-child-settings'?{patch:{calm:true}}:{};
    if(action!=='patch-child-settings') for(const supplied of [undefined,'wrong',someoneElse]) {
      const denied=await send(action,{...parameters,[field]:ids,current_password:supplied,confirm:action,p_actor:other});
      assert(denied.status>=400,action+' rejects unverified job');assert(!denied.data.job_id);
      assert.equal(writes().length,0,action+' rejected job cannot mutate accounts');
    }
    const result=await send(action,{...parameters,[field]:ids,current_password:current,p_actor:other});
    assert.equal(result.status,200,action+' accepts >1000: '+JSON.stringify(result.data)); assert.equal(result.data.job_id,job);
    const start=calls.find(c=>c.path.endsWith('/start_bulk_action'));
    assert.deepEqual(start.body.p_targets,ids,action+' never truncates'); assert.equal(start.body.p_action,action);
    assert.equal(writes().length,0,action+' begins job without direct writes');
    for (const targets of [[],[kid,kid],['bad'],[null]]) {
      assert((await send(action,{...parameters,[field]:targets,current_password:current})).status>=400,action+' malformed selection');
      assert.equal(writes().length,0);
    }
  }
  people.set(id(888),{id:id(888),role:'child',is_master:false,handle:'failed_delete'});
  claim={action:'delete-children',targets:[kid,id(888)],parameters:{},cursor:0,lease:id(999)}; failDelete=id(888);
  let result=await send('run-bulk',{job_id:job,p_actor:other});
  assert.equal(result.status,200,JSON.stringify(result.data));
  const finished=calls.find(c=>c.path.endsWith('/finish_bulk_action'));
  assert.deepEqual(finished.body.p_results.map(r=>r.ok),[true,false],'one failure retains successful result');
  assert.equal(finished.body.p_actor,master,'cannot spoof continuation actor');
  assert.equal(calls.filter(c=>c.options.method==='DELETE').length,2,'Failure reached real per-target deletion branch');
  failDelete=null;people.delete(id(888));
  claim={action:'delete-grownups',targets:[master,adult,kid,id(777)],parameters:{},cursor:0,lease:id(997)};
  actor=adult;
  assert.equal((await send('run-bulk',{job_id:job})).status,200);
  assert(!calls.some(c=>c.options.method==='DELETE'),'Master, actor, wrong-role and missing targets never reach Auth deletion');
  const protectedResults=calls.find(c=>c.path.endsWith('/finish_bulk_action')).body.p_results;
  assert(protectedResults.every(target=>target.ok===false));
  actor=master;
  // Execute every chunk of a large grown-up deletion, not merely its job start.
  const grownupTargets=Array.from({length:251},(_,n)=>id(6000+n));
  for(const target of grownupTargets)people.set(target,{id:target,role:'grownup',is_master:false,handle:'delete_'+target.slice(-12)});
  const deletedTargets=[];
  for(let cursor=0;cursor<grownupTargets.length;cursor+=10){
    claim={action:'delete-grownups',targets:grownupTargets.slice(cursor,cursor+10),parameters:{},cursor,lease:id(8000+cursor)};
    const result=await send('run-bulk',{job_id:job});assert.equal(result.status,200);
    const deletes=calls.filter(call=>call.options.method==='DELETE');
    assert.equal(deletes.length,claim.targets.length,'Every grown-up in the work batch reaches Auth');
    deletedTargets.push(...deletes.map(call=>call.path.split('/').at(-1)));
    assert(calls.find(call=>call.path.endsWith('/finish_bulk_action')).body.p_results.every(target=>target.ok));
  }
  assert.deepEqual(deletedTargets,grownupTargets,'All 251 grown-up deletions execute exactly once across work batches');
  for(const target of grownupTargets)people.delete(target);
  claim={action:'reset-children-progress',targets:[kid],parameters:{},cursor:0,lease:id(998)};
  assert.equal((await send('run-bulk',{job_id:job})).status,200);
  assert(calls.some(c=>c.path.endsWith('/process_bulk_action')));
  assert(!calls.some(c=>c.options.method==='DELETE'),'SQL jobs never delete Auth users');
  claim={busy:true};
  assert.equal((await send('run-bulk',{job_id:job})).status,200);assert.equal(writes().length,0,'Concurrent lease holder prevents duplicate work');
  claim={done:true,results:[{id:kid,ok:true}]};
  assert.equal((await send('run-bulk',{job_id:job})).status,200);
  assert.equal(writes().length,0,'completed retry performs no mutation');
  actor=master;
  for (let n=0;n<1201;n++) people.set(id(4000+n),{id:id(4000+n),role:'grownup',is_master:false,handle:'paged_'+n});
  const roster=await send('list-grownups');
  assert.equal(roster.status,200);
  assert.equal(roster.data.grownups.length,1204,'Grown-up selection roster reads beyond PostgREST max_rows');
  for (let n=0;n<1201;n++) people.delete(id(4000+n));
  for (const [action,fields] of [
    ['edit-profile',{handle:'renamed_master',display_name:'Changed',avatar:'⭐'}],
    ['edit-grownup-profile',{grownup_id:master,handle:'renamed_master',display_name:'Changed',avatar:'⭐'}],
    ['reset-own-progress',{}], ['change-own-password',{password:'replacement'}],
    ['delete-grownup',{grownup_id:master}], ['reset-grownup-progress',{grownup_id:master}], ['reset-grownup-password',{grownup_id:master,password:'replacement'}],
  ]) { assert((await send(action,{...fields,current_password:current})).status>=400,action+' protects master'); assert.equal(writes().length,0); }
  actor=adult;failVerify=true;
  assert((await send('reset-own-progress',{current_password:current})).status>=400); assert.equal(writes().length,0,'verifier transport error fails closed');failVerify=false;
  sessionValid=false;
  assert.equal((await send('reset-own-progress',{current_password:current})).status,401); assert.equal(calls.length,2,'invalid session stops before privileged work');sessionValid=true;
  assert.equal((await send('reset-own-progress',{current_password:current},null)).status,401);assert.equal(calls.length,0);
  actor=kid;assert.equal((await send('reset-own-progress',{current_password:current})).status,403);assert.equal(writes().length,0);
  console.log('PASS risky actions Edge: real handler password/alias matrix, exact actor/bearer binding, benign edits, 1251-target jobs, 251 grown-up deletions, malformed selections, jobs/partial failure/retries, master protection and fail-closed session');
})().catch(error=>{console.error(error);process.exitCode=1;});
