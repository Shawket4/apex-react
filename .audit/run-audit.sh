#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# UI coherence audit runner — loops the shard manifest through headless Claude.
#
#   .audit/run-audit.sh [--phase audit|fix|both] [--shards "023 024"] [--from 007]
#                       [--dry-run] [--model <name>] [--no-commit]
#
# Per shard:
#   audit  → claude -p prompts/audit.md  → .audit/findings/shard-NNN.md   (read-only; any src change is reverted)
#   fix    → claude -p prompts/fix.md    → edits + .audit/findings/shard-NNN.fix.md
#            gates: constraints · tsc · lint-diff · build · playwright (recorded, then re-baselined)
#            pass → one commit per shard   fail → revert shard, write shard-NNN.FAILED, continue
# Full run: AUDIT_CONFIRM_ALL=1 AUDIT_PUSH=1 .audit/run-audit.sh   (a bare invocation refuses to start all 29 shards; AUDIT_PUSH pushes at the end)
# Resume: a shard with .audit/findings/shard-NNN.done is skipped. Delete the marker to redo it.
# Logs:   .audit/logs/shard-NNN.{audit,fix,gates}.log   Visual diffs: .audit/visual/shard-NNN/
# ---------------------------------------------------------------------------
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ORIG_ARGS=("$@")   # kept for the caffeinate re-exec below (the option loop consumes $@)
PHASE="both"; SHARDS=""; FROM=""; DRY_RUN=0; COMMIT=1
MODEL="${AUDIT_MODEL:-}"                      # empty = the CLI's default model
AUDIT_BUDGET="${AUDIT_BUDGET_USD:-12}"        # per audit call
FIX_BUDGET="${FIX_BUDGET_USD:-20}"            # per fix call
TIMEOUT_S="${AUDIT_TIMEOUT_S:-2400}"          # wall clock per claude call (40 min)
BRANCH_EXPECTED="audit/ui-coherence"

while [ $# -gt 0 ]; do
  case "$1" in
    --phase) PHASE="$2"; shift 2 ;;
    --shards) SHARDS="$2"; shift 2 ;;
    --from) FROM="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --model) MODEL="$2"; shift 2 ;;
    --no-commit) COMMIT=0; shift ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "unknown arg: $1"; exit 2 ;;
  esac
done

# Keep the Mac awake for the whole run (idle + system sleep), re-exec once.
if [ -z "${AUDIT_CAFFEINATED:-}" ] && command -v caffeinate >/dev/null 2>&1; then
  export AUDIT_CAFFEINATED=1
  exec caffeinate -i -s "$0" ${ORIG_ARGS[@]+"${ORIG_ARGS[@]}"}
fi

log()  { printf '%s  %s\n' "$(date '+%H:%M:%S')" "$*" | tee -a .audit/logs/run.log; }
die()  { log "FATAL: $*"; exit 1; }

# ---- preconditions ---------------------------------------------------------
mkdir -p .audit/findings .audit/logs .audit/visual
command -v claude >/dev/null 2>&1 || die "claude CLI not on PATH"
command -v perl   >/dev/null 2>&1 || die "perl (used for timeouts) not found"
[ -d node_modules ] || die "node_modules missing — run npm install"
[ -f .audit/PLAN.md ] && [ -f .audit/design-system.md ] && [ -f .audit/vercel-rules.md ] || die "audit sources missing"
[ -f .audit/baseline-lint.json ] || die ".audit/baseline-lint.json missing"
[ -f e2e/storageState.json ] || log "WARN: e2e/storageState.json missing — Playwright will fail on authenticated routes (fix gates will still pass; screenshots just won't be recorded)"
cur_branch="$(git rev-parse --abbrev-ref HEAD)"
[ "$cur_branch" = "$BRANCH_EXPECTED" ] || die "on branch '$cur_branch', expected '$BRANCH_EXPECTED'"
if [ -n "$(git status --porcelain -- src index.html tailwind.config.ts e2e)" ]; then
  die "working tree has uncommitted source changes — commit or stash them first"
fi
unset CLAUDECODE   # allow running from inside a Claude Code session too

REFERENCE_FILES="$(python3 - <<'PY'
import json
c=json.load(open('.audit/reference-closures.json'))
files=sorted(set('src/'+f for f in c['dashboard']+c['shell'])|{'src/app/index.css','tailwind.config.ts','index.html'})
print(', '.join('`'+f+'`' for f in files))
PY
)"

render() {  # render <template> <shard-id> <shard-file>
  python3 - "$1" "$2" "$3" "$REFERENCE_FILES" <<'PY'
import sys
tpl, sid, shard_file, refs = sys.argv[1:5]
s = open(tpl, encoding='utf-8').read()
import json
c = json.load(open('.audit/reference-closures.json'))
ref = set('src/'+f for f in c['dashboard']+c['shell']) | {'src/app/index.css','tailwind.config.ts','index.html'}
lines = [l for l in open(shard_file) if l.strip() and not l.startswith('#')]
files = ''.join(f"- `{l.split(chr(9),1)[1].strip()}` ({l.split(chr(9))[0]} lines)"
                + ("  — **REFERENCE: do not audit, do not edit**" if l.split(chr(9),1)[1].strip() in ref else "") + "\n"
                for l in lines)
s = (s.replace('{{SHARD_ID}}', sid).replace('{{SHARD_FILES}}', files.rstrip())
      .replace('{{FINDINGS_PATH}}', f'.audit/findings/{sid}.md')
      .replace('{{FIXLOG_PATH}}', f'.audit/findings/{sid}.fix.md')
      .replace('{{REFERENCE_FILES}}', refs))
print(s)
PY
}

RETRY_SLEEP_S="${AUDIT_RETRY_SLEEP_S:-900}"   # wait between retries on limit / rate / connection errors (15 min)
MAX_RETRIES="${AUDIT_MAX_RETRIES:-48}"        # 48 × 15 min = 12 h of waiting at most
TRANSIENT_RE='hit your session limit|usage limit|rate limit|rate_limit|overloaded|529|500 Internal|Connection lost|ECONNRESET|ETIMEDOUT|fetch failed|API Error|resets [0-9]'

run_claude() {  # run_claude <prompt-file> <log> <budget> <allowed-tools>   — retries transient failures
  local prompt="$1" logf="$2" budget="$3" allowed="$4" attempt=0 rc
  local -a args=(-p --output-format text --no-session-persistence --permission-mode acceptEdits
                 --max-budget-usd "$budget"
                 --allowedTools "$allowed"
                 --disallowedTools "Skill,WebFetch,WebSearch")
  [ -n "$MODEL" ] && args+=(--model "$MODEL")
  while :; do
    attempt=$((attempt+1))
    local before; before="$(wc -c < "$logf")"
    # perl alarm = portable timeout on macOS; kills claude's whole process group if it hangs past TIMEOUT_S
    perl -e 'setpgrp(0,0); $SIG{ALRM}=sub{ kill "TERM", -$$; sleep 5; kill "KILL", -$$; exit 142 }; alarm shift @ARGV; system @ARGV; exit $? >> 8' \
         "$TIMEOUT_S" claude "${args[@]}" < "$prompt" >> "$logf" 2>&1; rc=$?
    [ $rc -eq 0 ] && return 0
    if tail -c +"$((before+1))" "$logf" | grep -qiE "$TRANSIENT_RE"; then
      if [ "$attempt" -ge "$MAX_RETRIES" ]; then log "  transient failure persisted for $attempt attempts — giving up"; return $rc; fi
      log "  transient failure (rc=$rc, attempt $attempt/$MAX_RETRIES): $(tail -c +"$((before+1))" "$logf" | grep -iE "$TRANSIENT_RE" | tail -1 | cut -c1-110) — sleeping ${RETRY_SLEEP_S}s"
      sleep "$RETRY_SLEEP_S"; continue
    fi
    return $rc
  done
}

READ_TOOLS='Bash(cat:*),Bash(sed -n:*),Bash(grep:*),Bash(rg:*),Bash(wc:*),Bash(ls:*),Bash(git log:*),Bash(git diff:*),Bash(git status:*)'
FIX_TOOLS="$READ_TOOLS,Bash(npx tsc:*),Bash(npx eslint:*),Bash(python3 .audit/lint-diff.py:*)"

PROTECTED_MD='.audit/design-system.md .audit/vercel-rules.md .audit/PLAN.md'
revert_src() {
  # restore every tracked file except the audit's own scratch output; drop new files under src and the screenshot dir
  git checkout -q -- . ':(exclude).audit/findings' ':(exclude).audit/logs' ':(exclude).audit/visual' 2>/dev/null
  git clean -q -fd src e2e/__screenshots__ 2>/dev/null
}

# ---- shard list ------------------------------------------------------------
if [ -n "$SHARDS" ]; then
  LIST=""; for n in $SHARDS; do LIST="$LIST shard-$(printf '%03d' "$((10#$n))")"; done
else
  LIST="$(ls .audit/shards | grep -E '^shard-[0-9]{3}\.txt$' | sed 's/\.txt$//' | sort | tr '\n' ' ')"
fi
[ -n "$FROM" ] && LIST="$(for s in $LIST; do [ "${s#shard-}" -ge "$((10#$FROM))" ] && echo "$s"; done | tr '\n' ' ')"

if [ "$DRY_RUN" = 0 ] && [ -z "$SHARDS" ] && [ -z "$FROM" ] && [ -z "${AUDIT_CONFIRM_ALL:-}" ]; then
  die "refusing to run ALL shards without AUDIT_CONFIRM_ALL=1 (or pass --shards/--from). Try --dry-run first."
fi
log "=== run start · phase=$PHASE · model=${MODEL:-default} · dry-run=$DRY_RUN · shards: $LIST"
TOTAL=0; OK=0; FAILED=0; SKIPPED=0

for SID in $LIST; do
  SHARD_FILE=".audit/shards/$SID.txt"; [ -f "$SHARD_FILE" ] || { log "$SID: no such shard"; continue; }
  TOTAL=$((TOTAL+1))
  if [ -f ".audit/findings/$SID.done" ] && [ "$PHASE" != "audit" ]; then log "$SID: done marker present — skipping"; SKIPPED=$((SKIPPED+1)); continue; fi
  LOC="$(awk -F'\t' '!/^#/{s+=$1} END{print s}' "$SHARD_FILE")"
  log "--- $SID ($LOC LOC) ---"

  # ---------------- audit ----------------
  if [ "$PHASE" = "audit" ] || [ "$PHASE" = "both" ]; then
    if [ -f ".audit/findings/$SID.md" ] && [ "$PHASE" = "both" ]; then
      log "$SID: findings exist — skipping audit"
    else
      render .audit/prompts/audit.md "$SID" "$SHARD_FILE" > ".audit/logs/$SID.audit.prompt.md"
      if [ "$DRY_RUN" = 1 ]; then log "$SID: [dry-run] audit prompt rendered → .audit/logs/$SID.audit.prompt.md"; else
        : > ".audit/logs/$SID.audit.log"
        run_claude ".audit/logs/$SID.audit.prompt.md" ".audit/logs/$SID.audit.log" "$AUDIT_BUDGET" "$READ_TOOLS"; rc=$?
        # the audit is read-only: anything it changed outside its findings file is reverted
        if ! python3 .audit/check-constraints.py "$SHARD_FILE" > ".audit/logs/$SID.audit.gate.log" 2>&1 || [ -n "$(git status --porcelain -- src index.html tailwind.config.ts e2e $PROTECTED_MD)" ]; then
          log "$SID: audit modified protected/source files — reverting (see .audit/logs/$SID.audit.gate.log)"; revert_src
        fi
        if [ $rc -ne 0 ] || [ ! -s ".audit/findings/$SID.md" ] || ! grep -qE '^FINDINGS: [0-9]+' ".audit/findings/$SID.md"; then
          log "$SID: AUDIT FAILED (rc=$rc, findings file $( [ -s ".audit/findings/$SID.md" ] && echo present || echo missing)) — see .audit/logs/$SID.audit.log"
          echo "audit rc=$rc $(date)" > ".audit/findings/$SID.FAILED"; FAILED=$((FAILED+1)); continue
        fi
        log "$SID: audit ok — $(grep -E '^FINDINGS:' ".audit/findings/$SID.md" | tail -1)"
      fi
    fi
  fi

  # ---------------- fix ----------------
  if [ "$PHASE" = "fix" ] || [ "$PHASE" = "both" ]; then
    if [ "$DRY_RUN" = 1 ]; then render .audit/prompts/fix.md "$SID" "$SHARD_FILE" > ".audit/logs/$SID.fix.prompt.md"; log "$SID: [dry-run] fix prompt rendered → .audit/logs/$SID.fix.prompt.md"; continue; fi
    [ -s ".audit/findings/$SID.md" ] || { log "$SID: no findings file — skipping fix"; continue; }
    if grep -qE '^FINDINGS: 0( |$)' ".audit/findings/$SID.md"; then log "$SID: 0 findings — marking done"; touch ".audit/findings/$SID.done"; OK=$((OK+1)); continue; fi
    render .audit/prompts/fix.md "$SID" "$SHARD_FILE" > ".audit/logs/$SID.fix.prompt.md"
    : > ".audit/logs/$SID.fix.log"; GL=".audit/logs/$SID.gates.log"; : > "$GL"
    # Pre-fix baseline: the app reads live production data, so screenshots drift on their own.
    # Re-baselining right before the fix means the post-fix comparison shows the fix, not the drift.
    { echo "== playwright (pre-fix baseline)"; npx playwright test --update-snapshots --reporter=list; } >> "$GL" 2>&1
    pre_infra="$(grep -cE 'Test timeout of|page\.goto|browserType\.|Timed out waiting|webServer|ERR_CONNECTION_REFUSED|No tests found|EADDRINUSE|strictPort' "$GL" || true)"
    if [ "$pre_infra" != "0" ] || ! grep -qE '[0-9]+ passed' "$GL"; then
      log "$SID: pre-fix baseline failed (infra $pre_infra) — screenshots unavailable, skipping shard (see $GL)"
      cp "$GL" ".audit/findings/$SID.FAILED"; git checkout -q -- e2e/__screenshots__ 2>/dev/null; FAILED=$((FAILED+1)); continue
    fi
    run_claude ".audit/logs/$SID.fix.prompt.md" ".audit/logs/$SID.fix.log" "$FIX_BUDGET" "$FIX_TOOLS"; rc=$?
    log "$SID: fix run rc=$rc — $(grep -E '^APPLIED:' ".audit/findings/$SID.fix.md" 2>/dev/null | tail -1)"
    if [ $rc -ne 0 ] || [ ! -s ".audit/findings/$SID.fix.md" ] || ! grep -qE '^APPLIED: [0-9]+' ".audit/findings/$SID.fix.md"; then
      log "$SID: FIX FAILED (rc=$rc, fix log $( [ -s ".audit/findings/$SID.fix.md" ] && echo present || echo missing/incomplete)) — reverting"
      echo "fix rc=$rc $(date)" > ".audit/findings/$SID.FAILED"; revert_src; FAILED=$((FAILED+1)); continue
    fi
    if [ -z "$(git status --porcelain -- src)" ]; then
      log "$SID: fix applied nothing (see fix log) — marking done"; touch ".audit/findings/$SID.done"; OK=$((OK+1)); continue
    fi
    pass=1
    { echo "== constraints"; python3 .audit/check-constraints.py "$SHARD_FILE"; } >> "$GL" 2>&1 || pass=0
    { echo "== tsc"; npx tsc --noEmit; } >> "$GL" 2>&1 || pass=0
    { echo "== lint-diff"; python3 .audit/lint-diff.py; } >> "$GL" 2>&1 || pass=0
    if [ $pass = 1 ]; then { echo "== build"; npm run build; } >> "$GL" 2>&1 || pass=0; fi
    if [ $pass = 1 ]; then
      # The change detector runs its own Vite on localhost:5173 (playwright.config.ts) and never
      # reuses a server. If something else already answers there, screenshots would capture a
      # stranger — treat it as an infrastructure failure rather than re-baselining garbage.
      if lsof -nP -iTCP:5173 -sTCP:LISTEN >/dev/null 2>&1 && ! curl -s -m 5 http://localhost:5173/ | grep -q 'src/app/main.tsx'; then
        pid="$(lsof -nP -iTCP:5173 -sTCP:LISTEN -t | head -1)"
        log "$SID: port 5173 is held by a non-app process (pid $pid: $(ps -p "$pid" -o comm= 2>/dev/null)) — gates cannot run"; echo "== playwright: port 5173 held by foreign process $pid" >> "$GL"; pass=0
      fi
      [ $pass = 1 ] && \
      { echo "== playwright (recording)"; npx playwright test --reporter=list; } >> "$GL" 2>&1
      changed="$(grep -cE '^[[:space:]]+✘' "$GL" || true)"
      infra="$(grep -cE 'Test timeout of|page\.goto|browserType\.|Timed out waiting|webServer|ERR_CONNECTION_REFUSED|No tests found' "$GL" || true)"
      broken="$(grep -oE 'ratio 0\.[5-9][0-9]* of all image pixels|ratio 1 of all image pixels' "$GL" | wc -l | tr -d ' ')"
      if [ "$infra" != "0" ] || [ "$broken" != "0" ] || [ "$changed" -gt "${AUDIT_MAX_CHANGED_ROUTES:-12}" ]; then
        log "$SID: playwright infra failure ($infra), routes changed >50% ($broken — a crash, not a fix) or too many routes changed ($changed) — not re-baselining"; pass=0
      elif [ "$changed" != "0" ]; then
        mkdir -p ".audit/visual/$SID"
        find e2e/test-results -name '*-diff.png' -exec cp {} ".audit/visual/$SID/" \; 2>/dev/null
        find e2e/test-results -name '*-actual.png' -exec cp {} ".audit/visual/$SID/" \; 2>/dev/null
        { echo "== playwright (re-baseline $changed changed routes)"; npx playwright test --update-snapshots --reporter=list; } >> "$GL" 2>&1
      fi
      [ $pass = 1 ] && log "$SID: gates ok — $changed route screenshot(s) changed (diffs in .audit/visual/$SID)"
    fi
    if [ $pass = 1 ]; then
      if [ "$COMMIT" = 1 ]; then
        applied="$(grep -oE 'APPLIED: [0-9]+' ".audit/findings/$SID.fix.md" 2>/dev/null | head -1)"
        git add -A src e2e/__screenshots__ ".audit/findings/$SID.md" ".audit/findings/$SID.fix.md" >/dev/null 2>&1
        git commit -q -m "audit($SID): apply coherence findings — ${applied:-see fix log}" \
          -m "Findings: .audit/findings/$SID.md · Fix log: .audit/findings/$SID.fix.md · Gates: constraints, tsc, lint-diff, build, screenshots re-baselined." \
          && log "$SID: committed $(git rev-parse --short HEAD)" || { log "$SID: COMMIT FAILED"; pass=0; }
      fi
    fi
    if [ $pass = 1 ]; then touch ".audit/findings/$SID.done"; OK=$((OK+1))
    else
      log "$SID: GATES FAILED — reverting shard (see $GL)"; cp "$GL" ".audit/findings/$SID.FAILED"; revert_src; FAILED=$((FAILED+1))
    fi
  fi
done

log "=== run end · shards=$TOTAL ok=$OK failed=$FAILED skipped=$SKIPPED"
if [ "${AUDIT_PUSH:-0}" = 1 ] && [ "$DRY_RUN" = 0 ] && [ "$COMMIT" = 1 ]; then
  git push -u origin "$BRANCH_EXPECTED" >> .audit/logs/run.log 2>&1 && log "pushed $BRANCH_EXPECTED to origin" || log "PUSH FAILED (see run.log)"
fi
{
  echo "# Run summary — $(date)"; echo; echo "| Shard | Findings | Applied | Status |"; echo "|---|---|---|---|"
  for f in .audit/shards/shard-*.txt; do s="$(basename "$f" .txt)"
    fd="$(grep -oE '^FINDINGS: [0-9]+' ".audit/findings/$s.md" 2>/dev/null | head -1 | cut -d' ' -f2)"
    ap="$(grep -oE '^APPLIED: [0-9]+' ".audit/findings/$s.fix.md" 2>/dev/null | head -1 | cut -d' ' -f2)"
    st="pending"; [ -f ".audit/findings/$s.done" ] && st="done"; [ -f ".audit/findings/$s.FAILED" ] && st="FAILED"
    echo "| $s | ${fd:--} | ${ap:--} | $st |"; done
} > .audit/run-summary.md
exit $(( FAILED > 0 ? 1 : 0 ))
