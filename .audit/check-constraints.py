#!/usr/bin/env python3
"""Gate for a shard's working-tree changes against the standing constraints.
Exit 1 on any violation. Prints every check.
  - reference files (dashboard + shell + foundation) untouched
  - e2e/, tests, config, and the audit's frozen sources (.audit/design-system.md,
    vercel-rules.md, PLAN.md, baselines, shards, prompts, scripts) untouched
  - only files inside the shard (plus the two locale files) were modified; no file deleted
  - per-file heuristics (net loss of a token, staged + unstaged vs HEAD): no removed
    `export` (declaration, list, default, re-export), no removed `on<Event>={` handler,
    no removed hook call (useEffect/useLayoutEffect/useMemo/useCallback), no removed
    JSX conditional (`{cond &&` / `{cond ?`)
Usage: python3 .audit/check-constraints.py <shard-file>
"""
import json, os, re, subprocess, sys
from collections import Counter, defaultdict
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def sh(*a): return subprocess.run(a, cwd=ROOT, capture_output=True, text=True).stdout
shard_file = sys.argv[1]
shard_files = set(l.split('\t', 1)[1].strip() for l in open(os.path.join(ROOT, shard_file)) if l.strip() and not l.startswith('#'))
c = json.load(open(os.path.join(ROOT, '.audit', 'reference-closures.json')))
reference = set('src/' + f for f in c['dashboard'] + c['shell']) | {'src/app/index.css', 'tailwind.config.ts', 'index.html'}
allowed_extra = {'src/shared/i18n/locales/en.json', 'src/shared/i18n/locales/ar.json'}
audit_scratch_prefixes = ('.audit/findings/', '.audit/logs/', '.audit/visual/')
audit_scratch_files = {'.audit/lint-current.json', '.audit/run-summary.md'}
protected_config = {'eslint.config.js', 'package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.node.json',
                    'vite.config.ts', 'postcss.config.js', 'playwright.config.ts', '.gitignore', '.env', '.env.example'}
# one NUL-separated record per file, no rename pairing, no C-quoting
raw = subprocess.run(['git', 'status', '--porcelain=v1', '-z', '--untracked-files=all', '--no-renames'],
                     cwd=ROOT, capture_output=True, text=True).stdout
changed = {}
for rec in raw.split('\0'):
    if rec: changed[rec[3:]] = rec[:2]
violations = []
for f in sorted(changed):
    st = changed[f]
    if f in reference: violations.append(f'REFERENCE FILE MODIFIED: {f}'); continue
    if f.startswith('e2e/__screenshots__/'): continue  # baselines are expected to move (pre-fix re-baseline + fix)
    if f.startswith('e2e/') or re.search(r'\.(test|spec)\.', f): violations.append(f'TEST/E2E MODIFIED: {f}'); continue
    if f.startswith(audit_scratch_prefixes) or f in audit_scratch_files: continue
    if f.startswith('.audit/'): violations.append(f'AUDIT SOURCE-OF-TRUTH MODIFIED: {f}'); continue
    if f in protected_config: violations.append(f'CONFIG MODIFIED: {f}'); continue
    if 'D' in st: violations.append(f'FILE DELETED: {f}'); continue
    if f in allowed_extra: continue
    if f not in shard_files: violations.append(f'OUT-OF-SHARD FILE MODIFIED: {f}')
# staged + unstaged vs HEAD, bucketed per file
diff = sh('git', 'diff', 'HEAD', '-U0', '--', 'src')
removed, added, cur = defaultdict(list), defaultdict(list), None
for line in diff.splitlines():
    if line.startswith('diff --git'):
        cur = line.split(' b/', 1)[-1]; continue
    if line.startswith(('---', '+++', '@@')) or cur is None: continue
    if line.startswith('-'): removed[cur].append(line[1:])
    elif line.startswith('+'): added[cur].append(line[1:])
PATTERNS = [
    (r'export\s+(?:default\s+)?(?:async\s+)?(?:function|const|let|class|type|interface|enum)\s+\w+', 'EXPORT'),
    (r'export\s*\{[^}]*\}', 'EXPORT LIST'),
    (r'export\s+default\s+\w+\s*;', 'DEFAULT EXPORT'),
    (r'export\s+\*\s+(?:as\s+\w+\s+)?from\s+["\'][^"\']+["\']', 'RE-EXPORT'),
    (r'\bon[A-Z]\w*=\{', 'HANDLER'),
    (r'\b(?:useEffect|useLayoutEffect|useMemo|useCallback)\(', 'HOOK'),
    (r'\{[^{}<]*?(?:&&|\?)(?=[^{}]*(?:<|\(\s*$))', 'JSX CONDITIONAL'),
]
for f in sorted(set(removed) | set(added)):
    for pat, label in PATTERNS:
        rem = Counter(m.group(0).strip() for r in removed[f] for m in re.finditer(pat, r))
        add = Counter(m.group(0).strip() for a in added[f] for m in re.finditer(pat, a))
        for tok, n in rem.items():
            if n > add.get(tok, 0):
                violations.append(f'{label} REMOVED in {f}: `{tok[:90]}` (x{n - add.get(tok, 0)})')
print(f'changed files: {len(changed)}')
for f in sorted(changed): print(f'   {changed[f]} {f}')
if violations:
    print('CONSTRAINT VIOLATIONS:'); [print('  ✘', v) for v in violations]; sys.exit(1)
print('constraints: OK')
