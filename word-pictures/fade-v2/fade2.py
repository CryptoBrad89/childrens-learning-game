"""Round 2 fade: fixed, centered geometric mask per game (no object-driven mask).
Moonboat = circular radial fade, Ribbon Road = rounded-square fade (card-like corner radius).
Each picture keeps a band of its own ElevenLabs background and only fades toward the outer edge.
Per-picture tweak: if the subject would reach into the fade, the fade's inner edge is pushed outward
by the same amount on every side (still centred and symmetric), so the subject is never faded. Subject extents are only
measured (from cutout masks) to choose that scale and to verify nothing is clipped."""
import numpy as np, os, sys, json
from PIL import Image
S='/workspace/lwl-pictures/elevenlabs/full/'
N=1024
WS='apple ball cat duck egg fish goat hat insect jellyfish kite leaf moon nest octopus pig quilt rabbit sun tiger umbrella van web fox yak zebra'.split()
def ss(x,a,b):
    t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)
def grid(n):
    yy,xx=np.mgrid[-1:1:n*1j,-1:1:n*1j]; return xx,yy
# --- the two fixed masks (coordinates in [-1,1], 1 = image edge) ---
def mask_circle(xx,yy,k=0.0):
    # k pushes the start of the fade outward (symmetric) for pictures whose subject is large
    r=np.hypot(xx,yy)
    return 1-ss(r,0.68+k,0.985)
RC=0.40   # corner radius = 20% of the tile width, matching the card's 36px corners on ~180px art
def mask_rsq(xx,yy,k=0.0):
    qx=np.abs(xx)-(1-RC); qy=np.abs(yy)-(1-RC)
    outside=np.hypot(np.maximum(qx,0),np.maximum(qy,0))+np.minimum(np.maximum(qx,qy),0)-RC  # signed dist, <0 inside
    d=-outside   # distance inside the rounded square
    return ss(d,0.015,0.27-k)
MASK={'moonboat':mask_circle,'ribbon-road':mask_rsq}
def subject_pts(g,w):
    m=np.asarray(Image.open(f'masks/u2net-{g}-{w}.png').convert('L').resize((256,256)))>128
    xx,yy=grid(256); return xx[m],yy[m]
KMAX={'moonboat':0.22,'ribbon-road':0.17}   # fade never narrower than ~0.085 of the half-width
def pick_scale(g,w,need=0.85):
    px,py=subject_pts(g,w)
    for k in np.arange(0,KMAX[g]+1e-6,0.01):
        a=np.percentile(MASK[g](px,py,k),0.5)
        if a>=need: break
    return round(float(k),2), round(float(a),3)
def make(g,w):
    k,amin=pick_scale(g,w)
    n=N
    im=Image.open(S+f'{g}/{w}.png').convert('RGB').resize((n,n),Image.LANCZOS)
    xx,yy=grid(n)
    a=(MASK[g](xx,yy,k)*255).astype(np.uint8)
    rgba=np.dstack([np.asarray(im),a])
    canvas=Image.new('RGBA',(N,N),(0,0,0,0)); off=(N-n)//2
    canvas.paste(Image.fromarray(rgba,'RGBA'),(off,off))
    out=canvas.resize((512,512),Image.LANCZOS)
    p=f'/workspace/lwl-pictures/fade/mine-v2/{g}/{w}'; os.makedirs(os.path.dirname(p),exist_ok=True)
    out.save(p+'.png',optimize=True); out.save(p+'.webp',lossless=True,quality=85,method=6)
    return k,amin
if __name__=='__main__':
    rep={}
    for g in sys.argv[1].split(','):
        for w in (sys.argv[2:] or WS):
            rep[f'{g}/{w}']=make(g,w); print(g,w,rep[f'{g}/{w}'],flush=True)
    json.dump(rep,open('/workspace/lwl-pictures/fade/mine-v2/fade-tweaks.json','w'),indent=1)
