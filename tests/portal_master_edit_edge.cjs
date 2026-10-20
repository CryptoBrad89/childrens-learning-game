'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('../.job/db-tools/node_modules/typescript');
const adult='10000000-0000-0000-0000-000000000001',target='10000000-0000-0000-0000-000000000002';
let handler,role='master',calls=[],exists=true,taken=false;
const ok=x=>new Response(JSON.stringify(x));
vm.runInNewContext(ts.transpileModule(fs.readFileSync('supabase/functions/accounts/index.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{
 exports:{},Request,Response,Deno:{env:{get:n=>({SUPABASE_URL:'https://project.invalid',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'private'})[n]},serve:fn=>handler=fn},
 fetch:async(url,options)=>{
  const body=options.body?JSON.parse(options.body):null;calls.push({url,body});
  if(url.endsWith('/auth/v1/user'))return ok({id:adult});
  if(url.endsWith('/rpc/session_status'))return ok({});
  if(url.includes(`id=eq.${adult}&role=eq.grownup`))return ok(role==='child'?[]:[{id:adult,is_master:role==='master'}]);
  if(url.includes('role=eq.grownup'))return ok(exists?[{id:target}]:[]);
  if(url.includes('handle=eq.'))return ok(taken?[{id:target}]:[]);
  if(url.endsWith('/rpc/edit_other_grownup_profile'))return ok(null);
  if(url.includes('/profiles?'))return ok([{id:target}]);
  throw Error('Unexpected '+url);
 }
});
const send=(action,token=true)=>handler(new Request('https://project.invalid',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer valid'}:{})},body:JSON.stringify({action,grownup_id:target,p_actor:target,handle:' Edited ',display_name:' Name ',avatar:'⭐'})}));
(async()=>{
 for(const actor of ['master','regular','child','anonymous']){
  role=actor;calls=[];const r=await send('edit-grownup-profile',actor!=='anonymous');assert.equal(r.status,actor==='master'?200:actor==='anonymous'?401:403,actor);
  if(actor==='master')assert.deepEqual(calls.find(c=>c.url.endsWith('/rpc/edit_other_grownup_profile')).body,{p_actor:adult,p_target:target,p_handle:'edited',p_display_name:'Name',p_avatar:'⭐'});
  else assert(!calls.some(c=>c.url.endsWith('/rpc/edit_other_grownup_profile')));
 }
 for(const actor of ['master','regular']){role=actor;calls=[];assert.equal((await send('edit-profile')).status,200);assert.equal(calls.find(c=>c.url.endsWith('/rpc/edit_other_grownup_profile')).body.p_target,adult,'Own action binds target to caller');}
 role='master';exists=false;assert.equal((await send('edit-grownup-profile')).status,403);exists=true;taken=true;calls=[];assert.equal((await send('edit-grownup-profile')).status,409);assert(!calls.some(c=>c.url.endsWith('/rpc/edit_other_grownup_profile')));
 console.log('PASS master profile Edge: master-only edits, regular self-only, caller/target binding, child/anonymous/missing/conflict refusal');
})().catch(e=>{console.error(e);process.exitCode=1;});
