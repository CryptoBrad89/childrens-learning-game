/* Exercise the real Edge handler with transport doubles (no admin credentials locally).
 * npm install --prefix .job/db-tools typescript@5.9.3
 * node tests/accounts_database_edge.cjs
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../.job/db-tools/node_modules/typescript');
let handler, calls = [], transport, sessionResult = true;
const id = '10000000-0000-0000-0000-000000000001';
const source = ts.transpileModule(fs.readFileSync('supabase/functions/accounts/index.ts','utf8'), { compilerOptions:{ target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS } }).outputText;
vm.runInNewContext(source, {
  exports:{}, Request, Response,
  Deno:{env:{get:name => ({SUPABASE_URL:'https://project.invalid',SUPABASE_ANON_KEY:'public-test',SUPABASE_SERVICE_ROLE_KEY:'private-test'})[name]}, serve: fn => { handler=fn; }},
  fetch:async (url,options) => {
    calls.push({url,options});
    if(url.endsWith('/rpc/session_status')) {
      assert.equal(options.headers.apikey,'public-test');
      assert.equal(options.headers.Authorization,calls.at(-2).options.headers.Authorization,'Session check uses the same caller bearer as Auth validation');
      assert.deepEqual(JSON.parse(options.body),{p_touch:false});
      if(sessionResult === 'network') throw Error('Session validation unavailable');
      return sessionResult ? ok({expires_at:Date.now()/1000+1800,role:'grownup'}) : new Response('{}',{status:401});
    }
    return transport(url,options);
  },
});
const ok = data => new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
const request = (body,token) => new Request('https://project.invalid/functions/v1/accounts',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
(async () => {
  transport = (url,options) => {
    if (url.endsWith('/auth/v1/user')) return ok({id});
    if (url.endsWith('/auth/v1/admin/users')) {
      const body=JSON.parse(options.body);
      assert.equal(body.email,'teacher@accounts.littlewoof.invalid');
      assert.equal(body.password,' 1234 '); // Six characters, preserved verbatim.
      assert.equal(body.email_confirm,true);
      assert.deepEqual(body.app_metadata,{account_role:'grownup',creator_id:id});
      return ok({id});
    }
    if (url.endsWith('/rpc/provision_account')) return ok(null);
    if (url.includes('/rest/v1/profiles?')) return ok([{id,handle:'teacher',role:'grownup',is_master:true}]);
    throw Error(`Unexpected ${url}`);
  };
  const registered=await handler(request({action:'register',handle:' Teacher ',display_name:'Teacher',password:' 1234 '},'valid-token'));
  assert.equal(registered.status,200);
  assert.equal(JSON.stringify(await registered.json()).includes('private-test'),false);
  const count=calls.length;
  const denied=await handler(request({action:'create-child',handle:'child',password:'123456',display_name:'Child'}));
  assert.equal(denied.status,401);
  assert.equal(calls.length,count);
  assert.equal((await handler(request({action:'register',handle:'x',password:'123456',display_name:'Name'},'valid-token'))).status,400);
  assert.equal((await handler(request({action:'register',handle:'valid',password:'12345',display_name:'Name'},'valid-token'))).status,400);
  calls=[];
  transport=(url) => {
    if (url.endsWith('/auth/v1/user')) return ok({id});
    if (url.includes('/profiles?')) return ok([{id}]);
    if (url.includes('/guardians?')) return ok([]);
    throw Error('Password reset must not reach Auth admin without guardian proof');
  };
  const reset=await handler(request({action:'reset-child-password',child_id:id,password:'123456'},'valid-token'));
  assert.equal(reset.status,403);
  assert.equal(calls.some(x => x.url.includes('/admin/users/')),false);
  calls=[];
  transport=(url) => {
    if (url.endsWith('/auth/v1/user')) return ok({id});
    if (url.includes('role=eq.grownup')) return ok([{id,is_master:true}]);
    if (url.endsWith('/auth/v1/admin/users')) return ok({id});
    if (url.endsWith('/rpc/provision_account')) return new Response('{}',{status:400});
    if (url.includes('/profiles?')) return ok([]);
    if (url.endsWith(`/auth/v1/admin/users/${id}`)) return ok(null);
    throw Error(`Unexpected ${url}`);
  };
  assert.equal((await handler(request({action:'register',handle:'valid',password:'123456',display_name:'Name'},'valid-token'))).status,400);
  assert.ok(calls.some(x=>x.options.method==='DELETE'), 'Provisioning failure cleans orphan Auth user');
  calls=[];
  transport=(url) => {
    if (url.endsWith('/auth/v1/user')) return ok({id});
    if (url.includes('role=eq.grownup')) return ok([{id,is_master:true}]);
    if (url.endsWith('/auth/v1/admin/users')) return new Response('{}',{status:422});
    if (url.includes('/auth/v1/token?')) return ok({user:{id,app_metadata:{account_role:'grownup',creator_id:id}}});
    if (url.endsWith('/rpc/provision_account')) return ok(null);
    if (url.includes('/profiles?')) return ok([{id,role:'grownup'}]);
    throw Error(`Unexpected ${url}`);
  };
  assert.equal((await handler(request({action:'register',handle:'valid',password:'123456',display_name:'Name'},'valid-token'))).status,200,'Interrupted provisioning recovers by password');
  for (const action of ['register','create-grownup','create-child']) {
    calls=[];
    assert.equal((await handler(request({action,handle:'valid',password:'123456',display_name:'Name'}))).status,401);
    assert.equal(calls.length,0,'Anonymous requests never reach Auth admin');
    transport=url=>url.endsWith('/auth/v1/user')?ok({id}):ok([]);
    assert.equal((await handler(request({action,handle:'valid',password:'123456',display_name:'Name'},'child-token'))).status,403);
    assert.equal(calls.some(x=>x.url.endsWith('/auth/v1/admin/users')),false);
  }
  let savedAvatar;
  transport=(url,options)=>{
    if(url.endsWith('/auth/v1/user'))return ok({id});
    if(url.endsWith('/auth/v1/admin/users'))return ok({id});
    if(url.endsWith('/rpc/provision_account'))return ok(null);
    if(url.includes('/profiles?')&&options.method==='PATCH'){savedAvatar=JSON.parse(options.body).avatar;return ok(null);}
    if(url.includes('/profiles?'))return ok([{id,role:'grownup'}]);
    throw Error(url);
  };
  for(const avatar of ['🐱','data:image/jpeg;base64,YWJj']) {
    assert.equal((await handler(request({action:'create-child',handle:'kid',display_name:'Kid',password:'123456',avatar},'valid-token'))).status,200);
    assert.equal(savedAvatar,avatar);
  }
  for(const avatar of ['data:image/svg+xml;base64,YWJj','javascript:alert(1)','x'.repeat(150001)]) {
    calls=[];
    assert.equal((await handler(request({action:'create-child',handle:'kid',display_name:'Kid',password:'123456',avatar},'valid-token'))).status,400);
    assert.equal(calls.some(x=>x.url.endsWith('/auth/v1/admin/users')),false);
  }
  const target='10000000-0000-0000-0000-000000000002';
  for (const role of ['master','regular','child','anonymous']) for(const action of ['create-grownup','register','delete-grownup','reset-grownup-password']) {
    calls=[];
    transport=(url,options)=>{
      if(url.endsWith('/auth/v1/user')) return ok({id});
      if(url.includes(`id=eq.${id}&role=eq.grownup`)) return ok(role==='child'?[]:[{id,is_master:role==='master'}]);
      if(url.includes(`id=eq.${target}&role=eq.grownup&is_master=eq.false`)) return ok([{id:target}]);
      if(url.endsWith('/auth/v1/admin/users')) return ok({id:target});
      if(url.endsWith('/rpc/provision_account')) return ok(null);
      if(url.includes(`/admin/users/${target}`)) return ok(null);
      if(url.includes('/profiles?')) return ok([{id:target,role:'grownup'}]);
      throw Error(url);
    };
    const result=await handler(request({action,handle:'regular',display_name:'Regular',password:'ABCD1234',grownup_id:target,confirm:action},role==='anonymous'?undefined:'valid-token'));
    assert.equal(result.status,role==='master'?200:role==='anonymous'?401:403,`${role}: ${action}`);
    if(role!=='master') assert.equal(calls.some(call=>call.url.includes('/admin/users')),false);
  }
  transport=url=>url.endsWith('/auth/v1/user')?ok({id}):url.includes('is_master=eq.false')?ok([]):ok([{id,is_master:true}]);
  for(const action of ['delete-grownup','reset-grownup-password']) {
    assert.equal((await handler(request({action,grownup_id:id,confirm:action,password:'ABCD1234'},'valid-token'))).status,403,'Master self action rejected');
    assert.equal((await handler(request({action,grownup_id:target,confirm:action,password:'ABCD1234'},'valid-token'))).status,403,'Child/missing target rejected');
  }
  for(const failure of [false,'network']) {
    sessionResult=failure;calls=[];
    const denied=await handler(request({action:'delete-grownup',grownup_id:target,confirm:'delete-grownup'},'valid-token'));
    assert.equal(denied.status,401,'Expired or unverifiable sessions fail closed');
    assert.equal(calls.length,2,'Only Auth validation and caller-scoped session check precede denial');
    assert.equal(calls.some(call=>call.options.headers.apikey==='private-test'),false,'No service-role request occurs after session denial');
  }
  sessionResult=true;
  console.log('PASS master Edge: master/regular/child/anonymous create, legacy register, delete and password-reset matrix; self and invalid targets denied');
  process.stdout.write('accounts_database_edge: admin-only creation (including legacy register), anonymous/child denial, avatars, password preservation, guardian checks, cleanup and interrupted retry passed\n');
})().catch(error=>{process.stderr.write(`${error.stack}\n`);process.exitCode=1;});
