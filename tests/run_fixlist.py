"""Run every maintained suite; live tests require the read-only master handle."""
import concurrent.futures,json,os,pathlib,subprocess,time
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'reports/fixlist-tests';OUT.mkdir(exist_ok=True)
ENV={**os.environ,'NO_SCREENSHOTS':'1','CHROMIUM_EXECUTABLE':'/usr/bin/google-chrome'}
if not ENV.get('MASTER_HANDLE'):raise SystemExit('Set MASTER_HANDLE from the live Supabase profile; never rename the account.')
results=[]
def run(name,cmd):
 start=time.monotonic()
 with (OUT/(name+'.log')).open('w') as log:
  try:code=subprocess.run(cmd,cwd=ROOT,env=ENV,stdout=log,stderr=subprocess.STDOUT,timeout=1800).returncode
  except subprocess.TimeoutExpired:code=124
 row={'name':name,'command':cmd,'exit_code':code,'seconds':round(time.monotonic()-start,1)}
 print(json.dumps(row),flush=True);return row
def batch(items,workers=2):
 with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
  return list(pool.map(lambda x:run(*x),items))
results+=batch([('static',['python3','tests/run_tests.py'])]+[(n,['node','tests/'+n+'.cjs']) for n in ['runtime_smoke','grown_ups_runtime','accounts_database','accounts_database_edge','child_settings_database','child_settings_edge','session_limits_database','portal_master_edit_edge']],3)
results+=batch([(n,['node','tests/'+n+'.cjs']) for n in ['browser_smoke','motion_smoke','silk_smoke','confetti_smoke','grown_ups_smoke','home_flow','accounts_sync','portal_flow','fixlist']])
for n,args in [('portal_master',[]),('portal_master_edit',[]),('portal_round2',[]),('portal_flow',['--live']),('accounts_sync',['--live']),('child_settings_browser',[]),('accounts_selection',[])]:
 results.append(run(n+('-live' if args else ''),['node','tests/'+n+'.cjs',*args]))
results.append(run('edge-typescript',['.job/db-tools/node_modules/.bin/tsc','--noEmit','--strict','--target','ES2022','--module','ESNext','--lib','ES2022,DOM','.job/db-tools/deno.d.ts','supabase/functions/accounts/index.ts']))
(OUT/'results.json').write_text(json.dumps(results,indent=2)+'\n')
raise SystemExit(any(r['exit_code'] for r in results))
