#!/usr/bin/env python3
"""Rebuild round 2 from the 52 permitted originals; Pillow and NumPy required."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
SOURCE = Path('/workspace/lwl-pictures/elevenlabs/full')
WORDS = 'apple ball cat duck egg fish goat hat insect jellyfish kite leaf moon nest octopus pig quilt rabbit sun tiger umbrella van web fox yak zebra'.split()
GAMES = {'moonboat': 'v3-moonboat', 'ribbon-road': 'v4-silk-thread'}
SIZE = 512


def mask(game):
    y, x = np.mgrid[:SIZE, :SIZE].astype(float)
    x, y = abs(x - 255.5), abs(y - 255.5)
    if game == 'moonboat':
        # Opaque to radius 218; a smooth radial fade ends before the image edge.
        t = (np.hypot(x, y) - 218) / 36
    else:
        # .silk .choice: radius 36px / minimum card height 250px.
        radius = SIZE * 36 / 250
        qx, qy = x - (254 - radius), y - (254 - radius)
        distance = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - radius
        t = (distance + 30) / 30
    t = np.clip(t, 0, 1)
    return np.rint(255 * (1 - t * t * (3 - 2 * t))).astype(np.uint8)


def color_plane(source, game):
    if game == 'moonboat':
        # Keep the whole source centered at 420px; extend only its background
        # border by repeating the outermost RGB pixels, without moving subjects.
        rgb = np.asarray(source.convert('RGB').resize((420, 420), Image.Resampling.LANCZOS))
        return np.pad(rgb, ((46, 46), (46, 46), (0, 0)), mode='edge')
    return np.asarray(source.convert('RGB').resize((SIZE, SIZE), Image.Resampling.LANCZOS))


def main():
    manifest = {'size': SIZE, 'format': 'lossless WebP', 'moonboat_source_size': 420,
                'moonboat_opaque_radius': 218, 'moonboat_outer_radius': 254,
                'ribbon_outer_half_size': 254, 'ribbon_corner_radius': SIZE * 36 / 250,
                'ribbon_fade_width': 30, 'pictures': []}
    for game in GAMES:
        alpha = mask(game)
        (ROOT / game).mkdir(exist_ok=True)
        for word in WORDS:
            path = SOURCE / game / f'{word}.png'
            with Image.open(path) as source:
                rgba = np.dstack((color_plane(source, game), alpha))
            output = ROOT / game / f'{word}.webp'
            Image.fromarray(rgba).save(output, 'WEBP', lossless=True, exact=True, method=6)
            manifest['pictures'].append({'game': game, 'word': word,
                'source_sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                'output_sha256': hashlib.sha256(output.read_bytes()).hexdigest()})
    (ROOT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print('Generated 52 lossless 512px RGBA WebPs with two fixed geometric masks.')


if __name__ == '__main__':
    main()
