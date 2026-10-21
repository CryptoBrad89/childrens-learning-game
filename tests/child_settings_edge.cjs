const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ts=require('../.job/db-tools/node_modules/typescript');
let handler,calls=[],role='grownup',linked=true,sessionResult=true;
const adult='10000000-0000-0000-0000-000000000001',child='10000000-0000-0000-0000-000000000002',other='10000000-0000-0000-0000-000000000003',job='10000000-0000-0000-0000-000000000900';
const ok=x=>new Response(JSON.stringify(x),{headers:{'Content-Type':'application/json'}});
vm.runInNewContext(ts.transpileModule(fs.readFileSync('supabase/functions/accounts/index.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{
  exports:{},Request,Response,
  Deno:{env:{get:n=>({SUPABASE_URL:'https://project.invalid',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'private'})[n]},serve:fn=>handler=fn},
  fetch:async(url,options)=>{
    const body=options.body?JSON.parse(options.body):null;calls.push({url,body});
    if(url.endsWith('/rpc/session_status')) {
      assert.equal(options.headers.apikey,'public');assert.equal(options.headers.Authorization,'Bearer valid');
      assert.deepEqual(body,{p_touch:false});
      if(sessionResult==='network')throw Error('Session validation unavailable');
      return sessionResult ? ok({expires_at:Date.now()/1000+1800,role:'grownup'}) : new Response('{}',{status:401});
    }
    if(url.endsWith('/auth/v1/user'))return ok({id:adult});
    if(url.includes('role=eq.grownup'))return ok(role==='grownup'?[{id:adult,is_master:false}]:[]);
    if(url.includes('/guardians?'))return ok(linked?[{child_id:child}]:[]);
    if(url.includes('handle=eq.'))return ok([]);
    if(url.endsWith('/rpc/edit_confirmed_profile'))return ok(null);
    if(url.endsWith('/rpc/patch_game_settings'))return ok({settings:body.p_patch});
    if(url.endsWith('/rpc/start_bulk_action'))return linked?ok(job):new Response('{}',{status:403});
    if(url.includes('/profiles?'))return ok([{id:child,role:'child',handle:'sally_new',display_name:'Sally New'}]);
    throw Error('Unexpected '+url);
  }
});
const send=(body,token='valid')=>handler(new Request('https://project.invalid/functions/v1/accounts',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)}));
(async()=>{
  const requests=[{action:'edit-child-profile',child_id:child,handle:' Sally_New ',display_name:' Sally New '},{action:'patch-game-settings',patch:{voice:false}},{action:'patch-child-settings',child_ids:[child,other],patch:{letters:['A','E','I','O','U']}}];
  for(const body of requests){
    for(const actor of ['anonymous','child','grownup']){
      role=actor;calls=[];const result=await send(body,actor==='anonymous'?null:'valid');
      assert.equal(result.status,actor==='anonymous'?401:actor==='child'||body.action==='patch-game-settings'?403:200,actor+' '+body.action);
      if(actor!=='grownup')assert.equal(calls.some(c=>c.url.includes('/rpc/')&&!c.url.endsWith('/rpc/session_status')),false);
    }
  }
  const sent=calls.find(c=>c.url.endsWith('/rpc/start_bulk_action')).body;
  assert.deepEqual(sent,{p_action:'patch-child-settings',p_targets:[child,other],p_parameters:{patch:{letters:['A','E','I','O','U']},reset:false},p_password:null,p_request_id:null},'Bulk only submits changed keys');
  role='grownup';linked=false;
  for(const body of [requests[0],requests[2]]){calls=[];assert.equal((await send(body)).status,body.action==='patch-child-settings'?400:403);assert.equal(calls.some(c=>c.url.endsWith('/rpc/edit_confirmed_profile')),false);}
  linked=true;calls=[];
  assert.equal((await send({action:'edit-child-profile',child_id:child,handle:' Sally_New ',display_name:' Sally New ',p_adult:other})).status,200);
  assert.deepEqual(calls.find(c=>c.url.endsWith('/rpc/edit_confirmed_profile')).body,{p_actor:adult,p_target:child,p_expected_handle:'sally_new',p_handle:'sally_new',p_display_name:'Sally New',p_avatar:null});
  for(const child_ids of [[],['bad'],null])assert.equal((await send({action:'patch-child-settings',child_ids,patch:{}})).status,400);
  assert.equal((await send({action:'patch-child-settings',child_ids:[child],patch:{},reset:'yes'})).status,400);
  for(const failure of [false,'network']) for(const body of requests) {
    sessionResult=failure;calls=[];
    assert.equal((await send(body)).status,401,'Expired or unverifiable settings session denied');
    assert.equal(calls.length,2,'Session denial precedes all profile, guardian and service-role work');
  }
  sessionResult=true;
  console.log('PASS child settings Edge: regular grown-up rename/settings, authenticated actor binding, child/anonymous/unlinked denial, changed-key bulk protocol, malformed inputs');
})().catch(e=>{console.error(e);process.exitCode=1;});
