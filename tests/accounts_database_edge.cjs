/* Exercise the real Edge handler with transport doubles (no admin credentials locally).
 * npm install --prefix .job/db-tools typescript@5.9.3
 * node tests/accounts_database_edge.cjs
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../.job/db-tools/node_modules/typescript');
let handler, calls = [], transport;
const id = '10000000-0000-0000-0000-000000000001';
const source = ts.transpileModule(fs.readFileSync('supabase/functions/accounts/index.ts','utf8'), { compilerOptions:{ target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS } }).outputText;
vm.runInNewContext(source, {
  exports:{}, Request, Response,
  Deno:{env:{get:name => ({SUPABASE_URL:'https://project.invalid',SUPABASE_ANON_KEY:'public-test',SUPABASE_SERVICE_ROLE_KEY:'private-test'})[name]}, serve: fn => { handler=fn; }},
  fetch:async (url,options) => { calls.push({url,options}); return transport(url,options); },
});
const ok = data => new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
const request = (body,token) => new Request('https://project.invalid/functions/v1/accounts',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
(async () => {
  transport = (url,options) => {
    if (url.endsWith('/auth/v1/admin/users')) {
      const body=JSON.parse(options.body);
      assert.equal(body.email,'teacher@accounts.littlewoof.invalid');
      assert.equal(body.password,' 1234 '); // Six characters, preserved verbatim.
      assert.equal(body.email_confirm,true);
      assert.deepEqual(body.app_metadata,{account_role:'grownup',creator_id:null});
      return ok({id});
    }
    if (url.endsWith('/rpc/provision_account')) return ok(null);
    if (url.includes('/rest/v1/profiles?')) return ok([{id,handle:'teacher',role:'grownup'}]);
    throw Error(`Unexpected ${url}`);
  };
  const registered=await handler(request({action:'register',handle:' Teacher ',display_name:'Teacher',password:' 1234 '}));
  assert.equal(registered.status,200);
  assert.equal(JSON.stringify(await registered.json()).includes('private-test'),false);
  const count=calls.length;
  const denied=await handler(request({action:'create-child',handle:'child',password:'123456',display_name:'Child'}));
  assert.equal(denied.status,401);
  assert.equal(calls.length,count);
  assert.equal((await handler(request({action:'register',handle:'x',password:'123456',display_name:'Name'}))).status,400);
  assert.equal((await handler(request({action:'register',handle:'valid',password:'12345',display_name:'Name'}))).status,400);
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
    if (url.endsWith('/auth/v1/admin/users')) return ok({id});
    if (url.endsWith('/rpc/provision_account')) return new Response('{}',{status:400});
    if (url.includes('/profiles?')) return ok([]);
    if (url.endsWith(`/auth/v1/admin/users/${id}`)) return ok(null);
    throw Error(`Unexpected ${url}`);
  };
  assert.equal((await handler(request({action:'register',handle:'valid',password:'123456',display_name:'Name'}))).status,400);
  assert.ok(calls.some(x=>x.options.method==='DELETE'), 'Provisioning failure cleans orphan Auth user');
  calls=[];
  transport=(url) => {
    if (url.endsWith('/auth/v1/admin/users')) return new Response('{}',{status:422});
    if (url.includes('/auth/v1/token?')) return ok({user:{id,app_metadata:{account_role:'grownup',creator_id:null}}});
    if (url.endsWith('/rpc/provision_account')) return ok(null);
    if (url.includes('/profiles?')) return ok([{id,role:'grownup'}]);
    throw Error(`Unexpected ${url}`);
  };
  assert.equal((await handler(request({action:'register',handle:'valid',password:'123456',display_name:'Name'}))).status,200,'Interrupted provisioning recovers by password');
  calls=[];
  const classId='30000000-0000-0000-0000-000000000001';
  const childId='10000000-0000-0000-0000-000000000002';
  let ownsClass=true;
  transport=(url,options) => {
    if (url.endsWith('/auth/v1/user')) return ok({id});
    if (url.includes('/classes?')) {
      assert.ok(url.includes(`owner_id=eq.${id}`));
      return ok(ownsClass?[{id:classId}]:[]);
    }
    if (url.endsWith('/auth/v1/admin/users')) return ok({id:childId});
    if (url.endsWith('/rpc/provision_account')) {
      const body=JSON.parse(options.body);
      assert.equal(body.p_class,classId);
      assert.equal(body.p_adult,id);
      return ok(null);
    }
    if (url.includes('/profiles?')) return ok([{id,role:'grownup'}]);
    throw Error(`Unexpected ${url}`);
  };
  const create={action:'create-child',handle:'student',password:'123456',display_name:'Student',class_id:classId};
  assert.equal((await handler(request(create,'valid-token'))).status,200,'Owned class is passed to atomic provisioning');
  ownsClass=false; calls=[];
  assert.equal((await handler(request(create,'valid-token'))).status,403,'Foreign class rejected');
  assert.equal(calls.some(x=>x.url.endsWith('/auth/v1/admin/users')),false,'No Auth user created for foreign class');
  process.stdout.write('accounts_database_edge: confirmed creation, password preservation, protected actions, guardian checks, cleanup, interrupted retry and class ownership passed\n');
})().catch(error=>{process.stderr.write(`${error.stack}\n`);process.exitCode=1;});
