#!/usr/bin/env python3
"""Compare current ESLint output against .audit/baseline-lint.json.
Exit 1 if any (file, rule, message) appears more times than in the baseline, or eslint produced no JSON.
Usage: python3 .audit/lint-diff.py [current.json]   (runs eslint itself when no file given)
"""
import json, subprocess, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def load(path):
    out = {}
    try:
        data = json.load(open(path))
    except Exception as e:
        print(f'lint: could not read JSON from {path} ({e}) — eslint crashed or config error'); sys.exit(1)
    for f in data:
        rel = os.path.relpath(f['filePath'], ROOT)
        for m in f['messages']:
            k = (rel, m['ruleId'], m['message']); out[k] = out.get(k, 0) + 1
    return out
if len(sys.argv) > 1:
    cur_path = sys.argv[1]
else:
    cur_path = os.path.join(ROOT, '.audit', 'lint-current.json')
    with open(cur_path, 'w') as fh:
        subprocess.run(['npx', 'eslint', 'src', '--format', 'json'], cwd=ROOT, stdout=fh, stderr=subprocess.DEVNULL)
base = load(os.path.join(ROOT, '.audit', 'baseline-lint.json')); cur = load(cur_path)
new = [(k, v - base.get(k, 0)) for k, v in cur.items() if v > base.get(k, 0)]
print(f'lint: baseline {sum(base.values())} messages, now {sum(cur.values())}, NEW {len(new)}')
for (f, rule, msg), n in new:
    print(f'  NEW x{n}  {f}  [{rule}]  {msg}')
sys.exit(1 if new else 0)
