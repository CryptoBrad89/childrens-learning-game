"""Rebuild the nine original SVGs and the static, offline preview. No dependencies."""
from pathlib import Path
ROOT = Path(__file__).parent

def svg(folder, word, defs, art):
    dest = ROOT / folder
    dest.mkdir(exist_ok=True)
    (dest / f'{word}.svg').write_text(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-labelledby="title">
<title id="title">{word.capitalize()}</title>
<defs>{defs}</defs>
{art}
</svg>\n''')

printdefs = '''
<pattern id="grain" width="13" height="17" patternUnits="userSpaceOnUse"><path d="M1 3h2m5 8h1m2-9h1M3 15h2" stroke="#29466b" stroke-opacity=".12" stroke-width=".8"/></pattern>
<pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><path d="M0 0v7" stroke="#29466b" stroke-opacity=".23" stroke-width="2"/></pattern>
<linearGradient id="red" x2=".8" y2="1"><stop stop-color="#ef8666"/><stop offset=".55" stop-color="#d34939"/><stop offset="1" stop-color="#a32f35"/></linearGradient>
<linearGradient id="blue" x2=".7" y2="1"><stop stop-color="#d9edf0"/><stop offset="1" stop-color="#7fb3c9"/></linearGradient>'''
# The scalloped paper edge is part of the illustration, not a background circle.
stamp = '<path d="M62 31H258V289H62Z" fill="#fff8e5" stroke="#29466b" stroke-width="2" stroke-dasharray="2 9" stroke-linecap="round"/><path d="M76 45H244V275H76Z" fill="none" stroke="#29466b" stroke-opacity=".2"/>'
texture = '<path d="M63 32H257V288H63Z" fill="url(#grain)" pointer-events="none"/>'
def post(word, art): svg('letter-post',word,printdefs,stamp+art+texture)
post('apple','''
<ellipse cx="161" cy="253" rx="63" ry="8" fill="#29466b" opacity=".13"/>
<path d="M159 104Q155 80 171 65" fill="none" stroke="#29466b" stroke-width="8" stroke-linecap="round"/>
<path d="M168 85Q190 58 215 77Q193 104 168 85Z" fill="#7fb3c9" stroke="#29466b" stroke-width="3"/><path d="M173 85l30-6" stroke="#29466b" stroke-width="2"/>
<path d="M160 111C102 76 75 133 88 182C98 229 118 261 160 244C204 261 224 220 233 176C242 126 209 79 160 111Z" fill="url(#red)" stroke="#29466b" stroke-width="4"/>
<path d="M186 111C222 130 227 200 196 234Q218 221 232 176Q242 125 208 104Z" fill="url(#hatch)"/>
<path d="M112 133Q100 154 108 177" fill="none" stroke="#fff2ce" stroke-width="12" stroke-linecap="round" opacity=".85"/>
<path d="M140 116Q157 127 177 115" fill="none" stroke="#29466b" stroke-width="2.5"/>
''')
post('kite','''
<path d="M160 186C207 205 110 226 157 249C173 257 186 254 184 268" fill="none" stroke="#29466b" stroke-width="3"/>
<path d="M157 216l-20-8 1 18 19-10 18 10 2-17Z" fill="#d34939" stroke="#29466b" stroke-width="2"/>
<path d="M152 247l-17-8-2 15 19-7 16 10 4-15Z" fill="#7fb3c9" stroke="#29466b" stroke-width="2"/>
<path d="M158 58L224 120L160 198L91 124Z" fill="url(#blue)" stroke="#29466b" stroke-width="4" stroke-linejoin="round"/>
<path d="M158 58L160 123L91 124Z" fill="url(#red)"/>
<path d="M160 123L224 120L160 198Z" fill="#d34939"/>
<path d="M158 58L160 198M91 124L224 120" stroke="#29466b" stroke-width="3"/>
<path d="M158 58L160 123L91 124Z" fill="url(#hatch)"/>
<path d="M104 123L158 72L211 119L160 182Z" fill="none" stroke="#fff8e5" stroke-width="2" stroke-dasharray="3 5"/>
''')
post('van','''
<ellipse cx="160" cy="244" rx="88" ry="9" fill="#29466b" opacity=".13"/>
<path d="M79 124Q79 111 92 111H191Q201 111 208 122L240 168V222H79Z" fill="url(#red)" stroke="#29466b" stroke-width="4" stroke-linejoin="round"/>
<path d="M88 120H173V180H88Z" fill="#fff8e5" stroke="#29466b" stroke-width="3"/>
<path d="M90 122l81 56m0-56-81 56" stroke="#7fb3c9" stroke-width="8"/>
<path d="M189 123H201L226 162H189Z" fill="url(#blue)" stroke="#29466b" stroke-width="3"/>
<path d="M191 130l23 28" stroke="#fff8e5" stroke-width="5"/>
<path d="M181 119V214M190 179h12" stroke="#29466b" stroke-width="3"/>
<path d="M81 199H238V220H81Z" fill="url(#hatch)"/>
<rect x="73" y="213" width="173" height="13" rx="4" fill="#b9dce6" stroke="#29466b" stroke-width="3"/>
<path d="M231 182h10v14h-10" fill="#fff2ce" stroke="#29466b" stroke-width="2"/>
<g fill="#29466b" stroke="#fff8e5" stroke-width="3"><circle cx="111" cy="225" r="21"/><circle cx="209" cy="225" r="21"/></g>
<g fill="#b9dce6"><circle cx="111" cy="225" r="9"/><circle cx="209" cy="225" r="9"/></g>
''')
nightdefs='''
<radialGradient id="moon"><stop stop-color="#fff9df"/><stop offset=".65" stop-color="#f7e6bd"/><stop offset="1" stop-color="#c9b7cf"/></radialGradient>
<radialGradient id="plum" cx=".32" cy=".25" r=".85"><stop stop-color="#e0d3f3"/><stop offset=".5" stop-color="#9da7d9"/><stop offset="1" stop-color="#655484"/></radialGradient>
<radialGradient id="peach" cx=".3" cy=".2" r=".9"><stop stop-color="#ffe4bf"/><stop offset=".5" stop-color="#f2b294"/><stop offset="1" stop-color="#ac6a83"/></radialGradient>
<linearGradient id="cream" x2=".4" y2="1"><stop stop-color="#fff9e8"/><stop offset="1" stop-color="#d8c9e8"/></linearGradient>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>'''
stars='''<g fill="#edc685" stroke="#655484" stroke-width=".7"><path d="M60 94l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"/><path d="M256 174l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"/><circle cx="243" cy="65" r="2.5"/><circle cx="83" cy="238" r="2"/></g>'''
def night(word, art): svg('moonboat',word,nightdefs,stars+art)
night('moon','''
<path d="M215 49C116 44 76 150 127 226C161 276 224 272 255 224C175 249 118 151 215 49Z" fill="#fff0cf" opacity=".45" filter="url(#glow)"/>
<path d="M215 49C116 44 76 150 127 226C161 276 224 272 255 224C175 249 118 151 215 49Z" fill="url(#moon)" stroke="#655484" stroke-width="3" stroke-linejoin="round"/>
<path d="M192 56C100 71 86 171 134 229" fill="none" stroke="#fff9e8" stroke-width="5" stroke-linecap="round"/>
<g fill="#b5a5c1" opacity=".48"><ellipse cx="131" cy="136" rx="10" ry="15" transform="rotate(25 131 136)"/><circle cx="142" cy="214" r="11"/><circle cx="119" cy="177" r="5"/><ellipse cx="180" cy="243" rx="12" ry="5"/></g>
<g fill="none" stroke="#fff9e8" stroke-width="2" opacity=".7"><path d="M125 147q-7-16 7-25M134 218q-4-13 11-15"/></g>
''')
# Eight distinct arms, each with its own visible rounded end.
arms=[('M116 166C93 154 65 157 66 185C67 200 48 202 49 186', '#9da7d9'),('M123 183C96 184 79 206 92 225C103 241 83 253 74 241','#b6b5e1'),('M138 195C115 215 111 237 126 249C139 260 126 275 116 267','#9da7d9'),('M154 200C141 224 143 249 154 263','#b6b5e1'),('M169 200C184 228 178 250 171 267','#9da7d9'),('M183 195C207 215 211 240 195 250C181 261 200 278 210 264','#b6b5e1'),('M197 183C222 183 239 207 226 227C214 244 237 254 246 239','#9da7d9'),('M202 167C225 153 253 158 253 185C253 203 274 202 273 185','#b6b5e1')]
armart=''.join(f'<path d="{d}" fill="none" stroke="#655484" stroke-width="22" stroke-linecap="round"/><path d="{d}" fill="none" stroke="{c}" stroke-width="16" stroke-linecap="round"/>' for d,c in arms)
night('octopus',armart+'''
<path d="M105 149C102 94 121 62 160 62C202 62 219 101 214 151C210 190 189 210 160 210C126 210 107 189 105 149Z" fill="url(#plum)" stroke="#655484" stroke-width="3"/>
<path d="M117 128C115 94 135 74 156 73" fill="none" stroke="#fff9e8" stroke-width="5" opacity=".8" stroke-linecap="round"/>
<g fill="#fff9e8"><ellipse cx="138" cy="151" rx="12" ry="16"/><ellipse cx="181" cy="151" rx="12" ry="16"/></g>
<g fill="#373750"><ellipse cx="141" cy="153" rx="6" ry="10"/><ellipse cx="178" cy="153" rx="6" ry="10"/></g>
<g fill="#fff9e8"><circle cx="143" cy="148" r="2.5"/><circle cx="180" cy="148" r="2.5"/></g>
<g fill="#f2b294" opacity=".75"><ellipse cx="126" cy="174" rx="10" ry="5"/><ellipse cx="192" cy="174" rx="10" ry="5"/></g>
<path d="M154 180q6 7 12 0" fill="none" stroke="#655484" stroke-width="2.5" stroke-linecap="round"/>
<g fill="#f7e6df"><circle cx="88" cy="211" r="3"/><circle cx="124" cy="238" r="3"/><circle cx="152" cy="248" r="3"/><circle cx="181" cy="237" r="3"/><circle cx="231" cy="213" r="3"/><circle cx="66" cy="182" r="3"/><circle cx="253" cy="182" r="3"/><circle cx="194" cy="251" r="3"/></g>
''')
night('fox','''
<path d="M180 196C223 173 274 202 252 247C234 281 182 276 143 250Z" fill="url(#peach)" stroke="#655484" stroke-width="3"/>
<path d="M234 201C273 211 262 255 227 265L213 249L233 245L221 231L242 226Z" fill="url(#cream)"/>
<path d="M119 179C97 197 97 245 115 262H193C206 230 193 194 177 180Z" fill="url(#peach)" stroke="#655484" stroke-width="3"/>
<path d="M133 193Q117 220 130 252H167Q181 220 165 195Z" fill="url(#cream)"/>
<path d="M98 136L92 61L140 92Q160 85 181 93L227 63L218 141L202 176L159 200L115 176Z" fill="url(#peach)" stroke="#655484" stroke-width="3" stroke-linejoin="round"/>
<path d="M103 80L108 120L128 98ZM212 82L184 103L210 120Z" fill="#655484"/>
<path d="M99 139Q127 133 159 179Q188 134 218 141L201 174L159 200L116 174Z" fill="url(#cream)"/>
<path d="M120 140q10-8 19 3m41 0q10-11 20-3" fill="none" stroke="#373750" stroke-width="4" stroke-linecap="round"/>
<path d="M148 177Q159 170 170 177L159 187Z" fill="#373750"/>
<path d="M104 130L101 77M111 259h26m24 0h28" fill="none" stroke="#fff9e8" stroke-width="4" stroke-linecap="round"/>
''')
candydefs='''
<radialGradient id="pink" cx=".28" cy=".2" r=".9"><stop stop-color="#ffc5e7"/><stop offset=".45" stop-color="#ee6bbd"/><stop offset="1" stop-color="#b41468"/></radialGradient>
<radialGradient id="mint" cx=".25" cy=".18" r=".9"><stop stop-color="#cffff2"/><stop offset=".5" stop-color="#61ead7"/><stop offset="1" stop-color="#199aaf"/></radialGradient>
<radialGradient id="yellow" cx=".3" cy=".2" r=".9"><stop stop-color="#fff5ba"/><stop offset=".6" stop-color="#ffcd38"/><stop offset="1" stop-color="#e58a35"/></radialGradient>
<radialGradient id="white" cx=".3" cy=".2" r=".85"><stop stop-color="#ffffff"/><stop offset=".65" stop-color="#fff5fb"/><stop offset="1" stop-color="#d9b3df"/></radialGradient>
<clipPath id="ball"><circle cx="160" cy="162" r="99"/></clipPath>'''
sparkles='''<g fill="#fff5fb" stroke="#b41468" stroke-width="1.4"><path d="M65 75l3 10 10 3-10 3-3 10-3-10-10-3 10-3Z"/><path d="M259 213l3 10 10 3-10 3-3 10-3-10-10-3 10-3Z"/></g>'''
def candy(word,art): svg('ribbon-road',word,candydefs,sparkles+art)
candy('rabbit','''
<ellipse cx="162" cy="274" rx="78" ry="9" fill="#b41468" opacity=".13"/>
<circle cx="222" cy="218" r="24" fill="url(#white)" stroke="#432045" stroke-width="3"/>
<ellipse cx="160" cy="211" rx="60" ry="60" fill="url(#white)" stroke="#432045" stroke-width="3"/>
<ellipse cx="118" cy="260" rx="29" ry="13" fill="url(#white)" stroke="#432045" stroke-width="3"/><ellipse cx="194" cy="260" rx="29" ry="13" fill="url(#white)" stroke="#432045" stroke-width="3"/>
<path d="M118 121C83 68 102 28 119 36C138 45 145 90 141 117M170 116C170 72 197 21 214 39C230 57 205 103 191 127" fill="url(#white)" stroke="#432045" stroke-width="3"/>
<path d="M123 106Q103 56 117 50Q129 57 130 107M184 108Q190 58 205 49Q214 57 192 112" fill="url(#pink)"/>
<path d="M102 145C101 110 129 97 159 102C189 99 216 117 216 149C216 185 189 201 159 201C125 201 99 180 102 145Z" fill="url(#white)" stroke="#432045" stroke-width="3"/>
<g fill="#432045"><ellipse cx="135" cy="145" rx="6" ry="10"/><ellipse cx="183" cy="145" rx="6" ry="10"/></g>
<g fill="white"><circle cx="137" cy="141" r="2.5"/><circle cx="185" cy="141" r="2.5"/></g>
<g fill="#ee6bbd" opacity=".5"><ellipse cx="121" cy="164" rx="11" ry="6"/><ellipse cx="199" cy="164" rx="11" ry="6"/></g>
<path d="M152 165Q159 159 166 165L159 172Z" fill="#b41468"/><path d="M159 171v6m0-1q-8 7-13 0m13 0q8 7 13 0" fill="none" stroke="#432045" stroke-width="2" stroke-linecap="round"/>
<path d="M154 204C126 177 114 195 126 217C131 227 146 219 158 212C170 227 194 228 194 211C194 184 177 189 164 203" fill="url(#mint)" stroke="#432045" stroke-width="3"/>
<rect x="152" y="200" width="16" height="18" rx="6" fill="url(#yellow)" stroke="#432045" stroke-width="2"/>
<path d="M117 127q10-15 26-15M111 218q-2 14 5 23" fill="none" stroke="white" stroke-width="6" stroke-linecap="round"/>
''')
candy('umbrella','''
<path d="M161 65V233C161 273 212 273 212 238" fill="none" stroke="#432045" stroke-width="16" stroke-linecap="round"/>
<path d="M161 65V233C161 273 212 273 212 238" fill="none" stroke="url(#yellow)" stroke-width="10" stroke-linecap="round"/>
<path d="M159 59V44" stroke="#432045" stroke-width="8" stroke-linecap="round"/>
<path d="M49 173Q66 77 159 59Q252 77 271 173Q241 145 215 173Q187 147 160 175Q132 147 105 173Q77 145 49 173Z" fill="url(#pink)" stroke="#432045" stroke-width="3" stroke-linejoin="round"/>
<path d="M159 59Q111 98 105 173Q133 147 160 175Q187 147 215 173Q207 97 159 59Z" fill="url(#mint)" stroke="#432045" stroke-width="2"/>
<path d="M159 59Q146 99 160 175Q187 147 215 173Q207 97 159 59Z" fill="url(#yellow)" stroke="#432045" stroke-width="2"/>
<path d="M159 59Q252 77 271 173Q241 145 215 173Q207 97 159 59Z" fill="url(#pink)" stroke="#432045" stroke-width="2"/>
<path d="M75 131Q94 91 130 81M172 78Q192 101 197 125" fill="none" stroke="white" stroke-width="8" stroke-linecap="round" opacity=".75"/>
<path d="M156 207Q124 181 128 207Q133 227 156 213Q180 233 188 212Q194 189 165 206Z" fill="url(#pink)" stroke="#432045" stroke-width="2"/><circle cx="161" cy="209" r="7" fill="url(#yellow)" stroke="#432045" stroke-width="2"/>
''')
candy('ball','''
<ellipse cx="160" cy="273" rx="81" ry="10" fill="#b41468" opacity=".13"/>
<circle cx="160" cy="162" r="99" fill="url(#yellow)" stroke="#432045" stroke-width="3"/>
<g clip-path="url(#ball)" stroke="#432045" stroke-width="2.5">
<path d="M83 94C125 155 184 205 248 213L274 136C191 156 142 112 126 51Z" fill="url(#mint)"/>
<path d="M95 78C112 142 132 197 104 253L178 276C205 182 149 133 134 60Z" fill="url(#pink)"/>
<path d="M184 57C216 87 238 101 266 94L276 132C237 142 208 102 184 57Z" fill="url(#pink)"/>
<path d="M46 170Q78 197 117 189L111 222Q82 233 49 212Z" fill="url(#yellow)"/>
</g>
<circle cx="160" cy="162" r="99" fill="none" stroke="#432045" stroke-width="3"/>
<path d="M89 127Q101 99 121 91" fill="none" stroke="white" stroke-width="13" stroke-linecap="round" opacity=".85"/>
<ellipse cx="130" cy="85" rx="5" ry="4" fill="white" opacity=".85"/>
<path d="M218 224q-17 20-42 23" fill="none" stroke="#fff5fb" stroke-width="4" stroke-linecap="round" opacity=".6"/>
''')

layouts=[
 ('letter-post','01','Letter Post','Illustrated air mail','Navy contours, warm paper and the texture of a small letterpress print.', ['apple','kite','van'],[('Cream paper','#faf2df','#253f65'),('Rose paper','#f9dfed','#542843'),('Night post','#182b43','#fff3d8')]),
 ('moonboat','02','Moonboat','Little night stories','Moonlit edges, gentle gradients and tiny gold stars.', ['moon','octopus','fox'],[('Night voyage','#191d39','#f7f0e8'),('Cloud day','#e7edf3','#343c65'),('Plum night','#30223e','#fff0df')]),
 ('ribbon-road','03','Ribbon Road','Candy cupboard','Rounded toy shapes, glossy light and a little ribbon magic.', ['rabbit','umbrella','ball'],[('Pink ribbon','#ffd2eb','#432045'),('Lavender ribbon','#e3d4ff','#342466'),('Sunny ribbon','#fff1a6','#202752')])]
sections=[]
for folder,num,name,sub,description,words,themes in layouts:
 bg,ink=themes[0][1:]
 cards=''.join(f'<figure><img src="{folder}/{w}.svg" alt="{w}" width="320" height="320"><figcaption>{w}</figcaption></figure>' for w in words)
 strips=''
 for label,color,text in themes[1:]:
  imgs=''.join(f'<figure><img src="{folder}/{w}.svg" alt="{w}" width="96" height="96"><figcaption>{w}</figcaption></figure>' for w in words)
  strips+=f'<div class="theme" style="background:{color};color:{text}"><span>{label}</span><div class="minis">{imgs}</div></div>'
 sections.append(f'''<section id="{folder}" style="--bg:{bg};--ink:{ink}"><header><div><span class="kicker">{num} / {sub}</span><h2>{name}</h2></div><p>{description}</p></header><div class="cards">{cards}</div><div class="theme-caption">Above: {themes[0][0]} · The same art in the other themes</div><div class="themes">{strips}</div></section>''')
(ROOT/'index.html').write_text('''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Word pictures · Nine little illustrations</title><link rel="stylesheet" href="preview.css"></head><body>
<main><div class="intro"><span class="kicker">A little picture collection</span><h1>Nine words.<br>Three worlds.</h1><p>Familiar things, with a little more wonder.<br>Original illustrations for Letter Post, Moonboat and Ribbon Road.</p><nav aria-label="Collections"><a href="#letter-post">Letter Post ↗</a><a href="#moonboat">Moonboat ↗</a><a href="#ribbon-road">Ribbon Road ↗</a></nav></div>
'''+ '\n'.join(sections)+'''<footer>Nine original SVG illustrations · Word labels sit outside the artwork · Stand-alone art preview</footer></main></body></html>\n''')
print('Built nine SVG pictures and index.html.')
