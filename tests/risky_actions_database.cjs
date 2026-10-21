'use strict';
// Requires local PostgreSQL + pgcrypto (Debian: postgresql postgresql-contrib).
// Creates/drops a uniquely named database through the local postgres Unix socket.
// No hosted URL or existing account credentials are read.
const assert=require('node:assert/strict'),fs=require('node:fs'),{spawnSync}=require('node:child_process');
const database='risky_actions_'+process.pid+'_'+Date.now();
const id=n=>'31000000-0000-0000-0000-'+String(n).padStart(12,'0');
const master=id(1),adult=id(2),other=id(3),stranger=id(4),kid=id(100),missing=id(9999);
const q=value=>value===null?'NULL':"'"+String(value).replaceAll("'","''")+"'";
const array=values=>'ARRAY['+values.map(q).join(',')+']::uuid[]';
const json=value=>q(JSON.stringify(value))+'::jsonb';
function sql(source,db=database) {
 const result=spawnSync('sudo',['-u','postgres','psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-d',db],{input:source,encoding:'utf8',maxBuffer:8*1024*1024});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error(result.stderr.trim()||'psql failed');
 return result.stdout.trim();
}
function scalar(source,as='postgres',who=null,sid=null){
 const claims=who?`set request.jwt.claim.sub=${q(who)};set request.jwt.claims=${q(JSON.stringify({sub:who,session_id:sid}))};`:'';
 return sql(`set role ${as};${claims}${source}`);
}
const value=(source,as,who,sid)=>{const result=scalar(source,as,who,sid);return result==='t'?true:result==='f'?false:JSON.parse(result);};
const deny=(source,as='authenticated',who=adult,sid=sessions.get(adult))=>assert.throws(()=>scalar(source,as,who,sid),/ERROR:/);
const sessions=new Map();
function start(action,targets,parameters={},password='adult-password',who=adult,sid=sessions.get(who)) {
 return scalar(`select public.start_bulk_action(${q(action)},${array(targets)},${json(parameters)},${q(password)});`,'authenticated',who,sid);
}
function claim(job,who=adult,sid=sessions.get(who)) {return value(`select public.claim_bulk_action(${q(job)});`,'authenticated',who,sid);}
function processJob(job,who=adult){
 let result;
 for(let iteration=0;iteration<1000;iteration++){
  const batch=claim(job,who);if(batch.done)return batch;
  assert(!batch.busy);assert(batch.targets.length<=10,'Work chunks never cap complete selection');
  result=value(`select public.process_bulk_action(${q(job)},${q(who)},${q(batch.lease)});`,'service_role');
  if(result.done)return result;
 }
 throw Error('Job failed to finish');
}
let created=false;
try {
 sql(`create database ${database};`,'postgres');created=true;
 sql(`do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls;end if;
  if not exists(select 1 from pg_roles where rolname='supabase_auth_admin') then create role supabase_auth_admin;end if;
 end $$;
 create schema auth;
 create table auth.users(id uuid primary key,email text unique,encrypted_password text,updated_at timestamptz);
 create table auth.identities(user_id uuid references auth.users(id) on delete cascade,provider text,identity_data jsonb,updated_at timestamptz);
 create table auth.sessions(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),created_at timestamptz default now(),updated_at timestamptz default now(),not_after timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 grant usage on schema auth to authenticated,service_role,supabase_auth_admin;
 grant execute on function auth.uid(),auth.jwt() to authenticated,service_role;
 grant select,update on auth.users to supabase_auth_admin;
 `);
 const files=fs.readdirSync('supabase/migrations').filter(file=>file.endsWith('.sql')).sort();
 for(const file of files.filter(file=>file<'20261019201539'))sql(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 sql(`insert into auth.users(id,email) values(${q(master)},'test@fixture.invalid'),(${q(adult)},'adult@fixture.invalid'),(${q(other)},'other@fixture.invalid'),(${q(stranger)},'stranger@fixture.invalid');
 select public.provision_account(${q(master)},'test','Disposable master','grownup',null);
 select public.provision_account(${q(adult)},'fixture_adult','Adult','grownup',null);
 select public.provision_account(${q(other)},'fixture_other','Other','grownup',null);
 select public.provision_account(${q(stranger)},'fixture_stranger','Stranger','grownup',null);`);
 for(const file of files.filter(file=>file>='20261019201539'))sql(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 // Seed passwords only on local fixtures. Master must be seeded before credential guards.
 sql(`alter table auth.users disable trigger guard_portal_credentials;
 update auth.users set encrypted_password=extensions.crypt(case id when ${q(master)}::uuid then 'master-password' when ${q(other)}::uuid then 'other-password' else 'adult-password' end,extensions.gen_salt('bf',4));
 alter table auth.users enable trigger guard_portal_credentials;`);
 const kids=Array.from({length:251},(_,n)=>id(100+n));
 sql(`insert into auth.users(id,email,encrypted_password) select target,target::text||'@fixture.invalid',extensions.crypt('kid-password',extensions.gen_salt('bf',4)) from unnest(${array(kids)}) target;
 insert into public.profiles(id,handle,display_name,role) select target,'kid_'||right(target::text,12),'Kid','child' from unnest(${array(kids)}) target;
 insert into public.guardians(adult_id,child_id) select ${q(adult)}::uuid,target from unnest(${array(kids)}) target;`);
 for(const who of [master,adult,other,stranger,kid])sessions.set(who,sql(`insert into auth.sessions(user_id) values(${q(who)}) returning id;`));
 const snapshot=()=>sql(`select jsonb_build_object('sessions',(select jsonb_agg(to_jsonb(s) order by id) from auth.sessions s),'limits',(select jsonb_agg(to_jsonb(l) order by session_id) from private.session_limits l));`);
 const masterSnapshot=sql(`select jsonb_build_object('profile',(select to_jsonb(p) from public.profiles p where id=${q(master)}),'auth',(select to_jsonb(u) from auth.users u where id=${q(master)}));`);
 const sessionBefore=snapshot();
 for(const [password,expected] of [['adult-password',true],['wrong',false],['other-password',false],['',false],[null,false]])assert.equal(value(`select public.verify_risky_password(${q(password)});`,'authenticated',adult,sessions.get(adult)),expected);
 assert.equal(snapshot(),sessionBefore,'Verification changes no session or timeout');
 assert.equal(value("select public.verify_risky_password('kid-password');",'authenticated',kid,sessions.get(kid)),false,'Kids cannot authorize grown-up actions');
 const replayKey=id(8000);
 const replayStatement=(targets,parameters,password)=>`select public.start_bulk_action('reset-children-progress',${array(targets)},${json(parameters)},${q(password)},${q(replayKey)});`;
 const replayJob=scalar(replayStatement([kid],{},'adult-password'),'authenticated',adult,sessions.get(adult));
 assert.equal(scalar(replayStatement([kid],{},null),'authenticated',adult,sessions.get(adult)),replayJob,'Exact retry resumes verified job without retaining password');
 deny(replayStatement([kids[1]],{},null));
 deny(replayStatement([kid],{reset:false},null));
 const initialCount=sql('select count(*) from private.bulk_actions;');
 deny(`select public.start_bulk_action('reset-children-progress',${array([kid])},'{}',NULL,${q(id(8001))});`);
 assert.equal(sql('select count(*) from private.bulk_actions;'),initialCount,'First attempt with missing proof creates no replay record');
 const beforeJobs=sql('select count(*) from private.bulk_actions;');
 const beforeProfiles=sql('select jsonb_agg(to_jsonb(p) order by id) from public.profiles p;');
 for(const password of [null,'wrong','other-password'])assert.throws(()=>start('reset-children-progress',kids,{},password),/current password did not match/);
 assert.equal(sql('select count(*) from private.bulk_actions;'),beforeJobs);
 assert.equal(sql('select jsonb_agg(to_jsonb(p) order by id) from public.profiles p;'),beforeProfiles,'Wrong password mutates nothing');
 for(const targets of [[],[kid,kid],[null]])assert.throws(()=>start('reset-children-progress',targets),/Choose distinct accounts/);
 deny(`select public.start_bulk_action('reset-children-progress',ARRAY['bad']::uuid[],'{}','adult-password');`);
 assert.throws(()=>start('reset-grownups-progress',[other]),/Master required/);
 assert.throws(()=>start('patch-child-settings',kids,{patch:{calm:true}},null,stranger),/Linked grown-up/);
 // Exercise the actual legacy SQL array functions above 100 too; batching must
 // not conceal a forgotten database-level selection cap.
 assert.equal(value(`select public.patch_child_settings(${q(master)},${array(kids)},'{"calm":true}');`,'service_role').children.length,251);
 assert.equal(value(`select public.transfer_children(${q(master)},${array(kids)},${q(adult)},${q(other)});`,'service_role').results.length,251);
 assert.equal(value(`select public.transfer_children(${q(master)},${array(kids)},${q(other)},${q(adult)});`,'service_role').results.length,251);
 const settingsJob=start('patch-child-settings',kids,{patch:{calm:true}},null);
 assert.equal(processJob(settingsJob).results.length,kids.length);
 assert.equal(sql("select count(*) from public.child_settings where overrides->>'calm'='true';"),'251');
 const resetJob=start('reset-children-progress',kids);
 const resetResult=processJob(resetJob);assert.equal(resetResult.results.length,251);assert(resetResult.results.every(row=>row.ok));
 assert.equal(sql('select min(progress_version) from public.profiles where role=\'child\';'),'1');
 const firstBatchJob=start('reset-children-progress',[kid]);
 const first=claim(firstBatchJob);assert.equal(claim(firstBatchJob).busy,true,'Concurrent claim cannot repeat batch');
 value(`select public.process_bulk_action(${q(firstBatchJob)},${q(adult)},${q(first.lease)});`,'service_role');
 // Simulate a committed response lost to caller, then new gameplay before retry.
 sql(`insert into public.operations(id,user_id,kind,payload,progress_version) values(gen_random_uuid(),${q(kid)},'round','{"world":"post","letter":"A","misses":0}',2);`);
 assert.equal(claim(firstBatchJob).done,true);
 deny(`select public.process_bulk_action(${q(firstBatchJob)},${q(adult)},${q(first.lease)});`,'service_role');
 assert.equal(sql(`select count(*) from public.operations where user_id=${q(kid)} and kind='round';`),'1','Lost-response retry preserves new progress');
 const scoped=start('reset-children-progress',[kid]);
 deny(`select public.claim_bulk_action(${q(scoped)});`,'authenticated',other,sessions.get(other));
 const otherSession=sql(`insert into auth.sessions(user_id) values(${q(adult)}) returning id;`);
 deny(`select public.claim_bulk_action(${q(scoped)});`,'authenticated',adult,otherSession);
 const partial=start('reset-children-progress',[kid,missing]);
 const partialResult=processJob(partial);assert.deepEqual(partialResult.results.map(row=>row.ok),[true,false]);
 const transfer=start('transfer-children',kids,{source_id:adult,destination_id:other},'master-password',master);
 assert.equal(processJob(transfer,master).results.length,251);
 assert.equal(sql(`select count(*) from public.guardians where adult_id=${q(other)};`),'251');
 // Grown-up progress uses the same unlimited job contract as child progress.
 const grownups=Array.from({length:251},(_,n)=>id(5000+n));
 sql(`insert into auth.users(id,email) select target,target::text||'@fixture.invalid' from unnest(${array(grownups)}) target;
 insert into public.profiles(id,handle,display_name,role) select target,'adult_'||right(target::text,12),'Disposable grown-up','grownup' from unnest(${array(grownups)}) target;`);
 const grownupReset=start('reset-grownups-progress',grownups,{},'master-password',master);
 const grownupResetResults=processJob(grownupReset,master);
 assert.equal(grownupResetResults.results.length,251);
 assert(grownupResetResults.results.every(row=>row.ok),'All 251 grown-up resets complete');
 assert.equal(sql(`select count(*) from public.profiles where id=any(${array(grownups)}) and progress_version=1;`),'251');
 const protectedGrownupJob=start('reset-grownups-progress',[grownups[0],master],{},'master-password',master);
 assert.deepEqual(processJob(protectedGrownupJob,master).results.map(row=>row.ok),[true,false],'Bulk grown-up reset preserves master while completing valid targets');
 // A harmless edit based on an old handle must not revert a concurrent verified rename.
 const initialHandle=sql(`select handle from public.profiles where id=${q(kid)};`);
 scalar(`select public.edit_confirmed_profile(${q(master)},${q(kid)},${q(initialHandle)},'renamed_kid','Kid renamed',NULL);`,'service_role');
 const profileAfterRename=sql(`select to_jsonb(p) from public.profiles p where id=${q(kid)};`);
 deny(`select public.edit_confirmed_profile(${q(master)},${q(kid)},${q(initialHandle)},${q(initialHandle)},'Stale display','⭐');`,'service_role');
 assert.equal(sql(`select to_jsonb(p) from public.profiles p where id=${q(kid)};`),profileAfterRename,'Stale profile submission has no partial display/avatar/username mutation');
 deny(`select public.edit_confirmed_profile(${q(master)},${q(master)},'test','renamed_master','Changed',NULL);`,'service_role');
 deny(`select public.edit_confirmed_profile(${q(master)},${q(kid)},'renamed_kid','bypass','Bypass',NULL);`);
 // Direct setters and old SQL APIs remain inaccessible even with a forged actor UUID.
 for(const statement of [
  `select public.set_account_password(${q(master)},${q(other)},'replacement');`,
  `select public.reset_child_progress(${q(master)},${q(kid)});`,
  `select public.reset_own_progress(${q(master)});`,
  `select public.reset_grownup_progress(${q(master)},${q(other)});`,
  `select public.unlink_child(${q(master)},${q(kid)},${q(other)});`,
  `select public.edit_child_profile(${q(master)},${q(kid)},'changed','Changed');`,
  `select public.edit_grownup_profile(${q(other)},'changed','Changed','⭐');`,
  `update public.profiles set handle='changed' where id=${q(adult)};`,
  `delete from public.operations where user_id=${q(kid)};`,
  'select * from private.bulk_actions;',
 ])deny(statement);
 const sessionsBeforeSetter=snapshot();
 scalar(`select public.set_account_password(${q(other)},${q(kid)},'replacement');`,'service_role');
 assert.equal(snapshot(),sessionsBeforeSetter,'Password setter preserves all existing sessions and deadlines');
 assert.equal(value(`select extensions.crypt('replacement',encrypted_password)=encrypted_password from auth.users where id=${q(kid)};`),true);
 deny(`select public.set_account_password(${q(stranger)},${q(kid)},'replacement');`,'service_role');
 deny(`select public.set_account_password(${q(master)},${q(master)},'replacement');`,'service_role');
 // Auth roles need profile read visibility just as Supabase Auth has on hosted projects.
 sql('grant select on public.profiles to supabase_auth_admin;');
 for(const update of [`encrypted_password=extensions.crypt('bypass',extensions.gen_salt('bf',4))`,"email='bypass@fixture.invalid'"]){
  // Precompute crypt as owner, since Auth need not execute pgcrypto itself.
  const set=update.startsWith('encrypted_password')?'encrypted_password='+q(sql("select extensions.crypt('bypass',extensions.gen_salt('bf',4));")):update;
  deny(`update auth.users set ${set} where id=${q(adult)};`,'supabase_auth_admin');
 }
 scalar(`update auth.users set updated_at=now() where id=${q(adult)};`,'supabase_auth_admin');
 deny(`update public.profiles set display_name='Changed' where id=${q(master)};`,'postgres');
 deny(`update auth.users set encrypted_password='changed' where id=${q(master)};`,'postgres');
 deny(`select public.reset_own_progress(${q(master)});`,'service_role');
 assert.equal(sql(`select jsonb_build_object('profile',(select to_jsonb(p) from public.profiles p where id=${q(master)}),'auth',(select to_jsonb(u) from auth.users u where id=${q(master)}));`),masterSnapshot,'Disposable master profile and credentials remained byte-for-byte unchanged');
 console.log('PASS risky actions PostgreSQL: real bcrypt, all migrations, 251-target settings/child-reset/grownup-reset/transfer jobs, failed passwords, session invariance, role/session scope, leases and lost-response retries, partial failures, SQL/Auth bypass denial and master protection');
} finally {
 if(created)sql(`drop database ${database} with (force);`,'postgres');
}
