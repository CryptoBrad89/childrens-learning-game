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
    create table auth.identities(user_id uuid references auth.users(id) on delete cascade,provider text,identity_data jsonb,updated_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  for (const filename of fs.readdirSync('supabase/migrations').filter(x => x.endsWith('.sql')).sort()) {
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
  async function caller(id) {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec('set role authenticated');
  }
  const batch = [{ id: event, kind: 'round', payload: {world:'post',letter:'A',misses:0} }];
  async function sync(owner, events) {
    return (await db.query('select public.sync_batch($1,$2) result', [owner, JSON.stringify(events)])).rows[0].result;
  }
  await db.query("select public.edit_grownup_profile($1,'teacher_new','New teacher','⭐')",[adult]);
  await assert.rejects(db.query("select public.edit_grownup_profile($1,'other','Taken','⭐')",[adult]),/unique/);
  await db.exec('reset role');
  assert.equal((await db.query('select email from auth.users where id=$1',[adult])).rows[0].email,'teacher_new@accounts.littlewoof.invalid');
  await db.exec('set role service_role');
  await db.query("update public.profiles set avatar='data:image/jpeg;base64,YWJj' where id=$1",[child]);
  await assert.rejects(db.query("update public.profiles set avatar='data:image/svg+xml;base64,YWJj' where id=$1",[child]),/check constraint/);
  const another='10000000-0000-0000-0000-000000000004';
  await db.exec('reset role');
  await db.query('insert into auth.users(id) values($1)',[another]);
  await db.exec('set role service_role');
  await db.query("select public.provision_account($1,'new_adult','New adult','grownup',$2)",[another,adult]);
  assert.equal((await db.query('select count(*)::int n from public.guardians where child_id=$1',[another])).rows[0].n,0,'Grown-up creation never links a grown-up as a child');
  await caller(child);
  await assert.rejects(db.query("update public.profiles set avatar='⭐' where id=$1",[child]),/permission denied/);
  await assert.rejects(db.query("select public.provision_account($1,'new_adult','New adult','grownup',$2)",[another,child]),/permission denied/);

  assert.deepEqual((await db.query('select handle from public.profiles')).rows, [{ handle: 'child' }]);
  assert.deepEqual(await sync(child, batch), { acknowledged:[event], progress_version:0 });
  await sync(child, batch);
  assert.equal((await db.query('select count(*)::int n from public.operations')).rows[0].n, 1);
  await assert.rejects(sync(child, [{ ...batch[0], payload: {world:'post',letter:'B',misses:0} }]), /conflicts/);
  await assert.rejects(db.query("update public.operations set kind='setting'"), /permission denied/);
  await assert.rejects(db.query('delete from public.operations'), /permission denied/);
  await assert.rejects(db.query("insert into public.profiles values(gen_random_uuid(),'forged','Forged','grownup')"), /permission denied/);
  await assert.rejects(db.query("insert into public.classes(owner_id,name) values($1,'Forbidden')",[child]), /row-level security/);
  await caller(stranger);
  assert.equal((await db.query('select * from public.operations')).rows.length, 0);
  await assert.rejects(sync(child,batch), /access denied/);
  await assert.rejects(db.query('insert into public.guardians values($1,$2)',[stranger,child]), /permission denied/);
  await caller(adult);
  assert.equal((await db.query('select * from public.profiles')).rows.length, 2);
  await sync(child,[{id:'20000000-0000-0000-0000-000000000002',kind:'setting',payload:{field:'volume',value:30}}]);
  await assert.rejects(sync(child,[{id:'20000000-0000-0000-0000-000000000003',kind:'round',payload:{world:'post',letter:'A',misses:-1}}]), /check constraint/);
  await assert.rejects(sync(child,[{id:'20000000-0000-0000-0000-000000000003',kind:'setting',payload:{field:'volume',value:101}}]), /check constraint/);
  await assert.rejects(sync(child,[{id:'20000000-0000-0000-0000-000000000003',kind:'setting',payload:{field:'games',value:['wrong']}}]), /check constraint/);
  const two = [{id:'20000000-0000-0000-0000-000000000004',kind:'round',payload:{world:'silk',letter:'Z',misses:1}}, {...batch[0],payload:{world:'post',letter:'C',misses:0}}];
  await assert.rejects(sync(child,two), /conflicts/);
  assert.equal((await db.query('select count(*)::int n from public.operations')).rows[0].n, 2, 'Failed batch rolls back all writes');
  const cls = (await db.query("insert into public.classes(owner_id,name) values($1,'Owls') returning id",[adult])).rows[0].id;
  await db.exec('reset role; set role service_role');
  await db.query("select public.provision_account($1,'child','Child','child',$2,$3)",[child,adult,cls]);
  await db.query("select public.provision_account($1,'child','Child','child',$2,$3)",[child,adult,cls]);
  assert.equal((await db.query('select count(*)::int n from public.class_children')).rows[0].n,1,'Class provisioning retry is idempotent');
  await assert.rejects(db.query("select public.provision_account($1,'child','Child','child',$2,$3)",[child,stranger,cls]), /Class access denied/);
  assert.equal((await db.query('select count(*)::int n from public.guardians')).rows[0].n,1,'Foreign class provisioning creates no guardian relationship');
  await caller(adult);
  await assert.rejects(db.query('insert into public.class_children values($1,$2)',[cls,stranger]), /row-level security/);
  await caller(stranger);
  assert.equal((await db.query('select * from public.classes')).rows.length, 0);
  assert.equal((await db.query('select * from public.class_children')).rows.length, 0);
  await db.exec('reset role');
  const exposed = (await db.query("select tablename,rowsecurity from pg_tables where schemaname='public'")).rows;
  assert.ok(exposed.every(x => x.rowsecurity));
  await db.exec('reset role; set role service_role');
  await db.query('select public.reset_child_progress($1,$2)',[adult,child]);
  assert.equal((await db.query("select count(*)::int n from public.operations where user_id=$1 and kind='round'",[child])).rows[0].n,0);
  assert.equal((await db.query("select count(*)::int n from public.operations where user_id=$1 and kind='setting'",[child])).rows[0].n,1);
  await assert.rejects(db.query('select public.reset_child_progress($1,$2)',[stranger,child]),/Linked grown-up/);
  await caller(child);
  await sync(child,batch);
  assert.equal((await db.query("select count(*)::int n from public.operations where kind='round'")).rows[0].n,0,'Old offline rounds cannot return after reset');
  await assert.rejects(db.query('select public.reset_child_progress($1,$2)',[adult,child]),/permission denied/);
  await assert.rejects(db.query("select public.edit_grownup_profile($1,'forged','Forged','⭐')",[adult]),/permission denied/);
  await assert.rejects(db.query("insert into public.operations(id,user_id,kind,payload) values(gen_random_uuid(),$1,'round',$2)",[child,JSON.stringify(batch[0].payload)]),/Progress was reset/);
  await db.query('select public.sync_batch($1,$2,1)',[child,JSON.stringify(batch)]);
  assert.equal((await db.query("select count(*)::int n from public.operations where kind='round'")).rows[0].n,1,'New play saves after reset');
  await db.exec('reset role');
  await db.query('delete from auth.users where id=$1',[child]);
  assert.equal((await db.query('select * from public.profiles where id=$1',[child])).rows.length,0);
  assert.equal((await db.query('select * from public.guardians where child_id=$1',[child])).rows.length,0);
  assert.equal((await db.query('select * from public.operations where user_id=$1',[child])).rows.length,0);
  await db.close();
  process.stdout.write('accounts_database: migrations, RLS isolation, profile/Auth transaction + uniqueness, immutable events, retries/conflicts, reset preserves settings + rejects stale round inserts/replays, new generation saves, child denial and full deletion cascade passed\n');
})().catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode=1; });
