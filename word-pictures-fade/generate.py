#!/usr/bin/env python3
"""Rebuild the 52 alpha-only fades from the current game WebPs (Pillow, NumPy)."""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
WORDS = 'apple ball cat duck egg fish goat hat insect jellyfish kite leaf moon nest octopus pig quilt rabbit sun tiger umbrella van web fox yak zebra'.split()
PURPLE_SUBJECTS = {'goat', 'cat', 'zebra', 'rabbit', 'tiger', 'yak'}
GAMES = {'moonboat': 'v3-moonboat', 'ribbon-road': 'v4-silk-thread'}


def smoothstep(low, high, value):
    t = np.clip((value - low) / (high - low), 0, 1)
    return t * t * (3 - 2 * t)


def fade(source, moonboat, preserve_purple=False):
    rgba = np.array(source.convert('RGBA').resize((512, 512), Image.Resampling.LANCZOS))
    y, x = np.mgrid[:512, :512]
    # A broad, rounded feather; no crop, scaling of the subject, or RGB repainting.
    radius = (abs((x - 255.5) / 255.5) ** 4 + abs((y - 255.5) / 255.5) ** 4) ** .25
    alpha = 1 - smoothstep(.62, 1, radius)
    if moonboat:
        # Let the navy atmosphere disappear on light cards while retaining the
        # bright artwork and stars. This is a continuous alpha fade, not a cutout.
        rgb = rgba[:, :, :3].astype(float)
        brightness = np.maximum(rgb[:, :, 0], rgb[:, :, 1])
        blue = smoothstep(0, 22, rgb[:, :, 2] - brightness)
        # Keep purple subject shading (goat feet, cat fur, zebra stripes).
        purple = smoothstep(0, 12, rgb[:, :, 0] - rgb[:, :, 1]) * smoothstep(35, 65, rgb[:, :, 0])
        if preserve_purple:
            blue *= 1 - purple
        atmosphere = smoothstep(35, 155, brightness) ** 2
        alpha *= 1 - blue * (1 - atmosphere)
    rgba[:, :, 3] = np.rint(rgba[:, :, 3] * alpha).astype('uint8')
    return Image.fromarray(rgba)


def main():
    for name, game in GAMES.items():
        target = ROOT / name
        target.mkdir(exist_ok=True)
        for word in WORDS:
            with Image.open(ROOT.parent / game / 'pictures' / f'{word}.webp') as source:
                image = fade(source, name == 'moonboat', word in PURPLE_SUBJECTS)
            image.save(target / f'{word}.webp', lossless=True, exact=True, method=6)
    print('Wrote 52 lossless 512×512 RGBA WebPs.')


if __name__ == '__main__':
    main()
