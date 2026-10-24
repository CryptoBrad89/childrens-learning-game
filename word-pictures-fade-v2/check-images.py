#!/usr/bin/env python3
"""Check decoded pixels against source colors and fixed symmetric geometry."""
import hashlib
import json
import numpy as np
from PIL import Image
from generate import ROOT, SOURCE, WORDS, GAMES, mask, color_plane

manifest = json.loads((ROOT / 'manifest.json').read_text())
for game in GAMES:
    expected = mask(game)
    assert np.array_equal(expected, expected[::-1])
    assert np.array_equal(expected, expected[:, ::-1])
    assert np.array_equal(expected, expected.T)
    assert not expected[0].any() and not expected[-1].any()
    assert not expected[:, 0].any() and not expected[:, -1].any()
    assert len(np.unique(expected)) > 200
    for word in WORDS:
        output = ROOT / game / f'{word}.webp'
        with Image.open(output) as image:
            assert image.size == (512, 512) and image.mode == 'RGBA'
            rgba = np.array(image)
        assert np.array_equal(rgba[:, :, 3], expected), (game, word, 'alpha')
        with Image.open(SOURCE / game / f'{word}.png') as source:
            rgb = color_plane(source, game)
        assert np.array_equal(rgba[:, :, :3][expected > 0], rgb[expected > 0]), (game, word, 'source RGB')
        entry = next(p for p in manifest['pictures'] if p['game'] == game and p['word'] == word)
        assert hashlib.sha256(output.read_bytes()).hexdigest() == entry['output_sha256']
    print(f'{game}: 26 passed; identical alpha; horizontal/vertical/diagonal symmetry; transparent perimeter; exact source RGB; {100*np.mean(expected == 255):.1f}% fully opaque canvas')
print('PASS: all 52 decoded images. Subject/background preservation also requires visual review.')
