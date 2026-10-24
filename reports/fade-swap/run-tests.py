from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess,os,json
root=Path.cwd();out=root/'reports/fade-swap';env=dict(os.environ)
for key in ['CALL_LIST_HOSTED','PROGRESS_ROOT','TIDY_ROOT','CELEBRATE_LAYOUT','CELEBRATE_WIDTH']:
 env.pop(key,None)
env.update(NODE_OPTIONS='--require='+str(out/'local-only.cjs'),NO_SCREENSHOTS='1',CHROMIUM_EXECUTABLE='/usr/bin/google-chrome',CELEBRATE_REPORT_DIR=str(out/'celebrate'),TIDY_REPORT_DIR=str(out/'tidy'),PORTAL_SHOTS=str(out/'portal'))
names='runtime_smoke grown_ups_runtime picture_swap layout_build layout_offline layout_ribbon_unchanged motion_smoke silk_smoke grown_ups_smoke celebrate_audio_rules correct_word progress progress_sync tidy_1 tidy_1b tidy_1_update accounts_sync portal_flow portal_review_browser risky_actions_browser call_list_browser call_list_sounds call_list_offline fixlist home_flow confetti_smoke celebrate_delay'.split()
commands=[('static',['python3','tests/run_tests.py'])]+[(n,['node',f'tests/{n}.cjs']) for n in names]+[(f'browser_smoke-{i}',['node','tests/browser_smoke.cjs']) for i in range(6)]
def run(item):
 name,cmd=item; e=dict(env)
 if name.startswith('browser_smoke-'):e['BROWSER_SMOKE_SHARD']=name[-1]
 with (out/(name+'.log')).open('w') as log:
  try:
   proc=subprocess.Popen(cmd,stdout=log,stderr=subprocess.STDOUT,env=e,start_new_session=True)
   try: code=proc.wait(timeout=480)
   except subprocess.TimeoutExpired:
    import signal
    os.killpg(proc.pid,signal.SIGKILL);proc.wait();code='TIMEOUT (480s)'
  except Exception as err:code=str(err)
 print(name,code,flush=True);return {'suite':name,'exit':code}
with ThreadPoolExecutor(max_workers=2) as pool:
 results=list(pool.map(run,commands))
(out/'tests.json').write_text(json.dumps(results,indent=2)+'\n')
