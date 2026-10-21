"""Run maintained isolated suites without signing into any live existing account."""
import concurrent.futures, json, os, pathlib, subprocess, sys, time
root = pathlib.Path(__file__).resolve().parents[1]
out = root / 'reports/call-list-tests'
out.mkdir(exist_ok=True)
env = {**os.environ, 'NO_SCREENSHOTS':'1', 'CHROMIUM_EXECUTABLE':'/usr/bin/google-chrome', 'PORTAL_SHOTS':'reports/call-list-regression'}
cases = [('static', ['python3','tests/run_tests.py'], {})]
for name in ['runtime_smoke','grown_ups_runtime','accounts_database','accounts_database_edge','child_settings_database','child_settings_edge','session_limits_database','portal_master_edit_edge','portal_review_database','portal_review_edge','call_list_database','motion_smoke','silk_smoke','confetti_smoke','grown_ups_smoke','home_flow','accounts_sync','portal_flow','fixlist','portal_review_browser','call_list_browser','call_list_sounds','call_list_offline']:
    cases.append((name,['node','tests/'+name+'.cjs'],{}))
for shard in range(6):
    cases.append(('browser_smoke_'+str(shard),['node','tests/browser_smoke.cjs'],{'BROWSER_SMOKE_SHARD':str(shard)}))
cases.append(('edge-typescript',['.job/db-tools/node_modules/.bin/tsc','--noEmit','--strict','--target','ES2022','--module','ESNext','--lib','ES2022,DOM','.job/db-tools/deno.d.ts','supabase/functions/accounts/index.ts'],{}))
def run(case):
    name,command,extra=case
    start=time.monotonic()
    with (out/(name+'.log')).open('w') as log:
        try: code=subprocess.run(command,cwd=root,env={**env,**extra},stdout=log,stderr=subprocess.STDOUT,timeout=1800).returncode
        except subprocess.TimeoutExpired: code=124
    row={'name':name,'command':command,'exit_code':code,'seconds':round(time.monotonic()-start,1)}
    print(json.dumps(row),flush=True)
    return row
if '--rerun-failed' in sys.argv:
    previous=json.loads((out/'results.json').read_text())
    lookup={row['name']:row for row in previous}
    cases=[case for case in cases if case[0] not in lookup or lookup[case[0]]['exit_code']]
else:
    previous=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    fresh=list(pool.map(run,cases))
results=[row for row in previous if row['name'] not in {r['name'] for r in fresh}]+fresh
(out/'results.json').write_text(json.dumps(results,indent=2)+'\n')
raise SystemExit(any(r['exit_code'] for r in results))
