// Historical PGlite regression fixture. Current pgcrypto/Auth guards and jobs are exercised
// against real local PostgreSQL by risky_actions_database.cjs.
const {PGlite} = require('../.job/db-tools/node_modules/@electric-sql/pglite');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async()=>{
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,email text unique,updated_at timestamptz);
    create table auth.identities(user_id uuid references auth.users(id) on delete cascade,provider text,identity_data jsonb,updated_at timestamptz);
    create table auth.sessions(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,created_at timestamptz not null default now(),not_after timestamptz,refreshed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  const migrations=fs.readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql') && x < '20261021045745').sort();
  for(const f of migrations.filter(x=>x<'20261019201539_portal_master.sql')) await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
  const adult='10000000-0000-0000-0000-000000000001',child='10000000-0000-0000-0000-000000000002';
  await db.query('insert into auth.users(id) values($1),($2)',[adult,child]);
  await db.query("select public.provision_account($1,'test','Test','grownup',null)",[adult]);
  await db.query("select public.provision_account($1,'session_child','Child','child',$2)",[child,adult]);
  // Existing sessions are capped at migration time without granting a fresh lease.
  const legacy=(await db.query("insert into auth.sessions(user_id,created_at) values($1,now()-interval '31 minutes') returning id",[adult])).rows[0].id;
  for(const f of migrations.filter(x=>x>='20261019201539_portal_master.sql')) await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
  async function caller(user,sid){
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[user,JSON.stringify({sub:user,session_id:sid})]);
    await db.exec('set role authenticated');
  }
  async function session(user,age='0 minutes',cap=null){
    await db.exec('reset role');
    return (await db.query('insert into auth.sessions(user_id,created_at,not_after) values($1,now()-$2::interval,case when $3::text is null then null else now()+$3::interval end) returning *',[user,age,cap])).rows[0];
  }
  async function status(touch=false){return (await db.query('select public.session_status($1) result',[touch])).rows[0].result;}
  await caller(adult,legacy);
  await assert.rejects(status(true),/Signed out for safety/);
  assert.equal((await db.query('select * from public.profiles')).rows.length,0,'Legacy adult cannot obtain a fresh inactivity lease');

  const kid=await session(child);
  await caller(child,kid.id);
  const start=await status();
  assert.equal(start.role,'child');
  assert.ok(Math.abs(start.expires_at-start.server_now-21600)<1);
  assert.equal((await status(true)).expires_at,start.expires_at,'Child activity never extends six-hour cap');
  await db.exec('reset role');
  await db.query('update auth.sessions set refreshed_at=now() where id=$1',[kid.id]);
  await caller(child,kid.id);
  assert.equal((await status()).expires_at,start.expires_at,'Auth refresh does not extend child deadline');
  await db.query("select public.sync_batch($1,$2)",[child,JSON.stringify([{id:'20000000-0000-0000-0000-000000000001',kind:'round',payload:{world:'post',letter:'A',misses:0}}])]);

  // Pin now() within a transaction to test the exact boundary, not an approximation.
  await db.exec('reset role; begin');
  await db.query('update auth.sessions set not_after=now() where id=$1',[kid.id]);
  await caller(child,kid.id);
  assert.equal((await db.query('select private.session_valid() valid')).rows[0].valid,false);
  assert.equal((await db.query('select * from public.operations')).rows.length,0,'Stale JWT cannot read progress');
  await db.exec('reset role; commit');
  await caller(child,kid.id);
  await assert.rejects(status(true),/Signed out for safety/);
  await assert.rejects(db.query('select public.sync_batch($1,$2)',[child,'[]']),/access denied/);
  await assert.rejects(db.query("insert into public.operations(id,user_id,kind,payload) values(gen_random_uuid(),$1,'round',$2)",[child,JSON.stringify({world:'post',letter:'B',misses:0})]),/row-level security/);

  // A client cannot evade the child ceiling by changing the native deadline.
  const oldKid=await session(child,'6 hours');
  await db.query("update auth.sessions set not_after=now()+interval '1 day',refreshed_at=now() where id=$1",[oldKid.id]);
  await caller(child,oldKid.id);
  await assert.rejects(status(true),/Signed out for safety/);

  const grownup=await session(adult,'20 minutes');
  await caller(adult,grownup.id);
  const initial=await status();
  assert.ok(initial.expires_at-initial.server_now<601);
  const touched=await status(true);
  assert.ok(Math.abs(touched.expires_at-touched.server_now-1800)<1,'Adult activity slides idle deadline');
  assert.equal((await status()).expires_at,touched.expires_at,'Passive status polling does not count as activity');
  await db.exec('reset role');
  await db.query('update auth.sessions set refreshed_at=now() where id=$1',[grownup.id]);
  await caller(adult,grownup.id);
  assert.equal((await status()).expires_at,touched.expires_at,'Background token refresh is not adult activity');

  // Operator-specified shorter Auth caps survive the application heartbeat.
  const capped=await session(adult,'0 minutes','5 minutes');
  await caller(adult,capped.id);
  const strict=await status(true);
  assert.ok(strict.expires_at-strict.server_now<301);
  await assert.rejects(db.query('select * from auth.sessions'),/permission denied/);
  await assert.rejects(db.query('update private.session_limits set hard_deadline=null'),/permission denied/);

  await db.exec('reset role; begin');
  await db.query('update auth.sessions set not_after=now() where id=$1',[grownup.id]);
  await caller(adult,grownup.id);
  assert.equal((await db.query('select private.session_valid() valid')).rows[0].valid,false,'Adult expires at exact inactivity deadline');
  await db.exec('reset role; commit');
  await caller(adult,grownup.id);
  await assert.rejects(status(true),/Signed out for safety/);
  for(const table of ['profiles','guardians','operations','classes','class_children','game_settings','child_settings']) {
    assert.equal((await db.query('select * from public.'+table)).rows.length,0,table+' denies expired authenticated session');
  }
  await assert.rejects(db.query("insert into public.classes(owner_id,name) values($1,'Expired')",[adult]),/row-level security/);

  const revoked=await session(child);
  await db.query('delete from auth.sessions where id=$1',[revoked.id]);
  await caller(child,revoked.id);
  await assert.rejects(status(),/Signed out for safety/);
  const alive=await session(child);
  await caller(adult,alive.id);
  await assert.rejects(status(),/Signed out for safety/,'JWT subject must own its session');
  await caller(child,undefined);
  await assert.rejects(status(),/Signed out for safety/,'JWT without session ID is rejected');
  await db.exec('reset role; set role anon');
  await assert.rejects(status(),/permission denied/);
  assert.equal((await db.query('select * from public.game_settings')).rows.length,1,'Guest can still read game defaults');
  await db.close();
  console.log('PASS session_limits_database: native caps and legacy backfill, child fixed six hours, adult thirty minutes of activity, strict caps, refresh isolation, exact expiry, no resurrection, RLS/RPC and revoked-session denial, anonymous defaults');
})().catch(error=>{console.error(error);process.exitCode=1;});
