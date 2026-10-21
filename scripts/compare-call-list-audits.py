"""Compare read-only Supabase fingerprints captured before and after the call list."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
def audit(phase):
    raw = json.loads((root / f'reports/call-list-{phase}-audit.json').read_text())
    content = json.loads(next(c['text'] for c in raw['content'] if c['type'] == 'text'))['result']
    rows = json.loads(re.search(r'<untrusted-data-[^>]+>\n(.*?)\n</untrusted-data-', content, re.S)[1])
    return rows[0]['audit']

before, after = audit('before'), audit('after')
checks = {key: before[key] == after[key] for key in before}
summary = {'checks':checks, 'before_master':before['master'], 'after_master':after['master'], 'before_profile_count':len(before['profiles']), 'after_profile_count':len(after['profiles']), 'all_unchanged':all(checks.values())}
(root / 'reports/call-list-preservation.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
assert summary['all_unchanged'], 'Live state changed; inspect and report differences without restoring anything'
