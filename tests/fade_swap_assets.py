"""Verify the approved fade sources, transparent edges, and offline membership."""
import json
import subprocess
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'sw-assets.js').read_text().removeprefix('self.OFFLINE_MANIFEST = ').rstrip(';\n'))
results = []
for game, source in [('v3-moonboat', 'moonboat'), ('v4-silk-thread', 'ribbon-road')]:
    pictures = sorted((root / game / 'pictures').glob('*.webp'))
    assert len(pictures) == 26
    for picture in pictures:
        path = picture.relative_to(root).as_posix()
        expected = subprocess.check_output(['git', 'show', f'8613dae:word-pictures-fade-v2/{source}/{picture.name}'], cwd=root)
        assert picture.read_bytes() == expected, path
        assert './' + path in manifest['files'], path
        image = Image.open(picture).convert('RGBA')
        assert image.size == (512, 512), path
        alpha = image.getchannel('A')
        w, h = image.size
        edges = [(0, 0, w, 1), (0, h-1, w, h), (0, 0, 1, h), (w-1, 0, w, h)]
        assert all(alpha.crop(edge).getextrema() == (0, 0) for edge in edges), path
        assert alpha.getextrema() == (0, 255), path
        results.append({'path': path, 'size': image.size, 'sourceIdentical': True, 'edgeAlphaMax': 0})
for picture in sorted((root / 'v1-letter-post/pictures').glob('*.webp')):
    path = picture.relative_to(root).as_posix()
    assert picture.read_bytes() == subprocess.check_output(['git', 'show', f'b0ef6de:{path}'], cwd=root)
    assert './' + path in manifest['files'], path
out = root / 'reports/fade-swap'
out.mkdir(parents=True, exist_ok=True)
(out / 'assets.json').write_text(json.dumps(results, indent=2) + '\n')
print('PASS: 52 source-identical 512x512 fades, fully transparent edges, all 78 pictures precached, Letter Post bytes unchanged')
