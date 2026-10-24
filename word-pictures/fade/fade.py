import numpy as np, sys, os
from PIL import Image, ImageFilter
from scipy import ndimage
S='/workspace/lwl-pictures/elevenlabs/full/'
N=1024
WS='apple ball cat duck egg fish goat hat insect jellyfish kite leaf moon nest octopus pig quilt rabbit sun tiger umbrella van web fox yak zebra'.split()
yy,xx=np.mgrid[-1:1:N*1j,-1:1:N*1j]
def sdist(p): return (np.abs(xx)**p+np.abs(yy)**p)**(1/p)
def ss(x,a,b):
    t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)
def blur(a,s): return ndimage.gaussian_filter(a,s)
def subj(g,w):
    m=[np.asarray(Image.open(f'masks/{k}-{g}-{w}.png').convert('L')).astype(np.float32)/255 for k in ('u2net','isnet-general-use')]
    m=np.maximum(m[0],m[1])
    # keep only the main subject: drop stray background ribbons/sparkles the cutter picked up
    lab,n=ndimage.label(m>0.35)
    if n>1:
        sizes=ndimage.sum(np.ones_like(m),lab,range(1,n+1))
        keep=np.isin(lab,1+np.where(sizes>=sizes.max()*0.12)[0])
        m=m*ndimage.binary_dilation(keep,iterations=3)
    return m
def protect(m,grow,soft):
    b=m>0.35
    b=ndimage.binary_dilation(b,iterations=grow)
    return np.clip(blur(b.astype(np.float32),soft)*1.15,0,1)
EDGE=1-ss(sdist(4),0.90,0.995)   # hard guarantee: nothing reaches the square edge
def fade_rr(w):
    im=np.asarray(Image.open(S+f'ribbon-road/{w}.png').convert('RGB').resize((N,N),Image.LANCZOS)).astype(np.float32)
    G=1-ss(sdist(3),0.36,0.90); G=G**1.5
    P=protect(subj('ribbon-road',w),14,10)
    a=np.maximum(G*0.88,P)*EDGE
    return im,a
def fade_mb(w):
    im=np.asarray(Image.open(S+f'moonboat/{w}.png').convert('RGB').resize((N,N),Image.LANCZOS)).astype(np.float32)
    lum=im@np.array([.299,.587,.114],np.float32)
    border=np.concatenate([lum[:24].ravel(),lum[-24:].ravel(),lum[:,:24].ravel(),lum[:,-24:].ravel()])
    navy=np.percentile(border,20)
    L=np.clip((lum-navy)/(150-navy),0,1)**0.8          # how "glowy" a background pixel is
    m=subj('moonboat',w)
    if w=='web':   # the web's disc is navy sky; protect only the bright strands
        m=m*np.clip((L-0.25)/0.3,0,1)
    P=protect(m,6,6)                                    # the subject itself stays solid
    H=protect(m,40,28)                                  # soft halo hugging the subject
    G=1-ss(sdist(2.4),0.20,0.85)
    halo=np.clip(H*0.55+G*0.35,0,1)*np.clip(0.25+L,0,1)  # navy fades out, glow lingers
    a=np.maximum(P,halo)*EDGE
    return im,a
def save(im,a,out):
    a=np.clip(a,0,1)
    rgba=np.dstack([im,a*255]).astype(np.uint8)
    img=Image.fromarray(rgba,'RGBA').resize((512,512),Image.LANCZOS)
    os.makedirs(os.path.dirname(out),exist_ok=True)
    img.save(out+'.png',optimize=True)
    img.save(out+'.webp',lossless=True,quality=85,method=6)
    return img
if __name__=='__main__':
    words=sys.argv[2:] or WS
    for w in words:
        for g in sys.argv[1].split(','):
            im,a=(fade_rr if g=='ribbon-road' else fade_mb)(w)
            save(im,a,f'/workspace/lwl-pictures/fade/mine/{g}/{w}'); print(g,w,flush=True)
