/* Execute the actual migration and RLS in PostgreSQL (PGlite).
 * Setup: npm install --prefix .job/db-tools @electric-sql/pglite@0.3.14
 * Run: node tests/accounts_database.cjs
 */
const { PGlite } = require('../.job/db-tools/node_modules/@electric-sql/pglite');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,email text unique,updated_at timestamptz);
    create table auth.sessions(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,created_at timestamptz not null default now(),not_after timestamptz,refreshed_at timestamptz);
    create table auth.identities(user_id uuid references auth.users(id) on delete cascade,provider text,identity_data jsonb,updated_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  for (const filename of fs.readdirSync('supabase/migrations').filter(x => x.endsWith('.sql') && x < '20261019201539_portal_master.sql').sort()) {
    await db.exec(fs.readFileSync(`supabase/migrations/${filename}`, 'utf8'));
  }
  const adult = '10000000-0000-0000-0000-000000000001';
  const child = '10000000-0000-0000-0000-000000000002';
  const stranger = '10000000-0000-0000-0000-000000000003';
  const event = '20000000-0000-0000-0000-000000000001';
  await db.query('insert into auth.users(id) values($1),($2),($3)', [adult, child, stranger]);
  await db.exec('set role service_role');
  await db.query("select public.provision_account($1,'teacher','Teacher','grownup',null)", [adult]);
  await db.query("select public.provision_account($1,'child','Child','child',$2)", [child, adult]);
  await db.query("select public.provision_account($1,'other','Other','grownup',null)", [stranger]);
  await db.exec('reset role');
  await db.query("update public.profiles set handle='test' where id=$1",[adult]);
  await db.exec(fs.readFileSync('supabase/migrations/20261019201539_portal_master.sql','utf8'));
  for (const filename of fs.readdirSync('supabase/migrations').filter(x => x.endsWith('.sql') && x > '20261019201539_portal_master.sql').sort()) await db.exec(fs.readFileSync(`supabase/migrations/${filename}`, 'utf8'));
  await db.exec('set role service_role');
  const snapshot = async () => { await db.exec('reset role'); const value = (await db.query("select jsonb_build_object('profiles',(select jsonb_agg(to_jsonb(p)-'progress_version' order by id) from public.profiles p),'users',(select jsonb_agg(to_jsonb(u) order by id) from auth.users u),'links',(select jsonb_agg(to_jsonb(g) order by adult_id,child_id) from public.guardians g),'settings',(select jsonb_agg(to_jsonb(g)) from public.game_settings g)) as value")).rows[0].value; await db.exec('set role service_role'); return value; };
  for (const id of [adult, child, stranger]) {
    await db.query("insert into public.operations(id,user_id,kind,payload) values(gen_random_uuid(),$1,'round','{\"world\":\"silk\",\"letter\":\"A\",\"misses\":0}')", [id]);
  }
  const before = await snapshot();
  await db.query('select public.reset_own_progress($1)', [adult]);
  await db.query('select public.reset_own_progress($1)', [stranger]);
  await assert.rejects(db.query('select public.reset_own_progress($1)', [child]), /Grown-up required/);
  assert.deepEqual(await snapshot(), before, 'Reset preserves profiles, auth identities, links and settings');
  assert.equal((await db.query("select count(*)::int n from public.operations where kind='round'")).rows[0].n, 1, 'Child rounds stay');
  for (const id of [adult,stranger]) assert.equal((await db.query('select progress_version from public.profiles where id=$1',[id])).rows[0].progress_version,1);
  await db.exec('reset role');
  const sid=(await db.query('insert into auth.sessions(user_id) values($1) returning id',[stranger])).rows[0].id;
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[stranger,JSON.stringify({sub:stranger,session_id:sid})]);
  await db.exec('set role authenticated'); await db.query('select public.session_status(false)');
  await assert.rejects(db.query('select public.reset_own_progress($1)', [adult]), /permission denied/);
  const stale=[{id:crypto.randomUUID(),kind:'round',payload:{world:'silk',letter:'B',misses:0}}];
  await db.query('select public.sync_batch($1,$2,0)',[stranger,JSON.stringify(stale)]);
  assert.equal((await db.query('select count(*)::int n from public.operations where user_id=$1',[stranger])).rows[0].n,0,'Old offline rounds do not reappear');
  await db.query('select public.sync_batch($1,$2,1)',[stranger,JSON.stringify([{...stale[0],id:crypto.randomUUID()}])]);
  assert.equal((await db.query('select count(*)::int n from public.operations where user_id=$1',[stranger])).rows[0].n,1,'Fresh play saves after reset');
  await db.close();console.log('PASS call list database: master and regular self-reset, child denial, RPC grants, profile/auth/settings/link preservation, stale offline rounds rejected, fresh play accepted');
})().catch(e=>{console.error(e);process.exitCode=1;});
