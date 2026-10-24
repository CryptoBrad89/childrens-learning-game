#!/usr/bin/env python3
"""Read-only, stdlib checks for the standalone game build."""
import argparse
import hashlib
import json
import re
import string
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VOICE = 'FgiNpTIapnCbaD6xiqIo'
MODEL = 'eleven_v4'
GAMES = ('v1-letter-post', 'v3-moonboat')
AUDIO_EXT = {'.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.opus', '.webm'}
EXPECTED = {f'{letter}-{kind}-trim.mp3' for letter in string.ascii_lowercase
            for kind in ('name', 'sound')} | {'i-long-extra-trim.mp3'}
WORDS = dict(zip(string.ascii_uppercase, (
    'apple ball cat duck egg fish goat hat insect jellyfish kite leaf moon '
    'nest octopus pig quilt rabbit sun tiger umbrella van web fox yak zebra'
).split()))


def assignment(path, name):
    match = re.fullmatch(r'window\.' + re.escape(name) + r' = (.*);\s*', path.read_text(), re.S)
    require(match is not None, f'{path.name}: expected a static JSON assignment')
    return json.loads(match[1])


def game_letters(game):
    app = (ROOT / game / 'app.js').read_text()
    match = re.search(r'const letters=(\[.*?\])\.map\(', app, re.S)
    require(match is not None, f'{game}: missing static letter list')
    rows = json.loads(match[1])
    require(isinstance(rows, list) and all(isinstance(row, list) and len(row) == 3 for row in rows),
            f'{game}: invalid letter data')
    return rows


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inside(path):
    resolved = path.resolve()
    require(resolved.is_relative_to(ROOT), f'Path escapes game: {path}')
    return resolved


def approved_audio():
    lines = (ROOT / 'approved/approved-sha256.txt').read_text().splitlines()
    expected = {}
    for line in lines:
        match = re.fullmatch(r'([0-9a-f]{64})\s+([^/\s]+)', line)
        require(match is not None, f'Invalid checksum line: {line}')
        digest, name = match.groups()
        require(name not in expected, f'Duplicate checksum: {name}')
        expected[name] = digest
    require(set(expected) == EXPECTED and len(lines) == 53, 'Manifest must contain exactly the 53 approved filenames')
    folder = ROOT / 'audio/letters'
    require({p.name for p in folder.iterdir()} == EXPECTED, 'Approved directory missing files or has extras')
    for name, digest in expected.items():
        require(sha(folder / name) == digest, f'Approved hash mismatch: {name}')
    return '53 approved clips, exact hashes, no extras'


def trim_metadata():
    data = json.loads((ROOT / 'approved/clips.json').read_text())
    require(data['meta']['voice'] == f'Lucy {VOICE}', 'Trim voice metadata must be Lucy')
    require(data['meta']['model'] == MODEL, 'Trim model metadata must be eleven_v4')
    seen = set()
    by_id = {item['id']: item for item in data['items']}
    for item in data['items']:
        name = Path(item['trimmed']).name
        require(item['trimmed'] == f'audio/{name}', f'Unexpected trim path: {item["trimmed"]}')
        if 'alias' in item:
            target = by_id[item['alias']]
            require(target['trimmed'] == item['trimmed'] and 'alias' not in target,
                    f'Invalid trim alias: {item["id"]}')
        else:
            require(name not in seen, f'Duplicate trimmed item: {name}')
        seen.add(name)
        require((ROOT / 'audio/letters' / name).is_file(), f'Missing trim: {name}')
        duration = item['trim_duration']
        require(type(duration) in (int, float) and 0 < duration <= 1.5, f'Invalid trim duration: {name}')
        require(item['slash_spoken'] is False, f'Slash spoken: {name}')
        require(item['model'] == MODEL, f'Wrong model: {name}')
        if item['kind'] == 'name':
            require(not re.search(r'\bis\b', item['stt_trim'], re.I), f'Name contains "is": {name}')
        require(item['letter'] in string.ascii_uppercase, f'Invalid letter: {name}')
        if name != 'i-long-extra-trim.mp3' and 'alias' not in item:
            require(name == f'{item["letter"].lower()}-{item["kind"]}-trim.mp3', f'Trim item mismatch: {name}')
    require(seen == EXPECTED, 'Trim metadata must cover all 53 approved clips')
    return '54 metadata items / 53 clips (soft G aliases J): duration, slash, voice/model and stored name STT valid'


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for child in value.values():
            yield from strings(child)
    elif isinstance(value, list):
        for child in value:
            yield from strings(child)


def wiring():
    raw = (ROOT / 'audio-map.js').read_text()
    match = re.fullmatch(r'window\.GAME_AUDIO = (.*);\s*', raw, re.S)
    require(match is not None, 'Audio map must be a static JSON assignment')
    audio = json.loads(match[1])
    require(set(audio['letters']) == set(string.ascii_uppercase), 'Audio map must cover A-Z')
    for letter in string.ascii_uppercase:
        require(audio['letters'][letter] == {
            kind: f'../audio/letters/{letter.lower()}-{kind}-trim.mp3'
            for kind in ('name', 'sound')}, f'Wrong approved mapping: {letter}')
    require(audio['longI'] == '../audio/letters/i-long-extra-trim.mp3', 'Missing long-I extra')
    for game in GAMES:
        folder = ROOT / game
        html = (folder / 'index.html').read_text()
        scripts = re.findall(r'<script\b[^>]*\bsrc="([^"]+)"', html)
        require('../audio-map.js' in scripts and scripts.index('../audio-map.js') < scripts.index('app.js'), f'{game}: map must load before app')
        for script in scripts:
            require(inside(folder / script).is_file(), f'{game}: missing script {script}')
        for path in strings(audio):
            require(inside(folder / path).is_file(), f'{game}: missing audio {path}')
        app = (folder / 'app.js').read_text()
        # Guard the approved audio mapping. Browser tests cover playback behavior.
        for fragment in ('const A=window.GAME_AUDIO;', 'new Audio(file)',
                         'return [A.letters[current.letter].name,A.letters[current.letter].sound];',
                         'return A.words[l.word];'):
            require(fragment in app, f'{game}: missing playback wiring {fragment}')
        require(app.count('new Audio(') == 1, f'{game}: unexpected playback entry point')
        require(set(audio['words']) == set(WORDS.values()), 'Picture word map must cover the 26 A-Z words')
    # Scan every game JS/HTML, including files not currently loaded.
    for file in sorted(ROOT.rglob('*')):
        if file.suffix not in {'.js', '.html'}:
            continue
        text = file.read_text()
        for quote, path in re.findall(r'''(["'`])([^"'`\n]+?\.(?:mp3|wav|ogg|m4a|aac|flac|opus|webm))(?:\1)''', text, re.I):
            require('${' not in path, f'Unresolved dynamic audio path: {file.name}: {path}')
            bases = [ROOT / game for game in GAMES] if file.name == 'audio-map.js' else [file.parent]
            for base in bases:
                require(inside(base / path).is_file(), f'Missing audio reference: {file.name}: {path}')
    hub = (ROOT / 'index.html').read_text()
    require(all(f'href="{game}/index.html"' in hub for game in GAMES), 'Hub must link both games')
    return 'both games: A-Z approved maps, long I, playback sites and local audio paths valid'


def voice_inventory(allow):
    entries = json.loads((ROOT / 'voice-manifest.json').read_text())
    require(isinstance(entries, list), 'Voice manifest must be an entry list')
    actual = {f.relative_to(ROOT).as_posix(): f for f in ROOT.rglob('*')
              if f.is_file() and f.suffix.lower() in AUDIO_EXT}
    indexed = {}
    for entry in entries:
        name = entry['file']
        require(name not in indexed, f'Duplicate voice entry: {name}')
        indexed[name] = entry
        for field in ('text', 'voice_id', 'voice_name', 'model', 'provenance', 'sha256'):
            require(entry.get(field), f'Missing voice field {field}: {name}')
    require(set(indexed) == set(actual), f'Voice inventory differs: {sorted(set(indexed) ^ set(actual))}')
    known = {}
    for line in (ROOT / 'VOICE-MISMATCHES.md').read_text().splitlines():
        if line.startswith('| `'):
            cols = [col.strip().strip('`') for col in line.strip('|').split('|')]
            require(len(cols) == 4 and cols[0] not in known, f'Invalid mismatch row: {line}')
            known[cols[0]] = cols[1:]
    failures = []
    for name, entry in indexed.items():
        require(sha(actual[name]) == entry['sha256'], f'Voice hash mismatch: {name}')
        bad = (entry['voice_id'] != VOICE or entry['voice_name'] != 'Lucy'
               or entry['model'] != MODEL
               or 'unknown' in json.dumps([entry['text'], entry['voice_id'], entry['voice_name'], entry['model']]).lower())
        if not bad:
            require(name not in known, f'Stale mismatch row: {name}')
            continue
        current = f'{entry["voice_name"]} ({entry["voice_id"]})'
        row = [entry['text'], current, entry['model']]
        message = f'{name}: {entry["text"]} / {current} / {entry["model"]}'
        if allow and known.get(name) == row:
            print(f'WARN known voice mismatch: {message}')
        else:
            failures.append(message)
    require(set(known) <= set(indexed), 'Mismatch table contains unmanifested audio')
    require(not failures, 'Voice mismatches:\n  ' + '\n  '.join(failures))
    return f'{len(indexed)} audio files inventoried with matching hashes' + (f'; {len(known)} known mismatches allowed' if allow else '')


def alphabet():
    audio = assignment(ROOT / 'audio-map.js', 'GAME_AUDIO')
    manifest = {entry['file']: entry for entry in json.loads((ROOT / 'voice-manifest.json').read_text())}
    for game in GAMES:
        rows = game_letters(game)
        require([row[0] for row in rows] == list(string.ascii_uppercase),
                f'{game}: must list all 26 letters once, in A-Z order')
        for letter, word, sound in rows:
            require(word == WORDS[letter], f'{game}: {letter} must use {WORDS[letter]}')
            require(isinstance(sound, str) and re.fullmatch(r'/[^/\s]+/', sound),
                    f'{game}: missing sound for {letter}')
            clip = inside(ROOT / game / audio['words'][word])
            require(clip.is_file(), f'{game}: missing {word} clip')
            name = clip.relative_to(ROOT).as_posix()
            entry = manifest.get(name)
            require(entry is not None, f'{game}: unmanifested word clip: {name}')
            require((entry.get('voice_id'), entry.get('voice_name'), entry.get('model')) == (VOICE, 'Lucy', MODEL),
                    f'{game}: {word} must be Lucy / eleven_v4')
            require(entry.get('text', '').strip().rstrip('!.').casefold() == word,
                    f'{game}: {word} clip has mismatched text')
            if letter not in 'SATPIM':
                require(name == f'audio/words/word-{word}.mp3', f'{game}: must reuse supplied {word} clip')
            picture = ROOT / game / 'pictures' / f'{word}.webp'
            require(picture.is_file(), f'{game}: missing word picture: {word}')
            require(picture.read_bytes()[:4] == b'RIFF' and picture.read_bytes()[8:12] == b'WEBP',
                    f'{game}: invalid WebP: {word}')
        require(dict((letter, sound) for letter, _, sound in rows)['X'] == '/ks/', f'{game}: X must use /ks/')
    require(game_letters(GAMES[0]) == game_letters(GAMES[1]), 'Games must teach the same A-Z vocabulary')
    return 'both games: 26 ordered letters, supplied words, Lucy/eleven_v4 clips and explicit WebP pictures'


def themes():
    for game in GAMES:
        config = assignment(ROOT / game / 'config.js', 'CONCEPT')
        expected = ['Air mail', 'Candy post', 'Dark'] if config['kind'] == 'post' else ['Dark', 'Cloud day', 'Plum dusk']
        require(config['themes'] == expected, f'{game}: preserve the three themes')
        css = (ROOT / game / 'style.css').read_text()
        base = {}
        overrides = {}
        for match in re.finditer(r'body\.' + config['kind'] + r'(?:\[data-theme="(\d+)"\])?\{([^}]+)\}', css):
            tokens = dict(re.findall(r'(--[\w-]+):([^;}]+)', match[2]))
            if match[1] is None:
                base.update(tokens)
            else:
                overrides.setdefault(int(match[1]), {}).update(tokens)
        brightness = []
        for index, theme in enumerate(config['themes']):
            tokens = dict(base, **overrides.get(index, {}))
            require(all(key in tokens for key in ('--bg', '--ink', '--focus', '--card')),
                    f'{game}: {theme} missing theme colors')
            color = tokens['--bg']
            require(re.fullmatch(r'#[0-9a-fA-F]{6}', color), f'{game}: invalid {theme} background')
            rgb = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
            linear = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in rgb]
            brightness.append(sum(c * weight for c, weight in zip(linear, (.2126, .7152, .0722))))
        require(min(brightness) < .1 and max(brightness) > .6, f'{game}: needs both dark and light themes')
    return 'Letter Post and Moonboat themes retained, with dark and light backgrounds'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--allow-known-mismatches', action='store_true')
    args = parser.parse_args()
    failed = 0
    checks = [('approved audio', approved_audio), ('trim metadata', trim_metadata),
              ('wiring', wiring), ('voice', lambda: voice_inventory(args.allow_known_mismatches)),
              ('alphabet', alphabet), ('themes', themes)]
    for name, check in checks:
        try:
            print(f'PASS {name}: {check()}')
        except (AssertionError, OSError, ValueError, KeyError, TypeError) as exc:
            print(f'FAIL {name}: {exc}')
            failed += 1
    print(f'{len(checks) - failed}/{len(checks)} checks passed ({"allow-known-mismatches" if args.allow_known_mismatches else "strict"})')
    return int(bool(failed))


if __name__ == '__main__':
    sys.exit(main())
