// Historical PGlite regression fixture. Current pgcrypto/Auth guards and jobs are exercised
// against real local PostgreSQL by risky_actions_database.cjs.
const {PGlite}=require('../.job/db-tools/node_modules/@electric-sql/pglite');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
  const db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create table auth.users(id uuid primary key,email text unique,updated_at timestamptz);
    create table auth.identities(user_id uuid references auth.users(id) on delete cascade,provider text,identity_data jsonb,updated_at timestamptz);
    create table auth.sessions(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),created_at timestamptz default now(),updated_at timestamptz default now(),not_after timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    grant usage on schema auth to authenticated;grant execute on function auth.uid(),auth.jwt() to authenticated;`);
  const files=fs.readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql') && x < '20261021045745').sort();
  for(const f of files.filter(x=>x<'20261019201539'))await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
  const a='10000000-0000-0000-0000-000000000001',b='10000000-0000-0000-0000-000000000002',c='10000000-0000-0000-0000-000000000003',u='10000000-0000-0000-0000-000000000004';
  await db.query('insert into auth.users(id) values($1),($2),($3),($4)',[a,b,c,u]);
  await db.exec('set role service_role');
  await db.query("select public.provision_account($1,'test','Master','grownup',null)",[a]);
  await db.query("select public.provision_account($1,'sally','Sally','child',$2)",[b,a]);
  await db.query("select public.provision_account($1,'jane','Jane','child',$2)",[c,a]);
  await db.query("select public.provision_account($1,'other','Other','grownup',null)",[u]);
  await db.query("insert into public.operations(id,user_id,kind,payload) values(gen_random_uuid(),$1,'setting',$2)",[b,JSON.stringify({field:'volume',value:35})]);
  await db.exec('reset role');
  for(const f of files.filter(x=>x>='20261019201539'))await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
  const run=(q,args=[])=>db.query(q,args);
  await db.exec('set role service_role');
  // a is master; u is an unlinked regular grown-up; b/c are master's kids.
  await assert.rejects(run('select public.patch_game_settings($1,$2)',[u,'{}']),/Master/);
  await run('select public.patch_child_settings($1,$2,$3)',[a,[b,c],'{"volume":25}']);
  await assert.rejects(run('select public.patch_child_settings($1,$2,$3)',[u,[b],'{}']),/Linked/);
  await assert.rejects(run("select public.edit_child_profile($1,$2,'denied','Denied')",[u,b]),/Linked/);
  await assert.rejects(run('select public.reset_child_progress($1,$2)',[u,b]),/Linked/);
  await assert.rejects(run('select public.unlink_child($1,$2,$3)',[u,b,a]),/Linked/);
  await assert.rejects(run('select public.transfer_children($1,$2,$3,$4)',[u,[b],a,u]),/Master/);
  await assert.rejects(run('select public.reset_grownup_progress($1,$2)',[u,a]),/Master/);
  await assert.rejects(run('select public.reset_grownup_progress($1,$2)',[a,a]),/Master/);
  await run('select public.reset_grownup_progress($1,$2)',[a,u]);
  const transfer=async(ids,from,to)=>(await run('select public.transfer_children($1,$2,$3,$4) r',[a,ids,from,to])).rows[0].r;
  let result=await transfer([b],a,u);assert.equal(result.results[0].ok,true);
  // Master still manages b without being linked. All original single-ID SQL contracts work.
  await run("select public.edit_child_profile($1,$2,'renamed','Renamed')",[a,b]);
  await run('select public.reset_child_progress($1,$2)',[a,b]);
  await run('select public.patch_child_settings($1,$2,$3)',[a,[b],'{"calm":true}']);
  await run("select public.edit_child_profile($1,$2,'renamed_again','Renamed again')",[u,b]);
  await run('select public.reset_child_progress($1,$2)',[u,b]);
  await run('select public.patch_child_settings($1,$2,$3)',[u,[b],'{"volume":50}']);
  result=await transfer([b,c],u,a);
  assert.deepEqual(result.results.map(r=>r.ok),[true,false]);assert.equal(result.results[1].reason,'not-linked-to-source');
  // Unrelated shared links survive a transfer; destination can already be linked.
  await run('insert into public.guardians(adult_id,child_id) values($1,$2)',[u,b]);
  await transfer([b],a,u);assert.equal((await run('select * from public.guardians where child_id=$1',[b])).rows.length,1);
  const unlink=(actor,child,adult)=>run('select public.unlink_child($1,$2,$3) r',[actor,child,adult]);
  result=(await unlink(u,b,u)).rows[0].r;assert.equal(result.rehomed,true);
  result=(await unlink(a,b,a)).rows[0].r;assert.equal(result.kept_with_master,true);
  for(const ids of [[],Array(101).fill(b),[b,b]])await assert.rejects(transfer(ids,a,u));
  await assert.rejects(transfer([b],a,a),/different/);
  // RLS: master sees all kids/assignments; regular sees only its own linked kids.
  await db.exec('reset role');
  const login=async id=>{
    await db.exec('reset role');const sid=(await run('insert into auth.sessions(user_id) values($1) returning id',[id])).rows[0].id;
    await run("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[id,JSON.stringify({sub:id,session_id:sid})]);
    await db.exec('set role authenticated');await run('select public.session_status(false)');
  };
  await login(a);assert.equal((await run("select * from public.profiles where role='child'")).rows.length,2);
  assert.equal((await run('select * from public.guardians')).rows.length,2);
  await login(u);assert.equal((await run("select * from public.profiles where role='child'")).rows.length,0);
  for(const q of ['select public.unlink_child($1,$2,$1)','select public.reset_child_progress($1,$2)'])await assert.rejects(run(q,[a,b]),/permission denied/);
  await db.close();console.log('PASS portal review database: master bypasses, regular linked-only mutations/reads, defaults ownership, atomic transfer partial skips, shared links, last-link rehome, master reset protection, RPC privilege boundaries');
})().catch(e=>{console.error(e);process.exitCode=1;});
