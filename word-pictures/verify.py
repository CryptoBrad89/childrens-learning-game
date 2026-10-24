"""Verify the local art preview in Chrome. Requires Python websocket-client."""
import base64
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import urllib.request
import xml.etree.ElementTree as ET
import websocket
ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'preview-checks'
OUT.mkdir(exist_ok=True)
expected = {'letter-post':['apple','kite','van'],'moonboat':['moon','octopus','fox'],'ribbon-road':['rabbit','umbrella','ball']}
files = sorted(ROOT.glob('*/*.svg'))
assert len(files) == 9
for folder, words in expected.items():
    for word in words:
        root = ET.parse(ROOT / folder / f'{word}.svg').getroot()
        assert root.attrib['viewBox'] == '0 0 320 320'
        assert root.find('{http://www.w3.org/2000/svg}title').text.lower() == word
        for el in root.iter():
            assert el.tag.split('}')[-1] not in ['text','script','image','foreignObject']
            assert all(not k.endswith('href') or v.startswith('#') for k,v in el.attrib.items())
html = (ROOT / 'index.html').read_text()
assert 'https:' not in html and 'http:' not in html
chrome = shutil.which('google-chrome') or shutil.which('chromium')
assert chrome
report = {'svg_count':len(files),'checks':[]}
with tempfile.TemporaryDirectory(prefix='.verify-browser-', dir=OUT) as profile:
    proc = subprocess.Popen([chrome,'--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0','--remote-allow-origins=*',f'--user-data-dir={profile}','about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
        active = Path(profile) / 'DevToolsActivePort'
        for _ in range(100):
            if active.exists(): break
            time.sleep(.1)
        port = active.read_text().splitlines()[0]
        tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json'))
        ws = websocket.create_connection(next(t['webSocketDebuggerUrl'] for t in tabs if t['type']=='page'),timeout=15)
        seq = 0
        def call(method,params=None):
            global seq
            seq += 1
            ws.send(json.dumps({'id':seq,'method':method,'params':params or {}}))
            while True:
                msg = json.loads(ws.recv())
                if msg.get('id')==seq:
                    assert 'error' not in msg,msg
                    return msg.get('result',{})
        call('Page.enable')
        for name,width,height in [('desktop',1440,900),('mobile',390,844)]:
            call('Emulation.setDeviceMetricsOverride',{'width':width,'height':height,'deviceScaleFactor':1,'mobile':False})
            call('Page.navigate',{'url':(ROOT/'index.html').as_uri()})
            result = call('Runtime.evaluate',{'expression':'''(async()=>{while(document.readyState!=='complete')await new Promise(r=>setTimeout(r,20));await Promise.all([...document.images].map(i=>i.decode()));return {title:document.title,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,images:[...document.images].map(i=>({src:i.getAttribute('src'),loaded:i.naturalWidth>0})),sections:[...document.querySelectorAll('section')].map(s=>({name:s.querySelector('h2').textContent,background:getComputedStyle(s).backgroundColor,themeCount:s.querySelectorAll('.theme').length})),externalResources:performance.getEntriesByType('resource').filter(r=>!r.name.startsWith('file:')).map(r=>r.name)}})()''','awaitPromise':True,'returnByValue':True})
            assert 'exceptionDetails' not in result,result
            data = result['result']['value']
            assert data['scrollWidth']<=width,data
            assert len(data['images'])==27 and all(i['loaded'] for i in data['images'])
            assert len(data['sections'])==3 and all(s['themeCount']==2 for s in data['sections'])
            assert not data['externalResources'],data
            metrics = call('Page.getLayoutMetrics')['cssContentSize']
            png = call('Page.captureScreenshot',{'format':'png','captureBeyondViewport':True,'clip':{'x':0,'y':0,'width':width,'height':metrics['height'],'scale':1}})
            (OUT/f'{name}.png').write_bytes(base64.b64decode(png['data']))
            report['checks'].append({'name':name,**data})
        call('Browser.close')
        ws.close()
    finally:
        if proc.poll() is None:
            proc.terminate()
        proc.wait(timeout=10)
        time.sleep(.5)
(OUT/'checks.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS: 9 SVGs; 27 preview images loaded; 3 layouts, 6 alternate theme strips; no overflow at 1440px or 390px; no external resources.')
