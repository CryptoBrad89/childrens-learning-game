"""Rebuild the complete, versioned offline game asset list."""
from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parents[1]
folders = ['home', 'accounts', 'grown-ups', 'audio', 'v1-letter-post', 'v3-moonboat', 'v4-silk-thread']
allowed = {'.html', '.js', '.css', '.woff2', '.jpg', '.png', '.svg', '.mp3', '.wav', '.ogg', '.m4a'}
files = [root / 'index.html', root / 'audio-map.js']
for folder in folders:
    files.extend(path for path in (root / folder).rglob('*') if path.is_file() and path.suffix in allowed)
files.sort()
version = hashlib.sha256()
for path in files:
    version.update(path.relative_to(root).as_posix().encode())
    version.update(path.read_bytes())
manifest = {'version': version.hexdigest()[:16], 'files': ['./' + p.relative_to(root).as_posix() for p in files]}
(root / 'sw-assets.js').write_text('self.OFFLINE_MANIFEST = ' + json.dumps(manifest, indent=2) + ';\n')
print(f'Offline manifest contains {len(files)} files, version {manifest["version"]}.')
