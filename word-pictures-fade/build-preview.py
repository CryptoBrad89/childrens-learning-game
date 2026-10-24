#!/usr/bin/env python3
"""Build a standalone preview with theme declarations copied from game CSS."""
from pathlib import Path
import re
from generate import ROOT, WORDS, GAMES

css = '''
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Arial,sans-serif;background:#f5f2ee;color:#29283c}header{padding:32px;max-width:1440px;margin:auto}h1{margin:0 0 12px;font-size:32px}p{line-height:1.6}nav{display:flex;flex-wrap:wrap;gap:12px}nav a{color:#343064;padding:9px 14px;background:white;border-radius:20px}section{padding:32px;background:var(--bg);color:var(--ink);scroll-margin-top:12px}section h2{margin:0 0 8px}section>p{margin:0 0 24px;color:var(--muted)}.grid{display:grid;gap:24px;grid-template-columns:repeat(4,minmax(0,1fr));max-width:1440px;margin:auto}.choice{background:var(--card);color:var(--card-ink);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px}.choice img{height:auto;object-fit:contain;aspect-ratio:1;display:block}.word{font-weight:900;display:flex;align-items:center;gap:7px}.sound{font-size:16px;font-weight:400;opacity:.6}.ribbon-road .choice{min-height:250px;border-radius:36px;border:3px solid var(--line);padding:22px;box-shadow:0 8px 0 var(--shadow)}.ribbon-road .choice img{width:180px;max-width:100%;padding:0;background:none;border-radius:0}.ribbon-road .word{font-size:26px;margin-top:12px}.moonboat .grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.moonboat .choice{flex-direction:row;justify-content:flex-start;gap:26px;border-radius:90px;padding:12px 28px;min-height:114px;border:2px solid #ffffff70;box-shadow:0 6px 0 var(--shadow)}.moonboat .choice img{width:94px;max-height:94px;flex-shrink:0}.moonboat .word{font-size:25px;flex:1;justify-content:space-between}.moonboat .choice:nth-child(3n+2){background:#f3e3d8}.moonboat .choice:nth-child(3n){background:#daeaeb}.circles{display:flex;flex-wrap:wrap;justify-content:center;gap:32px;margin:32px auto 8px}.circle{border-radius:50%;aspect-ratio:1;background:var(--accent2);color:#303858;border:8px solid #ffffff3d;box-shadow:inset -15px -15px 0 #00000010,0 0 0 1px var(--line);width:220px;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:20px}.circle img{width:145px;height:145px;object-fit:contain}.circle span{font-weight:bold}footer{padding:24px;text-align:center}@media(max-width:1100px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}.moonboat .grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){header,section{padding:20px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.ribbon-road .choice{padding:12px;min-height:180px}.ribbon-road .word{font-size:20px}.moonboat .grid{grid-template-columns:1fr}.circle{width:180px}.circle img{width:110px;height:110px}}
'''
sections=[];links=[]
for game,names in [('ribbon-road',['Pink','Purple','Yellow']),('moonboat',['Dark','Cloud day','Plum dusk'])]:
    source=(ROOT.parent/GAMES[game]/'style.css').read_text().splitlines()[:3]
    for i,(name,line) in enumerate(zip(names,source)):
        ident=f'{game}-{i}'
        declarations=re.search(r'\{(.*)\}',line).group(1)
        if i == 0:
            base=declarations
        css+=f'#{ident}{{{base};{declarations}}}\n'
        links.append(f'<a href="#{ident}">{"Ribbon Road" if game=="ribbon-road" else "Moonboat"} · {name}</a>')
        cards=''.join(f'<div class="choice"><img src="{game}/{word}.webp" alt="{word}" width="512" height="512"><span class="word">{word}<span class="sound" aria-hidden="true">♫</span></span></div>' for word in WORDS)
        circles=''
        if game=='moonboat':
            circles='<h3>Letter-page circle examples</h3><div class="circles">'+''.join(f'<div class="circle"><img src="{game}/{word}.webp" alt="{word}" width="512" height="512"><span>{word}</span></div>' for word in ['apple','rabbit','kite','yak'])+'</div>'
        sections.append(f'<section id="{ident}" class="{game}"><h2>{"Ribbon Road" if game=="ribbon-road" else "Moonboat"} · {name}</h2><p>26 faded pictures · {"Rounded answer cards" if game=="ribbon-road" else "Pill answer cards, including the three answer-slot colors"}</p><div class="grid">{cards}</div>{circles}</section>')
html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Faded word pictures · All six themes</title><style>'+css+'</style><header><h1>Faded word pictures</h1><p>All 52 pictures across all six game themes. The complete images stay inside their original square bounds, with transparent fades at the edges.</p><nav aria-label="Themes">'+''.join(links)+'</nav></header><main>'+''.join(sections)+'</main><footer>Art preview only · 512 × 512 lossless WebP with transparency</footer></html>'
(ROOT/'index.html').write_text(html)
print('Wrote six themes, 156 answer cards, and 12 circle examples.')
