'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ts=require('../.job/db-tools/node_modules/typescript');
const id=n=>'10000000-0000-0000-0000-'+String(n).padStart(12,'0');
const master=id(1),adult=id(2),kid=id(3),other=id(4),missing=id(5),failing=id(6);
let handler,actor=master,calls=[],links=new Set([adult+':'+kid]);
const people=new Map([[master,{id:master,role:'grownup',is_master:true}],[adult,{id:adult,role:'grownup',is_master:false}],[kid,{id:kid,role:'child'}],[other,{id:other,role:'child'}],[failing,{id:failing,role:'grownup',is_master:false}]]);
const ok=x=>new Response(JSON.stringify(x),{headers:{'Content-Type':'application/json'}});
vm.runInNewContext(ts.transpileModule(fs.readFileSync('supabase/functions/accounts/index.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{
 exports:{},Request,Response,Deno:{env:{get:n=>({SUPABASE_URL:'https://fixture',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'private'})[n]},serve:fn=>handler=fn},
 fetch:async(url,options)=>{
  const u=new URL(url),body=options.body?JSON.parse(options.body):null;calls.push({url,options,body});
  if(u.pathname==='/auth/v1/user')return ok({id:actor});
  if(u.pathname.endsWith('/session_status'))return ok({});
  if(u.pathname==='/rest/v1/profiles'){
   if(options.method==='PATCH')return ok(null);
   let rows=[...people.values()];
   for(const field of ['id','role','is_master']){const value=u.searchParams.get(field);if(value?.startsWith('eq.'))rows=rows.filter(p=>String(p[field])===value.slice(3));if(value?.startsWith('in.('))rows=rows.filter(p=>value.includes(p[field]));}
   if(u.searchParams.has('handle'))rows=[];
   return ok(rows);
  }
  if(u.pathname==='/rest/v1/guardians'){
   if(options.method==='POST')return ok(null);
   const a=u.searchParams.get('adult_id')?.slice(3),c=u.searchParams.get('child_id')?.slice(3);
   return ok([...links].map(key=>{const [adult_id,child_id]=key.split(':');return {adult_id,child_id};}).filter(row=>(!a||row.adult_id===a)&&(!c||row.child_id===c)));
  }
  if(u.pathname.startsWith('/rest/v1/rpc/'))return ok({ok:true,results:[]});
  if(u.pathname.startsWith('/auth/v1/admin/users/'))return u.pathname.endsWith(failing)&&options.method==='DELETE'?new Response('{}',{status:500}):ok({});
  throw Error('Unexpected '+url);
 }
});
async function send(action,fields={}){calls=[];const r=await handler(new Request('https://fixture/accounts',{method:'POST',headers:{Authorization:'Bearer fixture','Content-Type':'application/json'},body:JSON.stringify({action,...fields})}));return {status:r.status,data:await r.json()};}
(async()=>{
 const mutations=[['edit-child-profile',{child_id:other,handle:'new_name',display_name:'New',avatar:'🦊'}],['reset-child-password',{child_id:other,password:'123456'}],['reset-child-progress',{child_id:other,confirm:'reset-child-progress'}],['patch-child-settings',{child_ids:[other],patch:{calm:true}}],['unlink-child',{child_id:other}],['delete-child',{child_id:other,confirm:'delete-child'}],['list-child-grownups',{child_id:other}]];
 for(const [action,fields] of mutations){actor=adult;assert.equal((await send(action,fields)).status,403,action+' regular unlinked');actor=master;assert.equal((await send(action,fields)).status,200,action+' master unlinked');}
 for(const [action,fields] of mutations){actor=adult;const own=JSON.parse(JSON.stringify(fields).replaceAll(other,kid));assert.equal((await send(action,own)).status,200,action+' linked regular');}
 const privileged=[['list-grownups',{}],['list-linkable-children',{}],['link-child',{child_id:other,grownup_id:adult}],['patch-game-settings',{patch:{calm:true}}],['delete-grownups',{grownup_ids:[adult],confirm:'delete-grownups'}],['reset-grownup-password',{grownup_id:adult,password:'123456'}],['reset-grownup-progress',{grownup_id:adult,confirm:'reset-grownup-progress'}],['transfer-child',{child_id:kid,source_id:adult,destination_id:master,confirm:'transfer-child'}],['transfer-children',{child_ids:[kid,other],source_id:adult,destination_id:master,confirm:'transfer-children'}]];
 for(const [action,fields] of privileged){actor=adult;assert.equal((await send(action,fields)).status,403,action+' regular');actor=master;assert.equal((await send(action,fields)).status,200,action+' master');}
 actor=adult;let result=await send('delete-children',{child_ids:[kid,other,missing],confirm:'delete-children'});assert.deepEqual(result.data.results.map(r=>r.ok),[true,false,false]);assert.equal(result.data.results[1].reason,'not-linked');
 actor=master;
 result=await send('delete-children',{child_ids:[kid,other],confirm:'delete-children'});assert(result.data.results.every(r=>r.ok));
 result=await send('delete-grownups',{grownup_ids:[adult,failing,master,kid,missing],confirm:'delete-grownups'});assert.deepEqual(result.data.results.map(r=>r.ok),[true,false,false,false,false]);assert.equal(result.data.results[2].reason,'is-master');
 const firstDelete=calls.findIndex(c=>c.options.method==='DELETE');assert(calls.slice(firstDelete).every(c=>!c.url.includes('/profiles?')),'All verdict reads happen before deletion');
 for(const action of ['delete-children','delete-grownups'])for(const ids of [[],[kid,kid],['bad'],Array.from({length:101},(_,n)=>id(n+10))]){
  result=await send(action,{[action==='delete-children'?'child_ids':'grownup_ids']:ids,confirm:action});assert.equal(result.status,400);assert(!calls.some(c=>c.options.method==='DELETE'));
 }
 const boundary=await send('delete-children',{child_ids:Array.from({length:100},(_,n)=>id(n+10)),confirm:'delete-children'});assert.equal(boundary.status,200);assert.equal(boundary.data.results.length,100);
 assert.equal((await send('delete-child',{child_id:master,confirm:'delete-child'})).status,403);
 assert.equal((await send('reset-grownup-progress',{grownup_id:master,confirm:'reset-grownup-progress'})).status,403);
 assert.equal((await send('delete-child',{child_id:kid})).status,400,'Single-ID confirmation preserved');
 for(const who of [master,adult]) {
  actor=who;result=await send('reset-own-progress',{confirm:'reset-own-progress',grownup_id:other});assert.equal(result.status,200);
  assert.deepEqual(calls.find(c=>c.url.endsWith('/rpc/reset_own_progress')).body,{p_actor:who},'Self reset ignores a supplied target');
  result=await send('reset-own-progress');assert.equal(result.status,400);assert(!calls.some(c=>c.url.endsWith('/rpc/reset_own_progress')));
 }
 actor=kid;assert.equal((await send('reset-own-progress',{confirm:'reset-own-progress'})).status,403);
 console.log('PASS portal review Edge: master/linked/unlinked actions, master-only sharing/transfers/defaults/grown-ups, bulk happy/partial failures, master protection, preflight and 100-ID/UUID/duplicate validation');
})().catch(e=>{console.error(e);process.exitCode=1;});
